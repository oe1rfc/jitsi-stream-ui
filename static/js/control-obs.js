Vue.component('obs', {
  props: ['obs'],
  data: function() {
    return {}
  },
  computed: {
  },
  methods: {
    formatSeconds: function(seconds) {
      var min = Math.floor(Math.abs(seconds) / 60);
      var sec = Math.round(Math.abs(seconds) % 60);
      var sign = '';
      if (seconds < 0) { sign = '-'; }
      if (min != 0) {
        return `${sign}${min}m ${sec}s`;
      }
      return `${sign}${sec}s`;
    },
    setPreview: function(scene){
      this.obsCommand('SetPreviewScene', { 'scene-name': scene });
    },
    obsTransition: function(name) {
      this.obsCommand('TransitionToProgram', { 'with-transition': {name: name}});
    },
    obsCommand: function(command, args) {
      this.sendEvent('send', { command: command, args: args});
    },
    sendEvent: function(ev, data) {
        this.$emit('control-event', this.obs.id, ev, data );
    }
  },
  template: `
        <div class="p-2 controlpanel obs">
          <div class="obs-flex">
            <div class="obs-left">
              <div>
                <span class="header">OBS {{ obs.id }}</span>
                status: {{ obs.status }}
              </div>
              <div class="obs-scenes">
                  <button v-for="scene in obs.scenes" type="button"
                    class="btn btn-sm btn-secondary" v-bind:class="{
                    'btn-success': scene == obs.previewScene,
                    'btn-danger': scene == obs.currentScene
                  }"  v-on:click="setPreview(scene)">{{ scene }}</button>
              </div>
              <div v-if="obs.scenes" class="obs-controls">
                  <button type="button" class="btn btn-secondary"
                    v-on:click="obsTransition('Cut')">Cut</button>
                  <button type="button" class="btn btn-secondary"
                    v-on:click="obsTransition('Fade')">Fade</button>
              </div>
            </div>
            <div v-if="obs.previewScreenshot" class="obs-preview">
              <img v-bind:src="obs.previewScreenshot" />
            </div>
          </div>
          <div class="obs-media">
            <div class="progress" v-for="media in obs.media">
              <div class="progress-bar" role="progressbar"
                v-bind:class="{
                  'bg-warning': media.duration-media.time <= 60,
                  'bg-danger': media.duration-media.time <= 10,
                }" v-bind:style="{ width: (media.time/media.duration)*100 + '%' }">
                  {{ media.source }} | {{ formatSeconds(media.time - media.duration) }}
                </div>
            </div>
          </div>
        </div>
  `
});
