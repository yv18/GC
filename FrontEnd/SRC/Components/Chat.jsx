import React, { useEffect, useState, useRef } from 'react';
import socket from "./socket.js";
import '@fortawesome/fontawesome-free/css/all.min.css';
import VK from "../Components/Images/VK.jpg";

function Chat() {
  const [sender, setSender] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typingIndicator, setTypingIndicator] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [showContacts, setShowContacts] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

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
    socket.emit('join', stored);

    socket.on('chat history', (history) => {
      setMessages(history);
    });

    socket.on('chat message', (data) => {
      setMessages((prev) => [...prev, { ...data, seen: false }]);
      if (data.sender !== stored && Notification.permission === "granted") {
        new Notification(`${data.sender} says:`, {
          body: data.message ? data.message : "Sent an image",
        });
      }
    });

    socket.on('typing', (data) => {
      if (data.sender !== stored) {
        if (data.text && data.text.trim() !== '') {
          setTypingIndicator(`${data.sender} is typing: "${data.text}"`);
        } else {
          setTypingIndicator(`${data.sender} is typing...`);
        }
      }
    });

    socket.on('stop typing', () => {
      setTypingIndicator('');
    });

    socket.on('user list', (users) => {
      setOnlineUsers(users);
    });

    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageData = event.target.result;
            const newMessage = {
              sender,
              image: imageData,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              seen: false,
            };
            socket.emit('chat message', newMessage);
          };
          reader.readAsDataURL(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      socket.off('chat history');
      socket.off('chat message');
      socket.off('typing');
      socket.off('stop typing');
      socket.off('user list');
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    socket.emit('read', { reader: sender });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() === '') return;

    const newMessage = {
      sender,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      seen: false,
    };

    socket.emit('chat message', newMessage);
    setMessage('');
    setTypingIndicator('');
    socket.emit('stop typing', sender);
  };

  let typingTimer;
  const handleTyping = (e) => {
    const currentText = e.target.value;
    setMessage(currentText);
    socket.emit('typing', { sender, text: currentText });
    clearTimeout(typingTimer);
  };

  const stopTyping = () => {
    typingTimer = setTimeout(() => {
      socket.emit('stop typing', sender);
    }, 1000);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleContacts = () => {
    setShowContacts(!showContacts);
  };

  return (
    <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black' : 'bg-white'} w-full max-w-6xl h-[90vh] flex flex-col md:flex-row rounded-3xl shadow-2xl overflow-hidden`}>

      {/* Contacts Panel */}
      <div className={`fixed inset-0 z-50 md:static md:flex ${showContacts ? 'flex' : 'hidden'} md:w-1/3 flex-col p-4 border-r border-gray-700 bg-gray-900 md:bg-transparent`}>
        <h2 className="text-gray-100 text-2xl font-semibold mb-4 flex justify-between items-center">
          Contacts
          <button onClick={toggleContacts} className="md:hidden text-2xl">✖</button>
        </h2>
        {onlineUsers.map((user, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 mb-4 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} p-3 rounded-xl cursor-pointer transition`}
          >
            <img
              src={VK}
              className="w-12 h-12 rounded-full object-cover"
              alt="User"
            />
            <div>
              <p className="text-gray-100 font-semibold flex items-center gap-2">
                {user}
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
              </p>
              <p className="text-sm text-gray-400">Online</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Chat Panel */}
      <div className="flex flex-col w-full md:w-2/3 h-full">
        <div className={`flex justify-between items-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} p-4 rounded-t-3xl`}>
          <div className="flex items-center gap-4">
            <button onClick={toggleContacts} className="md:hidden text-2xl">👥</button>
            <img
              src={VK}
              className="w-12 h-12 rounded-full object-cover"
              alt="Profile"
            />
            <div>
              <h3 className={`${theme === 'dark' ? 'text-gray-100' : 'text-black'} font-semibold text-lg flex items-center gap-2`}>
                Group Chat
              </h3>
              <p className="text-sm text-gray-400 italic">{typingIndicator}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="text-xl">
              {theme === 'dark' ? '🌤️' : '🌙'}
            </button>
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex-1 overflow-y-auto p-4 space-y-2`}>
          <ul className="flex flex-col space-y-2">
            {messages.map((msg, idx) => (
              <li
                key={idx}
                className={`transition-all duration-300 relative ${
                  msg.sender === sender
                    ? 'self-end bg-blue-600 text-white'
                    : `${theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-black'}`
                } px-4 py-2 rounded-xl max-w-[70%]`}
              >
                <div>
                  <b>{msg.sender}</b>:&nbsp;
                  {msg.message && <span>{msg.message}</span>}
                  {msg.image && (
                    <a href={msg.image} target="_blank" rel="noreferrer">
                      <img src={msg.image} alt="pasted" className="mt-2 rounded-lg max-w-xs" />
                    </a>
                  )}
                  <span style={{ fontSize: '10px' }} className="block mt-1">
                    {msg.time} {msg.sender === sender && <>{msg.seen ? '✔' : '✔✔'}</>}
                  </span>
                </div>
              </li>
            ))}
            <div ref={messagesEndRef} />
          </ul>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} p-4 rounded-b-3xl`}>
          <form onSubmit={sendMessage} className="flex items-center gap-4">
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              onBlur={stopTyping}
              placeholder="Type your message..."
              className={`flex-1 px-4 py-2 rounded-full border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-400 bg-white text-black placeholder-gray-600'} focus:outline-none`}
            />
            <button type="submit" className={`${theme === 'dark' ? 'text-gray-100' : 'text-black'} text-2xl hover:scale-110 transition`}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chat;
