$(document).ready(function() {
    $.getJSON( "config.json", function( streamui_config ) {

        if (streamui_config.jitsi_url != '' && streamui_config.jitsi_multiview) {
            loadScript(`${streamui_config.jitsi_url}/external_api.js`, function() { jitsiMultiview(streamui_config); });
        }
        if (location.hash == '') {
            if (streamui_config.default_control_room){
                // use default random control room ID
                location.hash = "#control=" + streamui_config.default_control_room;
            } else {
                // generate random control room ID
                location.hash = "#control=" + Math.random().toString(16).substr(2, 8);
            }
        }
        var parameters = location.hash.replace('#', '').split('&').reduce((prev, item) => {
            var kv = item.split('='); return Object.assign({[kv[0]]: kv[1]}, prev); }, {});


        var socket = io(streamui_config.namespace, {path: streamui_config.path});

        socket.on('connect', function() {
            socket.emit('register', {type: 'user', room: parameters.control});
        });

        window.regie = new Vue({
            el: '#regie-container',
            data: {
                remote_control: false,
                jitsi_participants: null,
                config: streamui_config,
                JitsiClients: {},
                atem: {
                    inputs: {
                        '1': { id: 1, longName: "HDMI1"},
                        '2': { id: 2, longName: "HDMI2"},
                        '3': { id: 3, longName: "HDMI3"},
                        '4': { id: 4, longName: "HDMI4"},
                        '5': { id: 5, longName: "SDI1"},
                        '6': { id: 6, longName: "SDI2"},
                        '7': { id: 7, longName: "SDI3"},
                        '8': { id: 8, longName: "SDI4"},
                        '2000': { id: 2000, longName: "MP1"},
                        '2001': { id: 2001, longName: "MP2"},
                    },
                    state: { program: 5, preview: 1, inTransition: false},
                    audio: {
                        master: {gain: 0 },
                        channels: {
                            '1': { id: 1, state: 'on', gain: 0, type: 'HDMI'},
                            '2': { id: 2, state: 'afv', gain: 0, type: 'HDMI'},
                            '3': { id: 3, state: 'off', gain: 0, type: 'HDMI'},
                            '4': { id: 4, state: 'off', gain: 0, type: 'HDMI'},
                            '5': { id: 5, state: 'afv', gain: 0, type: 'SDI'},
                            '6': { id: 6, state: 'off', gain: 0, type: 'SDI'},
                            '7': { id: 7, state: 'off', gain: 0, type: 'SDI'},
                            '8': { id: 8, state: 'off', gain: 0, type: 'SDI'},
                            '1001': { id: 1001, state: 'on', gain: 0, type: 'XLR'},
                        },
                    },
                },
                jitsi: {},
                obs: {},
            },
            computed: {
                jitsi_sorted: function () {
                    return Object.values(this.jitsi).sort(function (a, b) {
                        return (a.id).localeCompare(b.id);
                    });
                }
            },
            watch: {},
            methods: {
                controlEvent: function(id, eventname, data) {
                    if(this.remote_control == true) {
                    console.log('main controlEvent', id, eventname, data);
                    socket.emit('room', {command: eventname, id: id, data: data});
                    } else {
                    alert("control not enabled.");
                    }
                },
                copyPlayerLink: function() {
                  var url = location.origin + location.pathname + "player.html#control="+parameters.control;
                  var el = $("<input>");
                  $("body").append(el);
                  el.val(url).select();
                  document.execCommand("copy");
                  el.remove();
                }
            }
        })

        socket.on('room', function(msg, cb) {
            if (cb) cb();
            if ( ! msg.type )
                return;
            switch (msg.type) {
                case 'jitsi':
                    Vue.set(regie.jitsi, msg.source, msg.data);
                    break;
                case 'atem':
                    Vue.set(regie, 'atem', msg.data);
                    break;
                case 'obs':
                    Vue.set(regie.obs, msg.source, msg.data);
                    break;
                case 'obs-media':
                    Vue.set(regie.obs[msg.source], 'media', msg.data.media);
                    break;
                case 'obs-preview':
                    Vue.set(regie.obs[msg.source], 'previewScreenshot', msg.data.previewScreenshot);
                    break;
                case 'disconnect':
                      Vue.delete(regie.jitsi, msg.source);
                    break;
            }
            console.log('Received room message: ', msg);
        });

        socket.on('register', function(status, cb) {
            console.log('registered status:' + status);
            socket.emit('room', {command: 'discover'});
            if (cb) cb();
        });

    });
});

function jitsiMultiview(config) {
  const options = {
    roomName: config.jitsi_multiview,
    userInfo: {
    },
    parentNode: document.querySelector('#video-multiview'),
    configOverwrite: {
      startWithAudioMuted: true,
      startWithVideoMuted: true,
      prejoinPageEnabled: true,
    },
    interfaceConfigOverwrite: {
      VERTICAL_FILMSTRIP: true,
      filmStripOnly: false,
      MAXIMUM_ZOOMING_COEFFICIENT: 1,
      DISABLE_VIDEO_BACKGROUND: true,
    }
  };
  const JitsiApi = new JitsiMeetExternalAPI(`${config.jitsi_url.replace(/^.+:\/\//, '')}`, options);

  JitsiApi.on('passwordRequired', function (){
    JitsiApi.executeCommand('password', config.jitsi_multiview_pass);
  });
}
