"use client";

import React, { useEffect, useState } from 'react';
import { Send, ChevronLeft, MessageSquare, Search } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'admin' | 'client';
  text: string;
  timestamp: string;
}

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  initial: string;
  projectName: string;
}

interface ClientApiRecord {
  id: number;
  fullname: string;
  email: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

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
        const response = await fetch(`${API_URL}/auth/clients`);
        const result: { success: boolean; users?: ClientApiRecord[]; message?: string } = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load clients.');
        }

        setClients((result.users ?? []).map((client) => ({
          id: String(client.id),
          name: formatClientName(client.fullname),
          email: client.email,
          initial: client.fullname.trim().charAt(0).toUpperCase() || 'C',
          projectName: 'New client account',
        })));
      } catch (err) {
        setClientsError(err instanceof Error ? err.message : 'Unable to load clients.');
      }
    };

    loadClients();
  }, []);

  // --- ACTIVE CHAT STATE ---
  // Default to null on initial load so chat only appears when "View Chat" is clicked
  const [activeChatClient, setActiveChatClient] = useState<ClientProfile | null>(null);
  
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({
    c1: [
      { id: "m1", sender: "client", text: "Hi admin, any updates on Project #1302?", timestamp: "10:14 AM" },
      { id: "m2", sender: "admin", text: "Hello John! We've started prepping the leather materials today.", timestamp: "10:16 AM" }
    ]
  });
  const [newMessageText, setNewMessageText] = useState("");

  // --- HANDLERS ---
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeChatClient) return;

    const clientId = activeChatClient.id;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "admin",
      text: newMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => ({
      ...prev,
      [clientId]: [...(prev[clientId] || []), newMsg]
    }));

    setNewMessageText("");
  };

  return (
    <div className="w-full h-[calc(100vh-6rem)] flex flex-col space-y-4">
      
      {/* 1. TOP DIRECTORY BLUE HEADER BANNER (Chevron icon removed) */}
      <div className="bg-[#0070c0] text-white rounded-2xl p-4 sm:p-5 shadow-md flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif tracking-tight">Client Directory</h2>
          <p className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-blue-100 opacity-90 mt-0.5">
            Active Partners & Communications
          </p>
        </div>
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
                    <div className="w-11 h-11 rounded-full bg-[#82c0e7] text-[#102243] font-bold text-base flex items-center justify-center shrink-0 shadow-inner">
                      {client.initial}
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
              </div>

              {/* CHAT MESSAGES BODY */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/60 min-h-0">
                {(messages[activeChatClient.id] || []).map((msg) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[9px] font-bold text-slate-400 mb-1 px-1">
                        {isAdmin ? 'You (Admin)' : activeChatClient.name}
                      </span>
                      <div 
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs shadow-sm ${
                          isAdmin 
                            ? 'bg-[#0070c0] text-white rounded-br-none' 
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })}
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
                  className="p-2.5 bg-[#0070c0] hover:bg-[#102243] text-white rounded-xl transition border-none cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* EMPTY STATE UNTIL "VIEW CHAT" IS CLICKED */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p className="text-xs font-serif italic">Select "View Chat" next to a client to open project communications.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
