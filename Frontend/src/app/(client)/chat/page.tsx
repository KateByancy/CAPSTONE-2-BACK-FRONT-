// src/components/Chat.tsx
"use client";
import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Bot, UserRound } from 'lucide-react';
import { getApiUrl, getClientSession } from '@/lib/api';

interface PortfolioImage { id: number; title: string; image: string; }
interface ChatMessage { id: number; text: string; isMe: boolean; sender: string; portfolio?: PortfolioImage[]; }

export default function Chat() {
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [adminOnline, setAdminOnline] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${localStorage.getItem('clientToken') || ''}` };
    for (const [role, path] of [['client', '/profile/me/avatar'], ['admin', '/profile/chat/admin-avatar']]) {
      void fetch(getApiUrl() + path, { headers, signal: controller.signal }).then(async response => {
        if (!response.ok) return;
        const blob = await response.blob();
        if (!active) return;
        const url = URL.createObjectURL(blob); urls.push(url);
        setAvatars(current => ({ ...current, [role]: url }));
      }).catch(() => undefined);
    }
    return () => { active = false; controller.abort(); urls.forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  const loadMessages = async () => {
    const client = getClientSession();
    if (!client) return;
    const response = await fetch(`${getApiUrl()}/chat/${client.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("clientToken") || ""}` } });
    const result: Array<{ id: number; message: string; sender: string; portfolio?: PortfolioImage[] }> = await response.json();
    if (!response.ok) throw new Error('Unable to load messages.');
    setMessages(result.map((message) => ({ id: message.id, text: message.message, isMe: message.sender === 'client', sender: message.sender, portfolio: message.portfolio })));
  };

  useEffect(() => {
    void loadMessages().catch((err) => setError(err.message));
    const timer = window.setInterval(() => void loadMessages().catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadResponderStatus = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/chat/admin-status`, { headers: { Authorization: `Bearer ${localStorage.getItem("clientToken") || ""}` } });
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
    if (!input.trim() || isSending) return;
    
    const client = getClientSession();
    if (!client) { setError('Please sign in again before sending a message.'); return; }
    setIsSending(true);
    setError('');
    try {
      const response = await fetch(`${getApiUrl()}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('clientToken') || ''}` },
        body: JSON.stringify({ user_id: client.id, sender: 'client', message: input.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to send message.');
      setInput('');
      await loadMessages();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to send message.'); } finally { setIsSending(false); }
  };

  return (
    <div className="flex flex-col h-[670px] bg-slate-50 animate-fadeIn">
      {/* Mini Title Section */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs font-bold tracking-wider text-slate-500">
        <div className="flex items-center space-x-2"><MessageSquare className="w-4 h-4 text-blue-500" /><span>DESIGN CONCIERGE</span></div>
        {adminOnline !== null && (
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
            <span className={`h-2 w-2 rounded-full ${adminOnline ? 'bg-emerald-500' : 'bg-blue-500'}`} />
            <span>{adminOnline ? 'Admin online' : 'AI assistant'}</span>
          </div>
        )}
      </div>
      {error && <p className="mx-4 mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}

      {/* Message Feed Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.isMe ? 'flex-row-reverse' : ''}`}
          >
            <div title={msg.isMe ? 'You' : msg.sender === 'bot' ? 'AI assistant' : 'Admin'} className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-600">
              {msg.sender === 'bot' ? <Bot aria-label="AI assistant" className="h-5 w-5" /> : avatars[msg.sender] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatars[msg.sender]} alt={msg.isMe ? 'Your profile picture' : 'Admin profile picture'} className="h-full w-full object-cover" onError={() => setAvatars(current => ({ ...current, [msg.sender]: '' }))} />
              ) : <UserRound aria-label={msg.isMe ? 'You' : 'Admin'} className="h-5 w-5" />}
            </div>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                msg.isMe
                  ? 'bg-[#0070c0] text-white rounded-br-none'
                  : 'bg-white text-slate-700 rounded-bl-none border border-slate-200'
              }`}
            >
              {msg.text}
              {msg.portfolio?.map(item => (
                <a key={item.id} href={item.image} target="_blank" rel="noopener noreferrer" className="mt-3 block overflow-hidden rounded-lg border border-slate-200">
                  {/* Portfolio URLs are supplied by the admin and validated by the backend. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.title || 'MARC portfolio project'} loading="lazy" className="max-h-64 w-full object-contain" />
                  <span className="block p-2 font-medium">{item.title || 'MARC portfolio project'}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
        <p role="status" className="text-xs text-slate-500">{isSending ? "Waiting for a reply..." : ""}</p>
        <div ref={messagesEndRef} />
      </div>

      {/* Interactive Chat Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
        <input
          type="text"
          maxLength={2000}
          disabled={isSending}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
        />
        <button 
          type="submit"
          disabled={isSending || !input.trim()}
          aria-label="Send message"
          className="p-2 bg-[#0070c0] hover:bg-blue-600 text-white rounded-xl transition shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
