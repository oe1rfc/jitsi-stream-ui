Vue.component('jitsi-client', {
  props: ['jitsi'],
      data: function() {
        return {
            join_room_name: "",
            join_room_password: "",
        }
  },
  computed: {
      participants_sorted: function () {
          return Object.values(this.jitsi.participants).sort(function (a, b) {
              return a.order - b.order;
          });
      },
      input_roomname_invalid: function () {
        return !( this.join_room_name && this.join_room_name.length > 0);
      },
  },
  methods: {
    updateParticipantOptions: function(participant, options) {
      this.$emit('jitsi-event', this.jitsi.id, 'updateParticipantOptions', { id: participant.id, options: options });
    },
    showParticipant: function(participant) {
      console.log("showing fullscreen", participant.displayName);
      this.$emit('jitsi-event', this.jitsi.id, 'setParticipantFullscreen', { id: participant.id });
    },
    toggleParticipantMute: function(participant) {
      console.log("mute toggle", participant.displayName);
      this.updateParticipantOptions(participant, { audio_muted: !participant.options.audio_muted });
    },
    toggleParticipantVisible: function(participant) {
      console.log("visible toggle", participant.displayName, !participant.options.visible);
      this.updateParticipantOptions(participant, { visible: !participant.options.visible });
    },
    setParticipantVolume: function(participant, volume) {
      volume = parseFloat(volume);
      console.log("set volume", volume, participant.displayName);
      this.updateParticipantOptions(participant, { audio_volume: volume });
    },
    setParticipantVolumeEvent: function(participant, event) {
      this.setParticipantVolume(participant, event.target.value);
    },
    playerDisplayNameChange: function(e) {
      var displayName = e.target.innerText;
      this.$emit('jitsi-event', this.jitsi.id, 'setDisplayName', { displayName: displayName });
    },
    UIjoin: function() {
      if (!this.input_roomname_invalid) {
        var room = this.join_room_name;
        var password = this.join_room_password;
        if (password.length == 0) { password = null; }
        console.log('join', room, password, this);
        this.$emit('jitsi-event', this.jitsi.id, 'join', { 'room': room, 'password': password } );
      }
    },
    UIdisconnect: function() {
      var confirm = prompt('please enter the word \'LEAVE\':');
      if (confirm === "LEAVE") {
        this.$emit('jitsi-event', this.jitsi.id, 'leave', {} );
      }
    }
  },
  template: `
          <div class="p-3 controlpanel">
          <h5>
            <span contenteditable v-text="jitsi.displayName" @blur="playerDisplayNameChange" @keydown.enter="function(e) {e.path[0].blur();}"></span>
              ({{ jitsi.id }}), 
              status: {{ jitsi.status }}, room: {{ jitsi.room || 'none' }}
            <div class="float-right">
              <button type="button" class="btn btn-sm btn-success" v-show="jitsi.room == null" data-bs-toggle="modal" :data-bs-target="'#joinModal'+jitsi.id">Join Room</button>
              <button type="button" class="btn btn-sm btn-danger" v-show="jitsi.room != null" v-on:click="UIdisconnect">Disconnect <i class="fas fa-grip-horizontal"></i></button>
            </div>
          </h5>
            <table class="table table-striped small jitsi-participants">
                <tbody>
                    <tr>
                        <th>Name</th>
                        <th><i class="fas fa-grip-horizontal"></i></th>
                        <th>Tracks</th>
                        <th>Volume</th>
                        <th>role</th>
                        <th>status</th>
                    </tr>
                    <template v-for="participant in participants_sorted">
                    <tr v-if="participant.hidden != true"  :key="participant.id">
                        <td style="text-align: left">
                            <a v-if="true" v-on:click="showParticipant(participant)" style="cursor: pointer">
                                <i v-for="t in participant.tracks"
                                    v-if="t.type == 'audio' && t.muted != true"
                                    v-bind:style="{ opacity: t.audioLevel*500 + '%' }"
                                    style="color: #60ff80; transition:opacity 0.3s; width:0px;overflow:visible"
                                class="fas fa-circle"></i>
                                <b style="padding-left: 1em" v-bind:style="[ participant.options.fullscreen ? { 'text-transform': 'uppercase' } : { } ]">{{ participant.displayName }}</b>
                            </a>
                        </td>
                        <td>
                            <i v-bind:class="{ 'fa-eye': participant.options.visible == true, 'fa-eye-slash': participant.options.visible == false }"
                                class="fas participant-visible" v-on:click="toggleParticipantVisible(participant)" style="cursor: pointer;">&nbsp;</i>
                        </td>
                        <td>
                            <i v-for="t in participant.tracks"
                                v-bind:class="{ 'fa-microphone': t.muted == false, 'fa-microphone-slash': t.muted == true, }"
                                v-show="t.type == 'audio'" class="fas">&nbsp;</i>
                            <i v-for="t in participant.tracks"
                                v-bind:class="{ 'fa-video': t.videoType == 'camera', 'fa-desktop': t.videoType == 'desktop' }"
                                v-show="t.muted != true && t.type == 'video'" class="fas">&nbsp;</i>
                        </td>
                        <td style="max-width: 8em">
                            <div style="input-group" v-for="t in participant.tracks" v-if="t.type == 'audio'">
                                <span class="input-group-text" style="padding: .15rem .4rem; background-color: rgba(200,200,200, 0.3); border: none">
                                    <i v-bind:class="{ 'fa-volume-mute': participant.options.audio_muted == true, 'fa-volume-down': participant.options.audio_muted == false }"
                                        class="fas" v-on:click="toggleParticipantMute(participant)" style="cursor: pointer">&nbsp;</i>
                                    <input type="range" class="custom-range jitsi-participant-volume"  min="-40" max="0" step="1" :value="participant.options.audio_volume"
                                        v-on:input="setParticipantVolumeEvent(participant, $event)">
                                </span>
                            </div>
                        </td>
                        <td>{{ participant.role }}</td>
                        <td>{{ participant.connection }}</td>
                    </tr>
                    </template>
                </tbody>
            </table>
            <div role="group" aria-label="cut-action">
                <button type="button" class="btn btn-sm btn-secondary" v-show="jitsi.status == 'connected'" v-on:click="$emit('jitsi-event', jitsi.id, 'toggleTileView', {})">Toggle Tile View <i class="fas fa-grip-horizontal"></i></button>
            </div>
            <!-- Join Modal -->
            <div class="modal fade" :id="'joinModal'+jitsi.id" tabindex="-1" aria-labelledby="joinModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Connect {{ jitsi.displayName }} <small>({{ jitsi.id }})</small> to a room</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                                <div class="mb-3">
                                    <label for="input_roomname" class="form-label">Room:</label>
                                    <input type="text" class="form-control" v-model="join_room_name" >
                                </div>
                                <div class="mb-3">
                                    <label for="input_roompassword" class="form-label">Password: <small>(optional)</small></label>
                                    <input type="text" class="form-control" v-model="join_room_password" >
                                </div>
                        </div>
                        <div class="modal-footer">
                            <button type="submit" class="btn btn-primary" v-on:click="UIjoin" data-bs-dismiss="modal" v-bind:disabled="input_roomname_invalid">Join Room</button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
  `
});
