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


# Jitsi Meet tweaks

If your participants get the `Video turned off to save bandwidth` message in Jitsi Meet, although their bandwidth should be OK,
you might want to disable trusting the browser bandwidth estimation (bwe).

You can also set a (higher) fixed video framerate in `/etc/jitsi/videobridge/jvb.conf`:

```
videobridge {
  cc {
    trust-bwe=false
    onstage-preferred-framerate=25
  }
}
```

## Hiding Players for the jitsi participants

Players can log into prosody with a hiddenDomain with the `xmpp_id`/`xmpp_password` settings, just like
Jibri does to hide itself from the conference. See the `hiddenDomain` jitsi settings and prosody domain settings/users
 of [Jibri](https://github.com/jitsi/jibri#configuring-a-jitsi-meet-environment-for-jibri)
