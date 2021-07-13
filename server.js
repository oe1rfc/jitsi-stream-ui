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
    console.log("room message => " + room_send, data);
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
