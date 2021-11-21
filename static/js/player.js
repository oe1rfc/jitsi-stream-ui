
/* URL hash parameters:
 *
 * control          - control room name (required)
 * xmpp_id          - jitsi xmpp login
 * xmpp_password    - jitsi xmpp password
 * displayName      - jitsi displayName
 * 
 */

/*
 * global config object form jitsi /config.js
 * global streamui_config from ./config.js
 */

/*
 * jitsi options:
 *  - displaymode: {'fullscreen', 'tiles'}
 *  - fullscreenparticipant: id
 *  - displayName: stream display name
 * 
 * participant options:
 *  - visible (bool)
 *  - frame (bool)
 *  - name_override (string | null)
 *  - fullscreen (bool)
 *  - picture_url (string | null)
 *  - video_muted (bool)
 *  - audio_muted (bool)
 *  - audio_volume (number, 0.0 (silent) to 1.0 (loudest))
 */


Vue.component('participant', {
    props: {
        id: String,
        order: Number,
        participant: Object,    // holds the jitsi participant object
        tracks: Object,
        muted: Object,          // jitsi track status
    },
    data: function() {
        return {
            dominant_speaker: false,
            active: false,        // if tracks should be requested
            options: {
                visible: false,     // TESTING
                frame: false,
                name_override: null,
                fullscreen: false,
                picture_url: null,
                video_muted: false,
                audio_muted: true, // TESTING
                audio_volume: -6,   // volume attenuation in decibels ( <= 0 )
            },
        }
    },
    created: function () {
        console.warn("participant component created", this);
        this.active = this.options.visible;
        this.attachTracks();
        this.$parent.participant_created(this.id, this);
    },
    beforeDestroy: function () {
        // detach tracks
        for (var track of this.participant.getTracks()) {
            this.cleanupTracks(track);
        }
        this.$parent.participant_destroyed(this.id);
    },
    methods: {
        cleanupTracks: function(track) {
            track.detach();
        },
        updateOptions: function(options) {
            console.warn("update participant Options:", options);
            for(var option in options) {
                this.$set(this.options, option, options[option]);
            }
        },
        setFullscreen: function(value) {
            if ( value == true ) {
                this.$set(this.options, 'visible', value);
            }
            this.$set(this.options, 'fullscreen', value);
        },
        attachTracks: function() {
            console.warn(`attachTracks ${this.id}`);
            // attach all tracks to their elements
                this.$nextTick(function () {
                    for (var track of this.participant.getTracks()) {
                        var e = $(`#${track.getTrackId()}`)[0];
                        if (track.containers.indexOf(e) < 0) {
                            track.attach(e);
                        }
                    }
                    this.updateAudio();
                });
        },
        updateAudio: function() {
            for (var n in this.tracks) {
                if (this.tracks[n].getType() == 'audio'){
                    console.warn('volume:', this.options.audio_volume, Math.pow(10, this.options.audio_volume/20) );
                    var e = $(`#${this.tracks[n].getTrackId()}`)[0];
                    if(this.options.audio_muted) {
                        e.volume = 0;
                    } else {
                        e.volume = Math.pow(10, this.options.audio_volume/20);
                    }
                }
            }
        },
        participant_info: function() {
            var tracks=[]
            for (var t of this.participant.getTracks()) {
                var videoType = null;
                var volume = null;
                if(t.type == 'video'){
                    videoType = t.videoType || 'camera';
                }
                tracks.push({
                    audioLevel:   t.audioLevel,
                    muted:        t.muted,
                    type:         t.type,
                    videoType:    videoType,
                });
            }
            return {
                id:             this.id,
                tracks:         tracks,
                order:          this.order,
                botType:        this.participant._botType,
                connection:     this.participant._connectionStatus,
                hidden:         this.participant._hidden,
                role:           this.participant._role,
                displayName:    this.participant._displayName,
                status:         this.participant._status,
                options:        this.options,
                dominant_speaker: this.dominant_speaker,
            }
        },
    },
    watch: {
        'tracks': function(val, oldVal) {
            var newkeys = Object.keys(val);
            var oldkeys = Object.keys(oldVal);
            console.warn(`track watch changed: ${oldkeys.length} => ${newkeys.length}`);
        },
        'options.visible': function(visible) {
            if (visible == true && this.active == false)
                this.active = true;
            // reset fullscreen
            if (visible == false && this.options.fullscreen == true)
                this.options.fullscreen = false;
        },
        'options.fullscreen': function(val, oldVal) {},
        'options.audio_muted': function(muted, oldVal) {
            if (muted == false && this.active == false)
                this.active = true;
            this.updateAudio();
        },
        'options.audio_volume': function(val, oldVal) {
            this.updateAudio();
        },
        tracks: function(val) {
            this.attachTracks();
        },
        active: function(val) {
            this.$parent.jitsiUpdateReceiverConstraints();
        },
    },
    computed: {
        jitsi_hidden: function() { // hidden domain in jitsi
            return this.participant._hidden;
        },
        ui_video_running: function() {
            return this.muted.video != true;
        },
        ui_dominant_speaker: function() {
            return this.dominant_speaker;
        },
        ui_visible: function() {
            return this.options.visible && (! this.jitsi_hidden);
        },
        ui_frame: function() {
            return this.options.frame;
        },
        ui_display_name: function() {
            return this.options.name_override || this.participant.getDisplayName();
        },
        ui_fullscreen: function() {
            return this.options.fullscreen;
        },
    },
    updated: function () {
        return;
        this.$nextTick(function () {
            // attach all tracks to their elements
            for (var n in this.tracks) {
                var e = $(`#${this.tracks[n].getTrackId()}`)[0];
                this.tracks[n].attach(e);
                 if (this.tracks[n].getType() == 'audio')
                    e.volume = this.options.volume;
            }
        })
    },
  template: `
        <div class="column participant" :id="id" v-show="ui_visible" v-bind:class="{ 'tiled': ui_visible && !ui_fullscreen, 'fullscreen': ui_fullscreen, 'active': ui_dominant_speaker, 'frame': ui_frame }">
            <div class="video-container">
                <template v-for="track in tracks">
                    <video v-if="track.getType() == 'video'" autoplay='1' :id="track.getTrackId()" v-show="ui_video_running" />
                    <audio v-if="track.getType() == 'audio'" autoplay='1' :id="track.getTrackId()" />
                </template>
            <div>
            <h2 v-if="ui_frame" >{{ ui_display_name }}</h2>
        </div>
  `
});

