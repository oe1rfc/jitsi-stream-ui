'use strict';

const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

// When we run the server our public file will also be ran
const publicDirectoryPath = path.join(__dirname, './static')
app.use(express.static(publicDirectoryPath))

app.get('/config.json', (req, res) => res.json({
    jitsi_url:              (process.env.JITSI_URL || '').replace(/\/$/g, ''),
    jitsi_multiview:        process.env.JITSI_MULTIVIEW || false,
    jitsi_multiview_pass:   process.env.JITSI_MULTIVIEW_PASS || '',
    path:                   (process.env.HTTP_PATH || "").replace(/\/$/g, '') + '/socket.io',
    namespace:              process.env.WS_NAMESPACE || '/',
    xmpp_id:                process.env.JITSI_XMPP_ID,
    xmpp_password:          process.env.JITSI_XMPP_PASSWORD,
    default_control_room:   process.env.DEFAULT_CONTROL_ROOM,
    hide_player_link:       process.env.HIDE_PLAYER_LINK ? true : false,
}));

io.on('connection', socket => {
  console.log("new connection: " + socket.id)
  var room_send = null;
  var id = null;
  
  socket.on("register", (data, callback) => {
    console.log('got register for room '+data.room, data);
    socket.join(data.room + '_' + data.type);
    if (data.id) {
      id = data.id;
    }
    if (data.type == 'user') {
      room_send = data.room + '_worker';
    } else if(data.type == 'worker') {
      room_send = data.room + '_user';
    } else {
      socket.emit('register', false);
    }
    socket.emit('register', true);
  });

  socket.on('disconnect', () => {
    if (id) {
      socket.to(room_send).emit("room", {type: 'disconnect', source: id} );
      console.log("disconnected => " + id);
    }
  });

  socket.on("room", (data, callback) => {
    socket.to(room_send).emit("room", data);
    console.log("room message => " + room_send, { type: data.type, source: data.source, command: data.command });
  });

})

const port = process.env.PORT || 3000
server.listen(port, () => console.log('Server is running on port '+port))

var signals = {
  'SIGHUP': 1,
  'SIGINT': 2,
  'SIGTERM': 15
};

Object.keys(signals).forEach((signal) => {
  process.on(signal, () => {
    io.close();
    server.close();
  });
});
