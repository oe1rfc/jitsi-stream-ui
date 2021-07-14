
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
                audio_volume: -3,   // volume attenuation in decibels ( <= 0 )
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
            this.$set(this.options, 'visible', value);
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
                    //this.tracks[n].setMute(this.options.audio_muted);
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
        id: function() {
            return this.participant.getId();
        },
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
        <div class="column video-column participant" :id="id" v-show="ui_visible" v-bind:class="{ 'fullscreen': ui_fullscreen, 'active': ui_dominant_speaker, 'frame': ui_frame }">
            <template v-for="track in tracks">
                <video v-if="track.getType() == 'video'" autoplay='1' :id="track.getTrackId()" v-show="ui_video_running" />
                <audio v-if="track.getType() == 'audio'" autoplay='1' :id="track.getTrackId()" />
            </template>
            <h2 v-if="ui_frame" >{{ ui_display_name }}</h2>
        </div>
  `
});

var JitsiUI = new Vue({
    el: '#streamui-container',
    data: {
        displayName: "Stream Display",
        jisti_participants: {},  // jitsi objects
        participants: {},   // vue components
        fullscreen_speaker: null,
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
        JitsiMeetJS.init(config);
        JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.WARNING);
        this.jitsi = new JitsiMeetJS.JitsiConnection("app-stream-ui", null, config);
        this.jitsi.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, this.jitsiConnected);
        this.jitsi.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, this.jitsiConfailed);
        this.jitsi.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, this.jitsiDisconnected);
        // PASSWORD_REQUIRED
        // CONNECTION_DROPPED_ERROR
        console.warn('JitsiUI created', this);
    },
    watch: {
        displayName: function(val) { if (this.room) this.room.setDisplayName(val); }
    },
    methods: {
        participant_created: function(id, component) {
            this.$set(this.participants, id, component);
        },
        participant_destroyed: function(id) {
            Vue.delete( this.participants, id );
        },
        connect_auth: function(id, password) {
            this.connect_options.id = id;
            this.connect_options.password = password;
        },
        connect: function() {
            if (this.jitsi.xmpp.connection.connected != true)
                this.jitsi.connect(this.connect_options); // connect(options) - JS Object with id and password properties.
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
                order: this.order_count++,
                participant: participant,
                muted: { video: null, audio: null },
                tracks: {}
            });
        },
        jitsiUserLeft: function(id) {
            console.warn('user left', id);
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
            if (pid in this.jisti_participants) {
                this.participants[pid].cleanupTracks(track);
                Vue.delete(this.jisti_participants[pid].tracks, track.getId() );
                // delete this.jisti_participants[pid].tracks[track.getId()]; // TODO this probably needs cleanup
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
        join: function(roomname, password = null) {
            if ( this.room ) { this.leave(); }
            this.room = this.jitsi.initJitsiConference(roomname, config); 
            this.room.on(JitsiMeetJS.events.conference.TRACK_ADDED, this.jitsiTrackAdded);
            this.room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, this.jitsiTrackRemoved);
            this.room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, this.jitsiConferenceJoined);
            /* TODO interesting events:
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
            // this.room.on(JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED,
            //    (userID, audioLevel) => console.warn(`AudioLevel: ${userID} - ${audioLevel}`));
            this.room.join(password);
        },
        leave: function() {
            this.room.leave();
            this.room = null;
            this.status = 'left';
        },
        sendRoomMessage: function(text) {
            this.room.sendTextMessage(text);
        },
        foo: function(e) {
            console.warn('jitsi connected', e, this);
        },
        getParticipants: function() {
            var participants_info=[];
            for (var pid in this.jisti_participants) {
                participants_info.push( this.participants[pid].participant_info() );
            };
            return participants_info;
        },
        setParticipantVisible: function(id, visible) {
            if(id in this.participants)
                this.participants[id].visible = visible;
        },
        jitsiUpdateReceiverConstraints: function() {
            /* Update VideoBridge with desired track IDs and resolutions
             * https://github.com/jitsi/jitsi-videobridge/blob/master/doc/allocation.md#new-message-format
             */
            var endpoint_ids = [];
            var endpoint_constraints = {};
            for (var p of Object.values(this.participants)) {
                if( p.ui_video_running ) {
                    endpoint_ids.push(p.id);
                    endpoint_constraints[p.id] = { 'maxHeight':  1080 }
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
        updateParticipantOptions: function(id, options) {
            this.participants[id].updateOptions(options);
        },
        setParticipantFullscreen: function(id) {
            if( this.fullscreen_speaker == id)
                id = null;
            this.fullscreen_speaker = id;
            for (var p of Object.values(this.participants)) {
                p.setFullscreen(p.id == id);
            }
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
    
    constructor(jitsi, socketio_options) {
        if (this.url_parameters_parse() == false)
            return false;
        this.url_parameters_update();
        this.control_room = this.parameters.control;
        this.worker_id = this.parameters.id;
        this.jitsi = jitsi;
        if ( this.parameters.displayName ) {
            this.jitsi.displayName = this.parameters.displayName;
        } else {
            this.jitsi.displayName = `${this.jitsi.displayName} ${this.worker_id}`;
        }
        this.jitsi.connect_auth(this.parameters.xmpp_id, this.parameters.xmpp_password);
        this.jitsi.connect();
        this.init_socketio(socketio_options);
    }

    url_parameters_parse() {
        // parse hash location parameters
        this.parameters = location.hash.replace('#', '').split('&').reduce((prev, item) => {
            var kv = item.split('='); return Object.assign({[kv[0]]: decodeURIComponent(kv[1])}, prev); }, {});

        if( ! this.parameters.control) {
            alert("warning: 'control' room parameter not set in url, can not proceed");
            return false;
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

    init_socketio(options) {
        var self = this;
        this.socket = io(options.namespace, {path: options.path});
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
            self.jitsi.setDisplayName(d.displayName);
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
            participants:   this.jitsi.getParticipants()
        }
        this.socket.emit('room', {type: 'jitsi', source: this.worker_id, data: data});
    }
}

var stream_socket = new StreamUI(JitsiUI, streamui_config);