var JitsiUI = new Vue({
    el: '#streamui-container',
    data: {
        displayName: "Stream Display",
        backgroundImage: null,
        jisti_participants: {},  // jitsi objects
        container_classes: [],
        participants: {},   // vue components
        display_options: {
            fullscreen: false,
            fullscreen_follow: true,
            auto_add: false, // set new participants automatically visible/active
        },
        fullscreen_speaker: null,
        fullscreen_auto: false,
        jitsi: null,
        room: null,
        status: null,
        order_count: 0,
        connect_options: { // JS Object with id and password properties.
            id: null,
            password: null,
        },
    },
    computed: {
        participants_sorted: function () {
            return Object.values(this.jisti_participants).sort(function (a, b) {
                return a.order - b.order;
            });
        }
    },
    created: function () {
    },
    watch: {
        displayName: function(val) {
            if (this.room) this.room.setDisplayName(val);
        },
        'display_options.fullscreen': function(fullscreen, oldval) {
            if ( fullscreen == false )
                this.setParticipantFullscreen(null);
        },
        backgroundImage: function(val) {
            if (val) {
                document.body.style.backgroundImage = `url('${val}')`;
            } else {
                document.body.style.backgroundImage = "";
            }
        },
    },
    methods: {
        connect: function() {
            JitsiMeetJS.init(config);
            JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.WARNING);
            this.jitsi = new JitsiMeetJS.JitsiConnection("app-stream-ui", null, config);
            this.jitsi.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, this.jitsiConnected);
            this.jitsi.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, this.jitsiConfailed);
            this.jitsi.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, this.jitsiDisconnected);
            // PASSWORD_REQUIRED
            // CONNECTION_DROPPED_ERROR
            if (this.jitsi.xmpp.connection.connected != true)
                this.jitsi.connect(this.connect_options); // connect(options) - JS Object with id and password properties.
        },
        participant_created: function(id, component) {
            console.warn('participant_created', id);
            this.$set(this.participants, id, component);
            if ( this.display_options.auto_add == true) {
                this.updateParticipantOptions(id, {
                    visible: true,
                    audio_muted: false,
                });
            }
        },
        participant_destroyed: function(id) {
            console.warn('participant_destroyed', id);
            Vue.delete( this.participants, id );
            this._updateContainerClasses();
        },
        xmpp_auth: function(id, password) {
            this.connect_options.id = id;
            this.connect_options.password = password;
        },
        retry_connection: function() {
            // reconnect after 2 secs
            var self = this;
            setTimeout(function(){ self.connect(); }, 2000);
        },
        jitsiConnected: function(e) {
            console.warn('jitsi connected', e, this);
            this.status = 'CONNECTION_ESTABLISHED';
        },
        jitsiConfailed: function(e) {
            console.warn('jitsi connection faliled', e, this);
            this.status = 'CONNECTION_FAILED';
            this.retry_connection();
        },
        jitsiDisconnected: function(e) {
            console.warn('jitsi disconnected', e, this);
            this.status = 'CONNECTION_DISCONNECTED';
            this.retry_connection();
        },
        jitsiConferenceJoined: function(e) {
            this.room.setDisplayName(this.displayName);
            console.warn('jitsi conference joined', e, this);
            this.status = 'joined';
        },
        jitsiUserJoined: function(id) {
            var participant = this.room.getParticipantById(id);
            if (participant.isHidden()) {
                console.warn('ignoring hidden user', id);
            }
            console.warn('user joined', id, this);
            this.$set(this.jisti_participants, id, {
                id: id,
                order: this.order_count++,
                participant: participant,
                muted: { video: null, audio: null },
                tracks: {}
            });
        },
        jitsiUserLeft: function(id) {
            console.warn('jitsiUserLeft', id);
            if (id in this.participants) {
                p = this.participants[id];
                if (p.options.visible && p.options.fullscreen) {
                    this.setParticipantFullscreen(null);
                }
            }
            if (id in this.jisti_participants) {
                Vue.delete(this.jisti_participants, id );
            }
        },
        jitsiTrackAdded: function(track) {
            console.warn('track added', track, this);
            if (track.isLocal()) { return; }
            var pid = track.getParticipantId();
            if (pid in this.jisti_participants) {
                this.$set(this.jisti_participants[pid].tracks, track.getId(), track);
                this.jitsiParticipantUpdateMuted(pid);
            }
        },
        jitsiTrackRemoved: function(track) {
            console.warn('track removed', track, this);
            if (track.isLocal()) { return; }
            var pid = track.getParticipantId();
            if (pid in this.participants) {
                this.participants[pid].cleanupTracks(track);
                Vue.delete(this.jisti_participants[pid].tracks, track.getId() );
                this.jitsiParticipantUpdateMuted(pid);
            }
        },
        jitsiTrackMuteChanged: function(track) {
            console.warn(`track muted: ${track.getType()} - ${track.isMuted()}`);
            if (track.isLocal()) { return; }
            this.jitsiParticipantUpdateMuted(track.getParticipantId());
        },
        jitsiParticipantUpdateMuted: function(pid) {
            var muted = { video: null, audio: null };
            if (pid in this.jisti_participants) {
                for (var n in this.jisti_participants[pid].tracks) {
                    var track = this.jisti_participants[pid].tracks[n];
                    if (muted[track.getType()] != true) {
                        muted[track.getType()] = track.isMuted();
                    }
                }
                this.jisti_participants[pid].muted = muted;
            }
        },
        jitsiDominantSpeakerChanged: function(id, previousSpeakers) {
            console.warn("DOMINANT_SPEAKER_CHANGED: ", id, previousSpeakers);
            var participant = null;
            if (id in this.participants) {
                participant = this.participants[id];
                participant.dominant_speaker = true;
            }
            for (var pid of previousSpeakers) {
                if (pid in this.participants) {
                    this.participants[pid].dominant_speaker = false;
                }
            }
            // set fullscreen on participant if automatic switching is enabled
            if (participant && participant.options.visible &&
                this.display_options.fullscreen &&
                this.display_options.fullscreen_follow ) {
                this.setParticipantFullscreen(id);
            }
        },
        join: function(roomname, password = null) {
            if ( this.room ) { this.leave(); }
            roomname = roomname.toLowerCase(); // rooms are always lowercase
            this.room = this.jitsi.initJitsiConference(roomname, config); 
            this.room.on(JitsiMeetJS.events.conference.TRACK_ADDED, this.jitsiTrackAdded);
            this.room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, this.jitsiTrackRemoved);
            this.room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, this.jitsiConferenceJoined);
            /* interesting events:
             * conference.<>
             * CONFERENCE_LEFT (no parameters)
             * CONFERENCE_FAILED (parameters - errorCode(JitsiMeetJS.errors.conference))
             * CONFERENCE_ERROR (parameters - errorCode(JitsiMeetJS.errors.conference))
             * KICKED  (parameters - actorParticipant(JitsiParticipant), reason(string))
             * USER_STATUS_CHANGED - notifies that status of some user changed. (parameters - id(string), status(string))
             * MESSAGE_RECEIVED - new text message received. (parameters - id(string), text(string), ts(number))
             * DOMINANT_SPEAKER_CHANGED - the dominant speaker is changed. (parameters - id(string), previousSpeakers(Array))
             * PARTICIPANT_PROPERTY_CHANGED - notifies that user has changed his custom participant property. (parameters - user(JitsiParticipant), propertyKey(string), oldPropertyValue(string), propertyValue(string))
             * connectionQuality.<>
             * LOCAL_STATS_UPDATED - New local connection statistics are received. (parameters - stats(object))
             * REMOTE_STATS_UPDATED - New remote connection statistics are received. (parameters - id(string), stats(object))
            */
            this.room.on(JitsiMeetJS.events.conference.USER_JOINED, this.jitsiUserJoined);
            this.room.on(JitsiMeetJS.events.conference.USER_LEFT, this.jitsiUserLeft);
            this.room.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, this.jitsiTrackMuteChanged);
            this.room.on(JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED, this.jitsiDominantSpeakerChanged);
            // this.room.on(JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED,
            //    (userID, audioLevel) => console.warn(`AudioLevel: ${userID} - ${audioLevel}`));
            this.room.join(password);
            this.room.setReceiverVideoConstraint(1080);
        },
        leave: function() {
            this.room.leave();
            this.room = null;
            this.status = 'left';
        },
        sendRoomMessage: function(text) {
            this.room.sendTextMessage(text);
        },
        getParticipants: function() {
            var participants_info=[];
            for (var pid in this.participants) {
                if(this.participants[pid])
                    participants_info.push( this.participants[pid].participant_info() );
            };
            return participants_info;
        },
        jitsiUpdateReceiverConstraints: function() {
            /* Update VideoBridge with desired track IDs and resolutions
             * https://github.com/jitsi/jitsi-videobridge/blob/master/doc/allocation.md#new-message-format
             */
            var endpoint_ids = [];
            var endpoint_constraints = {};
            for (var pid in this.jisti_participants) {
                var p = this.participants[pid];
                if( p && p.active ) {
                    endpoint_ids.push(pid);
                    endpoint_constraints[pid] = { 'maxHeight':  1080 }
                }
            }
            var videoConstraints = {
                lastN: -1,                                  // max. number of videos requested from the bridge.
                selectedEndpoints: [],                      // The endpoints ids of the participants that are prioritized first.
                onStageEndpoints: endpoint_ids,             // The endpoint ids of the participants that are prioritized up to a higher resolution.
                defaultConstraints: { 'maxHeight': 0 },     // disable all other endpoints
                constraints: endpoint_constraints
            }
            console.warn("setReceiverConstraints:", videoConstraints);
            this.room.setReceiverConstraints(videoConstraints);
        },
        setParticipantOrders: function(orders) {
            // get a dict of participant ids with their order number.
            for (var pid in orders) {
                this.$set(this.jisti_participants[pid].order, orders[pid]);
            }
        },
        updateDisplayOptions: function(options) {
            console.warn("update display options:", options);
            for(var option in options) {
                this.$set(this.display_options, option, options[option]);
            }
        },
        updateParticipantOptions: function(id, options) {
            this.participants[id].updateOptions(options);
            this._updateContainerClasses();
        },
        _updateContainerClasses: function() {
            var classes = [];
            var nvisible = 0;
            var fullscreen = false;
            for (var p in this.participants) {
                p = this.participants[p];
                if(p.ui_visible) {
                    nvisible+=1;
                }
                if(p.options.fullscreen == true) {
                    fullscreen = true;
                }
            }
            classes.push("elements_n"+nvisible);
            if (fullscreen == true) {
                classes.push("fullscreen-only");
            }
            this.container_classes = classes;
            return nvisible;
        },
        setParticipantFullscreen: function(id) {
            for (var p of Object.values(this.participants)) {
                p.setFullscreen(p.id == id);
            }
            this.display_options.fullscreen = ( id == null) ? false : true;
            this._updateContainerClasses();
        },
        setDisplayName: function(name) {
            this.displayName = name;
        }
    }
});

