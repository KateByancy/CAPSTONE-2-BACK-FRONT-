// src/components/Chat.tsx
"use client";
import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';

export default function Chat() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi! Welcome to MARC Custom Design support. How can we help customize your layout today?", isMe: false },
    { id: 2, text: "I filled out the estimate tool and would love to secure a consultation appointment.", isMe: true }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { id: Date.now(), text: input, isMe: true }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[670px] bg-slate-50 animate-fadeIn">
      {/* Mini Title Section */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center space-x-2 text-xs font-bold tracking-wider text-slate-500">
        <MessageSquare className="w-4 h-4 text-blue-500" />
        <span>DESIGN CONCIERGE</span>
      </div>

      {/* Message Feed Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                msg.isMe
                  ? 'bg-[#0070c0] text-white rounded-br-none'
                  : 'bg-white text-slate-700 rounded-bl-none border border-slate-200'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Chat Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
        />
        <button 
          type="submit" 
          className="p-2 bg-[#0070c0] hover:bg-blue-600 text-white rounded-xl transition shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}