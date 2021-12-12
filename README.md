# About

This is a video streaming tool that consists a multi-user, multi-room 
control webinterface and several clients, than can remote-control multiple
clients:

- a websocket server that also hosts the control room and jitsi player
- multiple remote-controlled clients:
  - clean-feed Jitsi Meet players
  - OBS instances (switching between scenes, optional)
  - one atem video switcher (preview/program+audio, optional)

# Parts

## Control Room

## Jitsi Player

### URL parameters

- required:
  - `control`: id/name of your control room, usually copied with the player link in the control room.
- optional:
  - `id`: player ID (auto-generated if not given)
  - `displayName`: Jitsi display name
  - `css`: additional css url/path
  - `backgroundImage`: background image url/path
  - `xmpp_id`/`xmpp_password`: jabber/prosody user/password for hidden-domain jibri setup, see below

# running

# Misc
## Jitsi Meet tweaks

There is a VideoBridge issue with suspended video feeds, see [this thread on community.jitsi.org](https://community.jitsi.org/t/jitsi-users-video-turned-off-to-save-bandwidth-on-meet-jit-si/12735).
It seems to be fixed in jvb unstable, but not released as of 12/2012.

If your participants get the `Video turned off to save bandwidth` message in Jitsi Meet, although their bandwidth should be OK,
our your `jvb.log` has lots of `Endpoints were suspended due to insufficient bandwidth` logs,
you might want to disable trusting the browser bandwidth estimation (bwe) in `/etc/jitsi/videobridge/jvb.conf`, remember:
This might lead to video bandwidth overshoot and audio/video stutter for some participants,
although we never experienced problems, also this might be better than no video at all.

```
videobridge {
  cc {
    trust-bwe=false
  }
}
```

You can also set a (higher) fixed video framerate, which eg. improves readability of sign language significantly:

```
videobridge {
  cc {
    onstage-preferred-framerate=25
  }
}
```

## Hiding Players for the jitsi participants

Players can log into prosody with a hiddenDomain with the `xmpp_id`/`xmpp_password` settings, just like
Jibri does to hide itself from the conference. See the `hiddenDomain` jitsi settings and prosody domain settings/users
 of [Jibri](https://github.com/jitsi/jibri#configuring-a-jitsi-meet-environment-for-jibri)

## fullscreen chromium

Most modern players need an interaction (eg click) to enable auto-play for video,
which is not very practicable when running it headless for a jitsi display.

To start chromium in fullscreen without any interaction needed, you can use the following script (or options).

```bash
#!/bin/sh

N=1
ID="stream${N}"
NAME="Stream${N}"
URL="https://MYURL/stream-ui/"

DISPLAY=:0 chromium "${URL}player.html#control=stream&id=${ID}&displayName=${NAME}" \
    --disable-infobars --use-fake-ui-for-media-stream --kiosk --temp-profile --start-maximized --enabled --enable-logging --autoplay-policy=no-user-gesture-required
```

## notes on OBS browser source and stability

I experienced a few problems with OBS bzw. OBS browser source (under Linux):

* Audio/Video asynchronous after 2-3hrs, at least when using a projector and HDMI output
* WebRTC problems with OBS-Browser after a few hours (some participants have no video in the player)
  * persist even on restarting/reloading the browser sources
  * it seems that restarting OBS Studio is the only fix for now
