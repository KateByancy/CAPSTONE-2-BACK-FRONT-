"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, ChevronLeft, MessageSquare, Search } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  sender: 'admin' | 'client' | 'bot';
  text: string;
  timestamp: string;
}

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  initial: string;
  projectName: string;
  isOnline: boolean;
}

interface ClientApiRecord {
  id: number;
  fullname: string;
  email: string;
  is_online: number | boolean;
}

const formatClientName = (fullName: string) => {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length < 2) return nameParts[0] || 'Unnamed Client';
  return `${nameParts.at(-1)}, ${nameParts.slice(0, -1).join(' ')}`;
};

export default function ClientsManagement() {
  // --- CLIENT LIST STATE ---
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [clientsError, setClientsError] = useState('');

  useEffect(() => {
    const loadClients = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/auth/clients`, { headers:{ Authorization:`Bearer ${localStorage.getItem('adminToken') || ''}` } });
        const result: { success: boolean; users?: ClientApiRecord[]; message?: string } = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load clients.');
        }

        setClients((result.users ?? []).map((client) => ({
          id: String(client.id),
          name: formatClientName(client.fullname),
          email: client.email,
          initial: client.fullname.trim().charAt(0).toUpperCase() || 'C',
          projectName: 'Registered client',
          isOnline: Boolean(client.is_online),
        })).sort((first, second) => Number(second.isOnline) - Number(first.isOnline)));
      } catch (err) {
        setClientsError(err instanceof Error ? err.message : 'Unable to load clients.');
      }
    };

    void loadClients();
    const timer = window.setInterval(() => void loadClients(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  // --- ACTIVE CHAT STATE ---
  // Default to null on initial load so chat only appears when "View Chat" is clicked
  const [activeChatClient, setActiveChatClient] = useState<ClientProfile | null>(null);
  
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [newMessageText, setNewMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const conversationRequestRef = useRef(0);

  const loadConversation = useCallback(async (clientId: string) => {
    const requestId = ++conversationRequestRef.current;
    const response = await fetch(`${getApiUrl()}/chat/${clientId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}` } });
    const result: unknown = await response.json();
    if (!response.ok) {
      const message = typeof result === 'object' && result !== null && 'message' in result
        ? String(result.message)
        : 'Unable to load this conversation.';
      throw new Error(message);
    }
    if (!Array.isArray(result)) throw new Error('The conversation response has an invalid format.');
    const rows = result as Array<{id:number;sender:'admin'|'client'|'bot';message:string;created_at:string}>;
    if (requestId !== conversationRequestRef.current) return;
    setMessages(prev => ({ ...prev, [clientId]: rows.map(row => {
      const sender = String(row.sender).trim().toLowerCase();
      return { id:String(row.id), sender:(sender === 'admin' ? 'admin' : sender === 'bot' ? 'bot' : 'client') as ChatMessage['sender'], text:row.message, timestamp:new Date(row.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) };
    }) }));
  }, []);

  useEffect(() => {
    if (!activeChatClient) return;
    const clientId = activeChatClient.id;
    void loadConversation(clientId).catch(() => setClientsError('Unable to load this conversation.'));
    const timer = window.setInterval(() => void loadConversation(clientId).catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, [activeChatClient, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth', block:'end' });
  }, [messages, activeChatClient]);

  // --- HANDLERS ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeChatClient) return;

    const clientId = activeChatClient.id;
    const text = newMessageText.trim();
    setIsSending(true);
    setClientsError('');
    try {
      const response = await fetch(`${getApiUrl()}/chat`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('adminToken') || ''}`}, body:JSON.stringify({user_id:Number(clientId),sender:'admin',message:text}) });
      if (!response.ok) throw new Error('Unable to send message.');
      setNewMessageText('');
      await loadConversation(clientId);
    } catch (error) {
      setClientsError(error instanceof Error ? error.message : 'Unable to send message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-6rem)] flex flex-col space-y-4">
      
      {/* 1. TOP DIRECTORY BLUE HEADER BANNER (Chevron icon removed) */}
      <div className="bg-[#0070c0] text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif tracking-tight">Client Directory</h2>
          <p className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-blue-100 opacity-90 mt-0.5">
            Active Partners & Communications
          </p>
        </div>
        <Link href="/admin/dashboard" className="min-h-11 shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition"><ChevronLeft className="w-4 h-4"/>Overview</Link>
      </div>

      {/* 2. RESPONSIVE WEB APP CONTAINER GRID */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0 pb-6">
        
        {/* LEFT PANEL: CLIENT DIRECTORY LIST */}
        <div className={`md:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col min-h-0 overflow-hidden ${
          activeChatClient ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Search active clients..." 
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0070c0] transition text-slate-800"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {clientsError && (
              <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{clientsError}</p>
            )}
            {!clientsError && clients.length === 0 && (
              <p className="p-3 text-xs text-slate-500">No registered clients yet.</p>
            )}
            {clients.map((client) => {
              const isSelected = activeChatClient?.id === client.id;
              return (
                <div 
                  key={client.id}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected 
                      ? 'bg-[#f0f6fc] border-[#0070c0]/30 shadow-sm' 
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {/* Avatar & Client Info */}
                  <div className="flex items-center space-x-3">
                    <div className="relative w-11 h-11 rounded-full bg-[#82c0e7] text-[#102243] font-bold text-base flex items-center justify-center shrink-0 shadow-inner">
                      {client.initial}
                      <span title={client.isOnline ? 'Online' : 'Offline'} className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${client.isOnline ? 'bg-emerald-500' : 'bg-slate-400 shadow-inner'}`} />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-serif truncate">{client.name}</h3>
                      <p className="text-[11px] text-slate-500 truncate">{client.email}</p>
                    </div>
                  </div>

                  {/* View Chat Link */}
                  <button
                    onClick={() => setActiveChatClient(client)}
                    className="text-xs font-bold text-slate-700 hover:text-[#0070c0] hover:underline bg-transparent border-none cursor-pointer transition shrink-0 pl-2"
                  >
                    View Chat
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: CHAT WINDOW */}
        <div className={`md:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex-col overflow-hidden ${
          activeChatClient ? 'flex' : 'hidden md:flex'
        }`}>
          {activeChatClient ? (
            <>
              {/* CHAT HEADER WITH BACK CHEVRON */}
              <div className="bg-[#0070c0] text-white p-3.5 sm:p-4 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {/* Back Chevron Button */}
                  <button 
                    onClick={() => setActiveChatClient(null)}
                    title="Back to Client Directory"
                    className="p-1 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition border-none bg-transparent cursor-pointer flex items-center"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="w-9 h-9 rounded-full bg-white/20 font-bold text-white text-sm flex items-center justify-center shrink-0">
                    {activeChatClient.initial}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold leading-tight">{activeChatClient.name}</h4>
                    <p className="text-[10px] text-blue-100 font-mono">{activeChatClient.projectName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#0070c0]">A</div>
                  <div className="hidden text-left sm:block">
                    <p className="text-[10px] font-black leading-none">Admin</p>
                    <p className="mt-1 text-[9px] text-blue-100">Online</p>
                  </div>
                </div>
              </div>

              {/* CHAT MESSAGES BODY */}
              <div className="flex-1 p-4 pb-6 overflow-y-auto space-y-3 bg-slate-50/60 min-h-0">
                {(messages[activeChatClient.id] || []).length === 0 && (
                  <div className="flex h-full min-h-48 flex-col items-center justify-center text-center text-slate-400">
                    <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
                    <p className="text-xs font-bold text-slate-500">No messages yet</p>
                    <p className="mt-1 text-[10px]">Start a conversation with {activeChatClient.name}.</p>
                  </div>
                )}
                {(messages[activeChatClient.id] || []).map((msg) => {
                  const isAdmin = msg.sender === 'admin';
                  const isBot = msg.sender === 'bot';
                  if (isBot) return (
                    <div key={msg.id} className="flex justify-center py-1">
                      <div className="max-w-[80%] rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-center text-[10px] text-slate-500">
                        <span className="font-bold">Design Assistant:</span> {msg.text}
                      </div>
                    </div>
                  );
                  return (
                    <div 
                      key={msg.id}
                      className={`flex w-full flex-row gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${isAdmin ? 'order-2 bg-[#0070c0] text-white' : 'order-1 bg-slate-200 text-slate-700'}`}>
                        {isAdmin ? 'A' : activeChatClient.initial}
                      </div>
                      <div className={`flex max-w-[85%] flex-col ${isAdmin ? 'order-1 items-end' : 'order-2 items-start'}`}>
                        <span className="mb-1 px-1 text-[9px] font-bold text-slate-500">{isAdmin ? 'Admin · Sender' : `${activeChatClient.name} · Client`}</span>
                        <div className={`min-w-0 rounded-2xl p-3 text-xs shadow-sm ${isAdmin ? 'rounded-br-none bg-[#0070c0] text-white' : 'rounded-bl-none border border-slate-200/80 bg-white text-slate-800'}`}>
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>
                        <span className="mt-1 px-1 text-[9px] font-mono text-slate-400">{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} className="h-px" />
              </div>

              {/* CHAT INPUT FOOTER */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200/80 flex items-center space-x-2 shrink-0">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type a message regarding the project..."
                  className="flex-1 text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#0070c0] transition text-slate-800"
                />
                <button
                  type="submit"
                  disabled={isSending || !newMessageText.trim()}
                  className="p-2.5 bg-[#0070c0] hover:bg-[#102243] text-white rounded-xl transition border-none cursor-pointer flex items-center justify-center shrink-0 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message as admin"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* EMPTY STATE UNTIL "VIEW CHAT" IS CLICKED */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p className="text-xs font-serif italic">Select &quot;View Chat&quot; next to a client to open project communications.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
