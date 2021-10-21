
config = {
    worker_id:          process.env.WORKER_ID || require("os").hostname(),
    roomname:           process.env.WS_ROOM || 'default',
    ws_path:            (process.env.HTTP_PATH || "").replace(/\/$/g, '') + '/socket.io',
    ws_namespace:       process.env.WS_NAMESPACE || '/',
    ws_host:            process.env.WS_HOST || 'http://localhost:3000',
    obs_address:        process.env.OBS_ADDRESS || 'localhost:4444',
    obs_password:       process.env.OBS_PASSWORD,
    screenshot_format:  process.env.SCREENSHOTF || 'jpg',
    screenshot_width:   parseInt(process.env.SCREENSHOTW || 200),
    screenshot_quality: parseInt(process.env.SCREENSHOTQ || 75),
}

const io = require('socket.io-client')
const OBSWebSocket = require('obs-websocket-js');


const control = io(config.ws_host + config.ws_namespace, {path: config.ws_path});
const obs = new OBSWebSocket();
var media_playing = [];
var current_preview = null;

const EventEmitter = require('events');
const WsCommand = new EventEmitter();

const sendUpdate = async function(event) {
    if ( obs._connected != true) {
        return send_room({
            'id': config.worker_id,
            'status': 'connection_error',
        }, 'obs');
    }
    const [stats, scene_list, preview_scene, streaming_stats, media] = await Promise.all([
        obs.send('GetStats'),
        obs.send('GetSceneList'),
        obs.send('GetPreviewScene').catch(err => { return {}; }),
        obs.send('GetStreamingStatus'),
        getMediaPlaying(),
    ]);
    current_preview = preview_scene.name || null;
    const screenshot = await getSouceScreenshot(preview_scene.name);
    return send_room({
        'id': config.worker_id,
        'scenes': scene_list.scenes.map(scene => scene.name),
        'currentScene': scene_list.currentScene,
        'previewScene': preview_scene.name || null,
        'previewScreenshot': screenshot || '',
        'recording': streaming_stats.recording,
        'streaming': streaming_stats.streaming,
        'status': stats.status,
        'media': media,
        'stats': {
            'cpu-usage': stats.stats['cpu-usage'],
            'memory-usage': stats.stats['memory-usage'],
            'free-disk-space': stats.stats['free-disk-space'],
            'render-missed-frames': stats.stats['render-missed-frames'],
        },
    }, 'obs');
};

const sendMediaUpdate = async function(event) {
    if ( obs._connected != true) { return; }
    if ( media_playing.length > 0 ) {
        const media = await getMediaPlaying();
        return send_room({
            'id': config.worker_id,
            'media': media,
        }, 'obs-media');
    }
}

const sendScreenshot = async function(scene) {
    const screenshot = await getSouceScreenshot(scene);
    return send_room({
        'id': config.worker_id,
        'previewScreenshot': screenshot,
    }, 'obs-preview');
}

const getMediaPlaying = async function(event) {
    var sources = [];
    for (var source of media_playing) {
        const [duration, time] = await Promise.all([
            obs.send('GetMediaDuration', { 'sourceName': source}),
            obs.send('GetMediaTime', { 'sourceName': source}),
        ]);
        sources.push({ source: source, duration: duration.mediaDuration / 1000, time: time.timestamp / 1000 });
    }
    return sources;
}
const getSouceScreenshot = async function(scene) {
    const screenshot = await obs.send('TakeSourceScreenshot', {
        'sourceName': scene,
        'embedPictureFormat': config.screenshot_format,
        'compressionQuality': config.screenshot_quality,
        'width':  config.screenshot_width,
        'height': Math.floor(config.screenshot_width * 9/16),
    }).catch(err => { return ''; } )
    return screenshot.img;
}

const obsConnect = function(){
    obs.connect({ address: config.obs_address, password: config.obs_password })
        .catch(err => {
            console.log('obs: Error Connecting:', err.error);
        });
}


// event functions

const media_playing_add = function(data){
    console.log(`obs: ${data.updateType}: '${data.sourceName}'`);
    if (media_playing.indexOf(data.sourceName) == -1) {
        media_playing.push(data.sourceName);
    }
    sendUpdate();
}
const media_playing_del = function(data){
    console.log(`obs: ${data.updateType}: '${data.sourceName}'`);
    if (media_playing.indexOf(data.sourceName) != -1) {
        media_playing.splice(media_playing.indexOf(data.sourceName), 1);
    }
    sendUpdate();
}

const updateMedia = async function(){
    const mediasources = await obs.send('GetMediaSourcesList')
        .then( d => { return d.mediaSources || []; })
        .catch(err => { return []; });
    for (source of mediasources){
        if (source.mediaState == 'playing' || source.mediaState == 'paused') {
            if (media_playing.indexOf(source.sourceName) == -1) {
                media_playing.push(source.sourceName);
            }
        }
    }
}
/**
 * OBS Events
 */


obs.on('ConnectionOpened', () => {
    console.log('obs: connected.');
    media_playing = [];
    updateMedia();
    sendUpdate();
});

obs.on('ConnectionClosed', () => {
    console.error('OBS disconnected.');
    sendUpdate();
    setTimeout(() => {
        obsConnect();
    }, 1000);
});
obs.on('error', err => {
    console.error('socket error:', err);
});

obs.on('SwitchScenes', data => {
    console.log(`obs: switched scene to '${data.sceneName}'`);
    var source_names = data.sources.map(source => source.name);
    media_playing = media_playing.filter(source => source_names.indexOf(source) != -1);
    sendUpdate();
});

obs.on('PreviewSceneChanged', data => {
    console.log(`obs: switched preview to '${data.sceneName}'`);
    current_preview = data.sceneName;
    sendUpdate();
});

// player controls
obs.on('MediaPlaying', data => media_playing_add(data));
obs.on('MediaStopped', data => media_playing_del(data));
// media events
obs.on('MediaStarted', data => media_playing_add(data));
obs.on('MediaEnded', data => media_playing_del(data)); // fires only on playlist end


obsConnect()
setInterval(() => {
    sendUpdate();
}, 5000);
setInterval(() => {
    sendMediaUpdate();
}, 1000);
/**
 * Socket.io Events
 */

control.on('connect', function(){
    console.log('ws: connect');
    control.emit('register', {type: 'worker', room: config.roomname, id: config.worker_id});
});
control.on('register', function(){
    console.log('ws: registered!');
});
control.on('disconnect', function(){
    console.log('ws: disconnect');
});
control.on('room', function(data){
    if (data.command && data.command in WsCommand._events) {
        if (data.id && data.id != config.worker_id )
            return
        WsCommand.emit(data.command, data.command, data.data);
    } else {
        if ( !data.id || data.id == config.worker_id )
            console.log('ws: unknown room message:', data);
    }
});


function send_room(data, type=null) {
    control.emit('room', {'type': type, 'source': config.worker_id, 'data': data})
}

/*
 * WebSocket Commands
 */

WsCommand.on('discover', function(event, data) {
    console.log('ws: answering discover.');
    sendUpdate();
    console.log(config);
});

WsCommand.on('send', function(event, data) {
    console.log('ws: received command:', data.command, data.args);
    obs.send(data.command, data.args);
});
