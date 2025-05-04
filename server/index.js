const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:5173',
  },
});

const channels = ['general', 'tech', 'random'];
const users = {};

io.on('connection', socket => {
    console.log('connection');
    
  let currentChannel = null;
  let nickname = null;

  socket.on('join', ({ name, channel }) => {
    console.log('joined', name, channel);
    socket.broadcast.emit('hi');
    
    nickname = name;
    currentChannel = channel;

    socket.join(channel);
    users[socket.id] = { name, channel };

    io.to(channel).emit('userList', getUsersInChannel(channel));
    socket.to(channel).emit('message', {
      sender: 'System',
      text: `${name} joined ${channel}`,
      timestamp: new Date(),
    });
  });

  socket.on('typing', isTyping => {
    if (currentChannel) {
      socket.to(currentChannel).emit('typing', { name: nickname, isTyping });
    }
  });

  socket.on('message', msg => {
    console.log('message', msg);
    
    if (!currentChannel || !msg.trim() || msg.length > 200) return;
    const payload = {
      sender: nickname,
      text: msg,
      timestamp: new Date(),
    };

    // Send to others
    socket.to(currentChannel).emit('message', payload);

    // Send directly to sender
    socket.emit('selfMessage', payload);
  });

  socket.on('disconnect', () => {
    console.log('disconnected');
    if (currentChannel) {
      socket.to(currentChannel).emit('message', {
        sender: 'System',
        text: `${nickname} left the chat`,
        timestamp: new Date(),
      });
      socket.to(currentChannel).emit('typing', { name: nickname, isTyping: false });
      delete users[socket.id];
      io.to(currentChannel).emit('userList', getUsersInChannel(currentChannel));
    }
  });
});

function getUsersInChannel(channel) {
  return Object.values(users)
    .filter(user => user.channel === channel)
    .map(user => user.name);
}

server.listen(5000, () => console.log('Server running on port 5000'));
