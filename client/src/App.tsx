import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { io } from 'socket.io-client';
import './App.css';

type Message = {
  sender: string;
  text: string;
  timestamp: number;
};

type TypingPayload = {
  name: string;
  isTyping: boolean;
};

type JoinPayload = {
  name: string;
  channel: string;
};

const socket = io('http://localhost:5000');
const channels = ['general', 'tech', 'random'];

function App() {
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('');
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    socket.on('message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('selfMessage', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('userList', (users: string[]) => {
      setOnlineUsers(users);
    });

    socket.on('typing', ({ name, isTyping }: TypingPayload) => {
      setTypingUsers(prev => {
        const exists = prev.includes(name);
        if (isTyping && !exists) return [...prev, name];
        if (!isTyping && exists) return prev.filter(n => n !== name);
        return prev;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleJoin = () => {
    if (!name || !channel) return;
    setIsJoined(true);
    const payload: JoinPayload = { name, channel };
    socket.emit('join', payload);
  };

  const handleSend = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const trimmed = msg.trim();
    if (trimmed && trimmed.length <= 200) {
      socket.emit('message', trimmed);
      setMsg('');
      socket.emit('typing', false);
    }
  };

  const handleTyping = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMsg(value);
    socket.emit('typing', value.length > 0);
  };

  if (!isJoined) {
    return (
      <div className="join-screen">
        <h2>Join a Channel</h2>
        <input
          placeholder="Nickname"
          onChange={(e) => setName(e.target.value)}
        />
        <select
          onChange={(e) => setChannel(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Select Channel</option>
          {channels.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={handleJoin}>Join</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="sidebar">
        <h3>Online</h3>
        <ul>{onlineUsers.map(u => <li key={u}>{u}</li>)}</ul>
        <h4>Typing:</h4>
        <ul>{typingUsers.map(u => <li key={u}>{u} is typing...</li>)}</ul>
      </div>
      <div className="chat">
        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.sender === name ? 'own' : ''}`}>
              <b>{m.sender}</b> [{new Date(m.timestamp).toLocaleTimeString()}]: {m.text}
            </div>
          ))}
        </div>
        <form onSubmit={handleSend}>
          <input
            ref={inputRef}
            value={msg}
            onChange={handleTyping}
            maxLength={200}
            placeholder="Type your message..."
          />
          <button type="submit" disabled={!msg.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;
