Vue.component('atem', {
  props: ['atem'],
  filters: {
      gainFormat (value) {
          if (value >= 0)
              return "+" + value.toFixed(1);
          return value.toFixed(1);
      }
  },
  methods: {
    input_isLive: function(id) {
      return this.input_getState(id) == 2;
    },
    input_getState: function(id) {
      if ( this.atem.state.program == id )
        return 2;
      if ( this.atem.state.preview == id && this.atem.state.inTransition )
        return 2;
      if ( this.atem.state.preview == id )
        return 1;
      return 0;
    },
    audio_getName: function(id) {
      if (id in this.atem.inputs)
        return this.atem.inputs[id].longName;
      return this.atem.audio.channels[id].type;
    },
    setAudioInputGain: function(id, gain) {
      this.atem.audio.channels[id].gain = gain;
      this.sendEvent('setAudioMixerInputGain', { id: id, gain: gain });
    },
    sendEvent: function(ev, data) {
      this.$emit('control-event', 'atem', ev, data );
    }
  },
  template: `
    <div class="controlpanel mixer p-2">
      <div class="mixerinputs mixerinputs-audio">
        <span class="header">Audio Inputs</span>
          <div class="btn-group mr-2" role="group" aria-label="Mixer Audio" style="width:100%; background: rgba(255,255,255, 0.05)">
              <div v-for="i in atem.audio.channels" :key="i.id" class="btn-group" role="group" v-if="audio_getName(i.id) != ''">
                  <button :id="'audio-dropdown'+atem.id+'-'+i.id" type="button" class="btn btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"
                  v-bind:class="{ 'btn-outline-secondary': i.state == 'off', 'btn-success': i.state == 'on',
                      'btn-outline-warning': i.state == 'afv' && !input_isLive(i.id), 'btn-warning': i.state == 'afv' && input_isLive(i.id)}">
                  {{ audio_getName(i.id) }}
                  </button>
                  <ul class="dropdown-menu" :aria-labelledby="'audio-dropdown'+atem.id+'-'+i.id" >
                      <li>
                        <a class="dropdown-item" href="#" v-show=" i.state != 'on'"
                        v-on:click="sendEvent('setAudioMixerInputMixOption', { id: i.id, state: 'on' })">ON</a>
                      </li>
                      <li>
                        <a class="dropdown-item" href="#" v-show=" i.state != 'off'"
                        v-on:click="sendEvent('setAudioMixerInputMixOption', { id: i.id, state: 'off' })">OFF</a>
                      </li>
                      <li>
                        <a class="dropdown-item" href="#" v-show=" i.state != 'afv'" v-if="i.id in atem.inputs"
                        v-on:click="sendEvent('setAudioMixerInputMixOption', { id: i.id, state: 'afv' })">On Video</a>
                      </li>
                      <li>
                        <div class="dropdown-item" style="min-width: 8rem">
                            <span style="cursor:col-resize" v-on:click="setAudioInputGain( i.id, 0)" >{{ i.gain | gainFormat }}</span>
                            <input type="range" class="custom-range"  min="-60" max="6" step="0.2" style="height: 100%; width: auto; vertical-align: middle;"
                            :value="i.gain" v-on:input="setAudioInputGain( i.id, parseFloat($event.target.value))">
                        </div>
                      </li>
                  </ul>
              </div>
          </div>
      </div>
      <div class="mixerinputs mixerinputs-program">
        <span class="header">Video Mix</span>
          <div class="btn-group mr-2" role="group" aria-label="Mixer Preview" style="width:100%">
              <button type="button" class="btn btn-sm" v-for="i in atem.inputs" :key="i.id"
                v-bind:class="{
                  'btn-secondary':  input_getState(i.id) == 0,
                  'btn-success':    input_getState(i.id) == 1,
                  'btn-danger':     input_getState(i.id) == 2,
                }" v-on:click="sendEvent('changePreviewInput', { id: i.id })" v-if="i.longName != ''">
                  {{ i.longName }}
              </button>
          </div>
      </div>
      <div class="text-center" style="margin-top:1rem">
        <div class="cut-actions" role="group" aria-label="cut-action">
          <button type="button" class="btn btn-lg btn-secondary" v-on:click="sendEvent('cut', {})">Cut</button>
          <button type="button" class="btn btn-lg btn-secondary" v-on:click="sendEvent('auto', {})"
              v-bind:class="{ 'progress-bar-striped progress-bar-animated active': atem.state && atem.state.inTransition}" >Fade</button>
        </div>
      </div>
    </div>
  `
});
