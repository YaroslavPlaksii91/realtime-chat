import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { Message, User } from './types';
import { getUsersInChannel } from './helpers';

dotenv.config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
  },
});

const users: Record<string, User> = {};

io.on('connection', (socket: Socket) => {
  let currentChannel: string | null = null;
  let nickname: string | null = null;

  socket.on('join', ({ name, channel }: User) => {
    if (!name || !channel) return;
    
    nickname = name;
    currentChannel = channel;

    socket.join(channel);
    users[socket.id] = { name, channel };

    io.to(channel).emit('userList', getUsersInChannel(channel, users));
    socket.to(channel).emit('message', {
      sender: 'System',
      text: `${name} joined ${channel}`,
      timestamp: new Date(),
    });
  });

  socket.on('typing', (isTyping: boolean) => {
    if (currentChannel && nickname) {
      socket.to(currentChannel).emit('typing', { name: nickname, isTyping });
    }
  });

  socket.on('message', (msg: string) => {
    if (!currentChannel || !nickname || !msg.trim() || msg.length > 200) return;

    const payload: Message = {
      sender: nickname,
      text: msg,
      timestamp: new Date(),
    };

    socket.to(currentChannel).emit('message', payload);
    socket.emit('selfMessage', payload);
  });

  socket.on('disconnect', () => {
    if (currentChannel && nickname) {
      socket.to(currentChannel).emit('message', {
        sender: 'System',
        text: `${nickname} left the chat`,
        timestamp: new Date(),
      });

      socket.to(currentChannel).emit('typing', { name: nickname, isTyping: false });

      delete users[socket.id];
      io.to(currentChannel).emit('userList', getUsersInChannel(currentChannel, users));
    }
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server running on port ${port}`));
