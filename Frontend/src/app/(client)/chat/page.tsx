// src/components/Chat.tsx
"use client";
import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { getApiUrl, getClientSession } from '@/lib/api';

interface ChatMessage { id: number; text: string; isMe: boolean; }

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [adminOnline, setAdminOnline] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = async () => {
    const client = getClientSession();
    if (!client) return;
    const response = await fetch(`${getApiUrl()}/chat/${client.id}`);
    const result: Array<{ id: number; message: string; sender: string }> = await response.json();
    if (!response.ok) throw new Error('Unable to load messages.');
    setMessages(result.map((message) => ({ id: message.id, text: message.message, isMe: message.sender === 'client' })));
  };

  useEffect(() => {
    void loadMessages().catch((err) => setError(err.message));
    const timer = window.setInterval(() => void loadMessages().catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadResponderStatus = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/chat/admin-status`);
        const result = await response.json();
        if (response.ok) setAdminOnline(Boolean(result.adminOnline));
      } catch {
        setAdminOnline(false);
      }
    };
    void loadResponderStatus();
    const timer = window.setInterval(() => void loadResponderStatus(), 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const client = getClientSession();
    if (!client) { setError('Please sign in again before sending a message.'); return; }
    try {
      const response = await fetch(`${getApiUrl()}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: client.id, sender: 'client', message: input.trim() }),
      });
      if (!response.ok) throw new Error('Unable to send message.');
      setInput('');
      await loadMessages();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to send message.'); }
  };

  return (
    <div className="flex flex-col h-[670px] bg-slate-50 animate-fadeIn">
      {/* Mini Title Section */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs font-bold tracking-wider text-slate-500">
        <div className="flex items-center space-x-2"><MessageSquare className="w-4 h-4 text-blue-500" /><span>DESIGN CONCIERGE</span></div>
        {adminOnline !== null && (
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
            <span className={`h-2 w-2 rounded-full ${adminOnline ? 'bg-emerald-500' : 'bg-blue-500'}`} />
            <span>{adminOnline ? 'Admin online' : 'AI responder online'}</span>
          </div>
        )}
      </div>
      {error && <p className="mx-4 mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}

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
        <div ref={messagesEndRef} />
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