class StreamUI {
    _commands = {};
    control_room = null;
    worker_id = null;
    jitsi = null;
    socket = null;
    parameters = {};
    config = {};

    constructor(jitsi, streamui_config) {
        this.jitsi = jitsi;
        this.config = streamui_config;

        this.url_parameters_parse();
        if( ! this.parameters.control ) { this.parameters.control = this.config.default_control_room; }
        this.url_parameters_update();

        this.worker_id = this.parameters.id;
        this.control_room = this.parameters.control || this.config.default_control_room;
        if( ! this.control_room) {
            alert("warning: 'control' room parameter not set in url, can not proceed");
            return false;
        }

        if ( this.parameters.displayName ) {
            this.jitsi.displayName = this.parameters.displayName;
        } else {
            this.jitsi.displayName = `${this.jitsi.displayName} ${this.worker_id}`;
        }
        if ( this.parameters.backgroundImage ) {
            this.jitsi.backgroundImage = this.parameters.backgroundImage;
        }
        this.jitsi.xmpp_auth(
            this.parameters.xmpp_id || this.config.xmpp_id,
            this.parameters.xmpp_password || this.config.xmpp_password
        );
        if ( this.parameters.css ) {
            $('head').append(`<link rel="stylesheet" type="text/css" href="${this.parameters.css}">`);
        }
        this.jitsi.connect();
        this.init_socketio();
    }

