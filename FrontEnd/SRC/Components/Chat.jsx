import React, { useEffect, useState, useRef, useCallback } from 'react';
import socket from './socket.js';

// ─── Avatar helpers ──────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6',
];
const getAvatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials    = (name = '') => name.trim().slice(0, 2).toUpperCase() || '??';

function Avatar({ name, size = 10 }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 select-none`}
      style={{ background: getAvatarColor(name), minWidth: `${size * 4}px`, minHeight: `${size * 4}px` }}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Timestamp formatter ──────────────────────────────────────────────────────
const formatTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ─── NameModal ─────────────────────────────────────────────────────────────────
function NameModal({ onSubmit }) {
  const [val, setVal] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handle = (e) => {
    e.preventDefault();
    const trimmed = val.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e1f2e] border border-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-white text-2xl font-bold">Join the Chat</h2>
            <p className="text-slate-400 text-sm mt-1">Enter a name to get started</p>
          </div>
        </div>
        <form onSubmit={handle} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="Your name…"
            maxLength={24}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={!val.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Enter Chat
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Chat Component ───────────────────────────────────────────────────────
export default function Chat() {
  const [sender,          setSender]          = useState('');
  const [nameReady,       setNameReady]       = useState(false);
  const [message,         setMessage]         = useState('');
  const [messages,        setMessages]        = useState([]);
  const [typingUsers,     setTypingUsers]     = useState([]);
  const [onlineUsers,     setOnlineUsers]     = useState([]);
  const [showSidebar,     setShowSidebar]     = useState(false);
  const [connected,       setConnected]       = useState(false);
  const [imagePreview,    setImagePreview]    = useState(null);
  const [lightboxSrc,     setLightboxSrc]     = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const typingTimerRef = useRef(null);
  const senderRef      = useRef('');

  // Keep senderRef in sync
  useEffect(() => { senderRef.current = sender; }, [sender]);

  // ── Socket lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    if (socket.connected) setConnected(true);

    socket.on('chat history', (history) => setMessages(history));

    socket.on('chat message', (data) => {
      setMessages(prev => [...prev, { ...data, seen: false }]);
      if (data.sender !== senderRef.current && Notification.permission === 'granted') {
        new Notification(`${data.sender}`, {
          body: data.message || 'Sent an image',
          silent: true,
        });
      }
    });

    socket.on('typing', (data) => {
      if (data.sender !== senderRef.current) {
        setTypingUsers(prev =>
          prev.includes(data.sender) ? prev : [...prev, data.sender]
        );
      }
    });

    socket.on('stop typing', (data) => {
      const name = typeof data === 'string' ? data : data?.sender;
      setTypingUsers(prev => prev.filter(u => u !== name));
    });

    socket.on('user list', (users) => setOnlineUsers(users));

    // Paste-to-send image
    const handlePaste = (e) => {
      for (const item of e.clipboardData.items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (ev) => setImagePreview(ev.target.result);
          reader.readAsDataURL(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('chat history');
      socket.off('chat message');
      socket.off('typing');
      socket.off('stop typing');
      socket.off('user list');
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  // ── Auto scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    socket.emit('read', { reader: sender });
  }, [messages]);

  // ── Notification permission ─────────────────────────────────────────────────
  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  // ── Name submit ─────────────────────────────────────────────────────────────
  const handleNameSubmit = (name) => {
    setSender(name);
    setNameReady(true);
    sessionStorage.setItem('gc_sender', name);
    sessionStorage.setItem('gc_time', Date.now());
    socket.emit('join', name);
    socket.emit('chat history');
  };

  // Check session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('gc_sender');
    const storedTime = sessionStorage.getItem('gc_time');
    if (stored && storedTime && Date.now() - Number(storedTime) < 30 * 60 * 1000) {
      handleNameSubmit(stored);
    }
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback((e) => {
    e?.preventDefault();

    if (imagePreview) {
      socket.emit('chat message', {
        sender,
        image: imagePreview,
        time: formatTime(),
        seen: false,
      });
      setImagePreview(null);
      return;
    }

    if (!message.trim()) return;
    socket.emit('chat message', {
      sender,
      message: message.trim(),
      time: formatTime(),
      seen: false,
    });
    setMessage('');
    clearTimeout(typingTimerRef.current);
    socket.emit('stop typing', sender);
  }, [message, sender, imagePreview]);

  // ── Typing indicators ────────────────────────────────────────────────────────
  const handleTyping = (e) => {
    const val = e.target.value;
    setMessage(val);
    socket.emit('typing', { sender, text: val });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('stop typing', sender);
    }, 1500);
  };

  // ── File input for images ────────────────────────────────────────────────────
  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape' && imagePreview) setImagePreview(null);
  };

  const typingLabel = typingUsers.length === 1
    ? `${typingUsers[0]} is typing…`
    : typingUsers.length > 1
    ? `${typingUsers.slice(0, 2).join(', ')} are typing…`
    : '';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Name modal */}
      {!nameReady && <NameModal onSubmit={handleNameSubmit} />}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="Full" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl" />
        </div>
      )}

      {/* App shell */}
      <div className="fixed inset-0 flex items-center justify-center bg-[#0d0e1a]">
        <div className="relative w-full h-full md:max-w-5xl md:h-[90vh] md:rounded-2xl flex overflow-hidden shadow-2xl border border-white/5">

          {/* ── Sidebar overlay for mobile ───────────────────────────────────── */}
          {showSidebar && (
            <div
              className="fixed inset-0 z-30 bg-black/60 md:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* ── Sidebar ──────────────────────────────────────────────────────── */}
          <aside
            className={`
              absolute md:static inset-y-0 left-0 z-40
              w-72 flex flex-col bg-[#161728] border-r border-white/5
              transform transition-transform duration-300 ease-in-out
              ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-lg tracking-tight">GroupChat</span>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="md:hidden text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Current user */}
            <div className="px-5 py-4 border-b border-white/5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">You</p>
              <div className="flex items-center gap-3">
                <Avatar name={sender} />
                <div>
                  <p className="text-white font-semibold text-sm">{sender}</p>
                  <p className="text-xs text-emerald-400">Active now</p>
                </div>
              </div>
            </div>

            {/* Online users */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Online — {onlineUsers.length}
                </p>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="flex flex-col gap-2">
                {onlineUsers.map((user, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition group"
                  >
                    <div className="relative">
                      <Avatar name={user} size={9} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#161728]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{user}</p>
                      <p className="text-xs text-slate-500">Online</p>
                    </div>
                  </div>
                ))}
                {onlineUsers.length === 0 && (
                  <p className="text-slate-600 text-sm text-center py-4">No one online yet</p>
                )}
              </div>
            </div>
          </aside>

          {/* ── Main chat ────────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#13141f]">

            {/* Top bar */}
            <header className="flex items-center gap-3 px-4 py-4 border-b border-white/5 bg-[#161728]">
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-white/5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>

              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-white font-semibold text-base leading-tight">Group Chat</h1>
                <p className="text-xs text-slate-500 truncate">
                  {typingLabel || `${onlineUsers.length} member${onlineUsers.length !== 1 ? 's' : ''} online`}
                </p>
              </div>

              {/* Connection badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                {connected ? 'Live' : 'Offline'}
              </div>
            </header>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1 scroll-smooth" id="msg-list">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center select-none">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-slate-600 text-sm">No messages yet. Say hello!</p>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isMe = msg.sender === sender;
                const prevMsg = messages[idx - 1];
                const showAvatar = !isMe && msg.sender !== prevMsg?.sender;
                const showSenderName = !isMe && showAvatar;

                return (
                  <div
                    key={idx}
                    className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${idx > 0 && msg.sender === prevMsg?.sender ? 'mt-0.5' : 'mt-3'}`}
                  >
                    {/* Avatar placeholder to keep alignment */}
                    {!isMe && (
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && <Avatar name={msg.sender} size={8} />}
                      </div>
                    )}

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[60%]`}>
                      {showSenderName && (
                        <p className="text-xs font-semibold mb-1 px-1" style={{ color: getAvatarColor(msg.sender) }}>
                          {msg.sender}
                        </p>
                      )}
                      <div
                        className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm'
                            : 'bg-[#1e1f2e] text-slate-200 border border-white/5 rounded-bl-sm'
                        }`}
                      >
                        {msg.message && <p className="break-words">{msg.message}</p>}
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="shared"
                            onClick={() => setLightboxSrc(msg.image)}
                            className="rounded-lg max-w-xs cursor-zoom-in mt-1 hover:opacity-90 transition"
                          />
                        )}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] text-slate-600">{msg.time}</span>
                        {isMe && (
                          <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing bubble */}
              {typingLabel && (
                <div className="flex items-end gap-2 mt-3">
                  <div className="w-8 flex-shrink-0" />
                  <div className="bg-[#1e1f2e] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    {[0,1,2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Image preview banner */}
            {imagePreview && (
              <div className="mx-4 mb-2 rounded-xl bg-[#1e1f2e] border border-white/10 p-3 flex items-center gap-3">
                <img src={imagePreview} alt="preview" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Image ready to send</p>
                  <p className="text-slate-500 text-xs mt-0.5">Press Enter or click send</p>
                </div>
                <button
                  onClick={() => setImagePreview(null)}
                  className="text-slate-500 hover:text-white transition p-1.5 rounded-lg hover:bg-white/5 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Input bar */}
            <div className="px-4 pb-4 pt-2 bg-[#161728] border-t border-white/5">
              <div className="flex items-center gap-2 bg-[#1e1f2e] border border-white/10 rounded-2xl px-3 py-2 focus-within:border-indigo-500/50 transition">
                {/* File attach */}
                <label className="cursor-pointer text-slate-500 hover:text-indigo-400 transition p-1.5 rounded-lg hover:bg-white/5 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
                </label>

                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  placeholder={imagePreview ? 'Image attached — press Enter to send' : 'Message the group…'}
                  className="flex-1 bg-transparent text-white placeholder-slate-600 text-sm focus:outline-none py-1 min-w-0"
                  disabled={!!imagePreview}
                />

                <button
                  onClick={sendMessage}
                  disabled={!message.trim() && !imagePreview}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-700 mt-2 select-none">
                Paste an image · Enter to send · Esc to cancel
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
