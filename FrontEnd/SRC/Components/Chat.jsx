import React, { useEffect, useState, useRef } from 'react';
import socket from "./socket.js"; 
import '@fortawesome/fontawesome-free/css/all.min.css';


function Chat() {
  const [sender, setSender] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typingIndicator, setTypingIndicator] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let stored = sessionStorage.getItem('sender');
    let storedTime = sessionStorage.getItem('sessionTime');
    let now = new Date().getTime();

    if (!stored || !storedTime || now - storedTime > 30 * 60 * 1000) {
      stored = prompt('Enter your name:');
      sessionStorage.setItem('sender', stored);
      sessionStorage.setItem('sessionTime', now);
    }

    setSender(stored);

    socket.on('chat history', (history) => {
      setMessages(history);
    });

    socket.on('chat message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on('typing', (data) => {
      setTypingIndicator(`${data.sender} is typing...`);
    });

    socket.on('stop typing', () => {
      setTypingIndicator('');
    });

    return () => {
      socket.off('chat history');
      socket.off('chat message');
      socket.off('typing');
      socket.off('stop typing');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() === '') return;

    socket.emit('chat message', { sender, message });
    setMessage('');
    setTypingIndicator('');
  };

  let typingTimer;
  const startTyping = () => {
    socket.emit('typing', { sender });
    clearTimeout(typingTimer);
  };

  const stopTyping = () => {
    typingTimer = setTimeout(() => {
      socket.emit('stop typing', sender);
    }, 1000);
  };

  return (
    <div className="w-full max-w-6xl h-[90vh] flex backdrop-blur-xl bg-white/30 rounded-3xl shadow-2xl overflow-hidden">
      <div className="hidden md:flex w-1/3 flex-col p-4 border-r border-white/20">
        <h2 className="text-white text-2xl font-semibold mb-4">Contacts</h2>
        <div className="flex items-center gap-3 mb-4 bg-white/20 p-3 rounded-xl hover:bg-white/30 cursor-pointer transition">
          <img src= "https://wallpaperaccess.com/full/9290141.jpg" className="w-12 h-12 rounded-full" alt="User" />
          <div>
            <p className="text-white font-semibold">Group Chat</p>
            <p className="text-sm text-white/70">Have a fun guys..</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full md:w-2/3 h-full">
        <div className="flex justify-between items-center bg-white/20 p-4 rounded-t-3xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <img src="https://wallpaperaccess.com/full/9290141.jpg" className="w-12 h-12 rounded-full" alt="Profile" />
            <div>
              <h3 className="text-black font-semibold text-lg">Group Chat</h3>
              <p className="text-sm text-white/70 italic">{typingIndicator}</p>
            </div>
          </div>
          <i className="fas fa-phone-alt text-black text-xl"></i>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white/10 backdrop-blur-lg">
          <ul className="flex flex-col space-y-2">
            {messages.map((msg, idx) => (
              <li
                key={idx}
                className={`${
                  msg.sender === sender
                    ? 'self-end bg-green-500 text-white'
                    : 'self-start bg-white/50 text-black'
                } px-4 py-2 rounded-xl max-w-[70%]`}
              >
                <span className="font-semibold">{msg.sender}:</span> {msg.message}
              </li>
            ))}
            <div ref={messagesEndRef} />
          </ul>
        </div>

        <div className="bg-white/20 p-4 backdrop-blur-md rounded-b-3xl">
          <form onSubmit={sendMessage} className="flex items-center gap-4">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onInput={startTyping}
              onBlur={stopTyping}
              style = {{color: "black"}}
              placeholder="Type your message..."
              className="custom-input flex-1 px-4 py-2 rounded-full border border-white/30 bg-white/20 text-white placeholder-white/70 focus:outline-none"
            />
            <button type="submit" className="text-white text-2xl hover:scale-110 transition">
              <i className="fas fa-paper-plane text-black"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chat;