    url_parameters_parse() {
        // parse hash location parameters
        if ( location.hash != '' ) {
            this.parameters = location.hash.replace('#', '').split('&').reduce((prev, item) => {
                var kv = item.split('='); return Object.assign({[kv[0]]: decodeURIComponent(kv[1])}, prev); }, {});
        }

        if( ! this.parameters.id) {
            // generate random client ID
            this.parameters.id = Math.random().toString(16).substr(2, 8);
        }
    }
    url_parameters_update() {
        var p = this.parameters;
        location.hash = "#" + Object.keys(p).map( function(k){ return k+"="+p[k] }).join("&");
    }

    init_socketio() {
        var self = this;
        this.socket = io(this.config.namespace, {path: this.config.path});
        this.socket.on('connect', function() {
            self.socket.emit('register', {type: 'worker', room: self.control_room, id: self.worker_id});
        });
        this.socket.on('register', function(status, cb) {
            console.warn('registered status:' + status);
            window.setInterval(function(){self.send_update()}, 1000);
            if (cb) cb();
        });
        this.socket.on('room', function(data) {
            console.info("command:", data );
            if (    data && 'command' in data &&
                    data['command'] in self._commands &&
                    self._commands[data['command']]
                ) {
                if ('id' in data && data['id'] != self.worker_id) {
                    console.info("command not for us:", data );
                    return;
                }
                console.info("command:", data['command'], data );
                self._commands[data['command']](data.data);
                self.send_update();
            }
        });

        this.command('discover', function(d) {
            self.send_update();
        });
        this.command('join', function(d) {
            console.log('joining room:', d.room);
            self.jitsi.join(d.room, d.password || null);
        });
        this.command('leave', function(d) {
            console.log('leave', d);
            self.jitsi.leave();
            window.location.reload(true);
        });
        this.command('setParticipantOrders', function(d) {
            self.jitsi.setParticipantOrders(d.orders);
        });
        this.command('updateParticipantOptions', function(d) {
            self.jitsi.updateParticipantOptions(d.id, d.options);
        });
        this.command('setParticipantFullscreen', function(d) {
            self.jitsi.setParticipantFullscreen(d.id);
        });
        this.command('sendRoomMessage', function(d) {
            self.jitsi.sendRoomMessage(d.message);
        });
        this.command('setDisplayName', function(d) {
            self.parameters.displayName = d.displayName;
            self.url_parameters_update();
            self.jitsi.setDisplayName(d.displayName);
        });
        this.command('updateDisplayOptions', function(d) {
            self.jitsi.updateDisplayOptions(d.options);
            self.send_update();
        });
    }
    command(action, callback) {
        this._commands[action] = callback;
    }

