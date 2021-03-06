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
      this.$emit('control-event', this.jitsi.id, 'updateParticipantOptions', { id: participant.id, options: options });
    },
    updateDisplayOption: function(option, value) {
      var options = {};
      options[option] = value;
      this.$emit('control-event', this.jitsi.id, 'updateDisplayOptions', { options: options });
    },
    showParticipant: function(participant) {
      console.log("showing fullscreen", participant.displayName);
      this.$emit('control-event', this.jitsi.id, 'setParticipantFullscreen', { id: participant.id });
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
      this.$emit('control-event', this.jitsi.id, 'setDisplayName', { displayName: displayName });
    },
    UIjoin: function() {
      if (!this.input_roomname_invalid) {
        var room = this.join_room_name;
        var password = this.join_room_password;
        if (password.length == 0) { password = null; }
        console.log('join', room, password, this);
        this.$emit('control-event', this.jitsi.id, 'join', { 'room': room, 'password': password } );
      }
    },
    UIdisconnect: function() {
      var confirm = prompt('please enter the word \'LEAVE\':');
      if (confirm === "LEAVE") {
        this.$emit('control-event', this.jitsi.id, 'leave', {} );
      }
    }
  },
  template: `
        <div class="p-2 controlpanel jitsi">
          <div>
            <span class="header" contenteditable v-text="jitsi.displayName" @blur="playerDisplayNameChange" @keydown.enter="function(e) {e.path[0].blur();}"></span>
              ({{ jitsi.id }}), status: {{ jitsi.status }}, room: {{ jitsi.room || 'none' }}
            <div class="float-right">
              <button type="button" class="btn btn-sm btn-success" v-show="jitsi.room == null" data-bs-toggle="modal" :data-bs-target="'#joinModal'+jitsi.id">Join Room</button>
              <button type="button" class="btn btn-sm btn-danger" v-show="jitsi.room != null" v-on:click="UIdisconnect">Disconnect <i class="fas fa-grip-horizontal"></i></button>
            </div>
          </div>
            <!-- Participant List -->
            <table class="table table-striped small jitsi-participants">
                <tbody>
                    <tr>
                        <th>Name</th>
                        <th>Tracks</th>
                        <th>Volume</th>
                        <th></th>
                    </tr>
                    <template v-for="participant in participants_sorted">
                    <tr v-if="participant.hidden != true"  :key="participant.id">
                        <td style="text-align: left">
                            <i v-bind:class="{ 'fa-eye': participant.options.visible == true, 'fa-eye-slash': participant.options.visible == false }"
                              class="fas participant-visible" v-on:click="toggleParticipantVisible(participant)" style="cursor: pointer;">&nbsp;
                            </i>
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
                                        class="fas participant-mute" v-on:click="toggleParticipantMute(participant)" style="cursor: pointer">&nbsp;</i>
                                    <input type="range" class="custom-range jitsi-participant-volume"  min="-40" max="0" step="1" :value="participant.options.audio_volume"
                                        v-on:input="setParticipantVolumeEvent(participant, $event)">
                                </span>
                            </div>
                        </td>
                        <td>
                            <i v-bind:class="{ 'fa-user': participant.role == 'participant', 'fa-user-graduate': participant.role == 'moderator' }"
                                class="fas participant-role"></i>
                            <i v-bind:class="{
                              'fa-check-circle': participant.connection == 'active',
                              'fa-pause-circle': participant.connection == 'inactive',
                              'fa-exclamation-triangle': participant.connection == 'interrupted',
                              'fa-spinner': participant.connection == 'restoring'
                            }" class="fas participant-connection"></i>
                        </td>
                    </tr>
                    </template>
                </tbody>
            </table>
            <!-- Option Sliders -->
            <div role="group" aria-label="cut-action">
                <div class="form-check form-check-inline form-switch">
                    <input class="form-check-input" type="checkbox"  v-model="jitsi.display_options.fullscreen" onClick="false;" v-on:click="updateDisplayOption('fullscreen', !jitsi.display_options.fullscreen)">
                    <label class="form-check-label">enable fullscreen</label>
                </div>
                <div class="form-check form-check-inline form-switch">
                    <input class="form-check-input" type="checkbox" v-model="jitsi.display_options.fullscreen_follow" onClick="return false;" v-on:click="updateDisplayOption('fullscreen_follow', !jitsi.display_options.fullscreen_follow)">
                    <label class="form-check-label">follow active speaker</label>
                </div>
                <div class="form-check form-check-inline form-switch">
                    <input class="form-check-input" type="checkbox" v-model="jitsi.display_options.auto_add" onClick="return false;" v-on:click="updateDisplayOption('auto_add', !jitsi.display_options.auto_add)">
                    <label class="form-check-label">add new participants</label>
                </div>
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