    discover(data) {
    }
    send_update(){
        var data = {
            id:             this.worker_id,
            displayName:    this.jitsi.displayName,
            room:           this.jitsi.room ? this.jitsi.room.getName():null,
            status:         this.jitsi.status,
            display_options: this.jitsi.display_options,
            participants:   this.jitsi.getParticipants()
        }
        this.socket.emit('room', {type: 'jitsi', source: this.worker_id, data: data});
    }
}

function startUp(streamui_config) {
    // start client if jitsi config and lib-jitsi-meet is loaded
    if (typeof window.JitsiMeetJS  == 'undefined' ||
        typeof window.config == 'undefined' ||
        typeof window.stream_socket != 'undefined') { return }
    console.warn("startUp", streamui_config);
    // force jitsi bosh via https
    window.config.bosh = window.config.bosh.replace(/^\/\//g, 'https://');
    window.stream_socket = new StreamUI(JitsiUI, streamui_config);
}

// get config and startup
$.getJSON( "config.json", function( streamui_config ) {
    var jitsi_url = (streamui_config.jitsi_url || '')
    loadScript(`${jitsi_url}/libs/lib-jitsi-meet.min.js`, function() { startUp(streamui_config); });
    loadScript(`${jitsi_url}/config.js`, function() { startUp(streamui_config); });
});
