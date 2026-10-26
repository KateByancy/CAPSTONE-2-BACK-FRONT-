"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ChatClientAvatar from '@/components/ChatClientAvatar';
import useChatScroll from '@/components/useChatScroll';
import { Send, ChevronDown, ChevronLeft, MessageSquare, Search, Trash2 } from 'lucide-react';
import { apiFetch, getApiUrl } from '@/lib/api';
import Link from 'next/link';

interface PortfolioItem {
  id?: number | string;
  title: string;
  image: string;
}

interface ChatMessage {
  id: string;
  sender: 'admin' | 'client' | 'bot';
  text: string;
  timestamp: string;
  portfolio?: PortfolioItem[];
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
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const deletedClientIds = useRef(new Set<string>());
  const [searchQuery, setSearchQuery] = useState('');

  // --- ACTIVE CHAT STATE ---
  const [activeChatClient, setActiveChatClient] = useState<ClientProfile | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [newMessageText, setNewMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const openedClient = useRef('');

  const searchTerms = searchQuery.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const filteredClients = clients.filter(client => {
    const searchable = (client.name + ' ' + client.email).toLocaleLowerCase().replace(/,/g, '');
    return searchTerms.every(term => searchable.includes(term.replace(/,/g, '')));
  });

  useEffect(() => {
    const loadClients = async () => {
      try {
        const response = await apiFetch(`${getApiUrl()}/auth/clients`, { headers:{ Authorization:`Bearer ${localStorage.getItem('adminToken') || ''}` } });
        const result: { success: boolean; users?: ClientApiRecord[]; message?: string } = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load clients.');
        }

        const loadedClients = (result.users ?? []).filter(client => !deletedClientIds.current.has(String(client.id))).map((client) => ({
          id: String(client.id),
          name: formatClientName(client.fullname),
          email: client.email,
          initial: client.fullname.trim().charAt(0).toUpperCase() || 'C',
          projectName: 'Registered client',
          isOnline: Boolean(client.is_online),
        })).sort((first, second) => Number(second.isOnline) - Number(first.isOnline));
        setClients(loadedClients);
        setActiveChatClient(current => {
          if (current && loadedClients.some(c => c.id === current.id)) return current;
          const requested = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('client') : null;
          return loadedClients.find(c => c.id === requested) || loadedClients[0] || null;
        });
      } catch (err) {
        setClientsError(err instanceof Error ? err.message : 'Unable to load clients.');
      }
    };

    void loadClients();
    const timer = window.setInterval(() => void loadClients(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const requested = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('client') : null;
    if (!requested || openedClient.current === requested) return;
    const client = clients.find(row => row.id === requested);
    if (client) {
      openedClient.current = requested;
      queueMicrotask(() => setActiveChatClient(client));
    }
  }, [clients]);

  const { feedRef, onScroll, showLatestButton, scrollToLatest } = useChatScroll(messages, activeChatClient?.id || '');
  const conversationRequestRef = useRef(0);

  const loadConversation = useCallback(async (clientId: string) => {
    const requestId = ++conversationRequestRef.current;
    const response = await apiFetch(`${getApiUrl()}/chat/${clientId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}` } });
    const result: unknown = await response.json();
    if (!response.ok) {
      const message = typeof result === 'object' && result !== null && 'message' in result
        ? String(result.message)
        : 'Unable to load this conversation.';
      throw new Error(message);
    }
    if (!Array.isArray(result)) throw new Error('The conversation response has an invalid format.');
    const rows = result as Array<{id:number;sender:'admin'|'client'|'bot';message:string;created_at:string;portfolio?:PortfolioItem[]}>;
    if (requestId !== conversationRequestRef.current) return;
    setMessages(prev => ({ ...prev, [clientId]: rows.map(row => {
      const sender = String(row.sender).trim().toLowerCase();
      return { id:String(row.id), sender:(sender === 'admin' ? 'admin' : sender === 'bot' ? 'bot' : 'client') as ChatMessage['sender'], text:row.message, timestamp:new Date(row.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), portfolio: row.portfolio };
    }) }));
  }, []);

  useEffect(() => {
    if (!activeChatClient) return;
    const clientId = activeChatClient.id;
    void loadConversation(clientId).catch(() => setClientsError('Unable to load this conversation.'));
    const timer = window.setInterval(() => void loadConversation(clientId).catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, [activeChatClient, loadConversation]);


  async function deleteClient(client: ClientProfile) {
    if (deletingClientId || !window.confirm(`Delete ${client.name}'s account? Clients with booking history cannot be deleted.`)) return;
    setDeletingClientId(client.id); setClientsError('');
    try {
      const response = await apiFetch(`${getApiUrl()}/auth/clients/${client.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to delete client.');
      deletedClientIds.current.add(client.id);
      setClients(current => current.filter(item => item.id !== client.id));
      if (activeChatClient?.id === client.id) { conversationRequestRef.current++; setActiveChatClient(null); }
      setMessages(current => { const next = { ...current }; delete next[client.id]; return next; });
    } catch (error) { setClientsError(error instanceof Error ? error.message : 'Unable to delete client.'); }
    finally { setDeletingClientId(null); }
  }

  // --- HANDLERS ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeChatClient || isSending) return;

    const clientId = activeChatClient.id;
    const text = newMessageText.trim();
    const draft = newMessageText;
    let messageSent = false;
    setNewMessageText('');
    setIsSending(true);
    setClientsError('');
    try {
      const response = await apiFetch(`${getApiUrl()}/chat`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('adminToken') || ''}`}, body:JSON.stringify({user_id:Number(clientId),sender:'admin',message:text,human_only:true}) });
      if (!response.ok) throw new Error('Unable to send message.');
      messageSent = true;
      const result = await response.json();
      if (result.notificationWarning) setClientsError(result.notificationWarning);
      await loadConversation(clientId);
    } catch (error) {
      if (!messageSent) setNewMessageText(current => current || draft);
      setClientsError(error instanceof Error ? error.message : 'Unable to send message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-6rem)] flex flex-col space-y-4">

      {/* 1. TOP DIRECTORY BLUE HEADER BANNER (Chevron icon removed) */}
      <div className="bg-marc-charcoal text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif tracking-tight">Client Directory</h2>
          <p className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-brand-100 opacity-90 mt-0.5">
            Active Partners & Communications
          </p>
        </div>
        <Link href="/admin/dashboard" className="min-h-11 shrink-0 hidden md:inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition"><ChevronLeft className="w-4 h-4"/>Overview</Link>
      </div>

      {/* 2. RESPONSIVE WEB APP CONTAINER GRID */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0 pb-6">

        {/* LEFT PANEL: CLIENT DIRECTORY LIST */}
        <div className={`md:col-span-5 bg-white rounded-2xl border border-stone-200/80 shadow-sm flex flex-col min-h-0 overflow-hidden ${
          activeChatClient ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-3.5 border-b border-stone-100 bg-stone-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search active clients..."
                aria-label="Search clients by name or email"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-600 transition text-stone-800"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {clientsError && (
              <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{clientsError}</p>
            )}
            {!clientsError && clients.length === 0 && (
              <p className="p-3 text-xs text-stone-500">No registered clients yet.</p>
            )}
            {!clientsError && clients.length > 0 && filteredClients.length === 0 && (
              <p role="status" className="p-3 text-xs text-stone-500">No clients match your search.</p>
            )}
            {filteredClients.map((client) => {
              const isSelected = activeChatClient?.id === client.id;
              return (
                <div
                  key={client.id}
                  onClick={() => setActiveChatClient(client)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-marc-panel border-brand-600/30 shadow-sm'
                      : 'bg-white border-stone-100 hover:bg-stone-50'
                  }`}
                >
                  {/* Avatar & Client Info */}
                  <div className="flex min-w-0 items-center space-x-3">
                    <div className="relative w-11 h-11 rounded-full bg-brand-300 text-marc-charcoal font-bold text-base flex items-center justify-center shrink-0 shadow-inner">
                      {client.initial}
                      <span title={client.isOnline ? 'Online' : 'Offline'} className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${client.isOnline ? 'bg-emerald-500' : 'bg-stone-400 shadow-inner'}`} />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-xs sm:text-sm font-bold text-stone-900 font-serif truncate">{client.name}</h3>
                      <p className="text-[11px] text-stone-500 truncate">{client.email}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                  {/* View Chat Link */}
                  <button
                    onClick={() => setActiveChatClient(client)}
                    className="text-xs font-bold text-stone-700 hover:text-brand-600 hover:underline bg-transparent border-none cursor-pointer transition shrink-0 pl-2"
                  >
                    View Chat
                  </button>
                  <button type="button" disabled={deletingClientId !== null} onClick={() => void deleteClient(client)} aria-label={`Delete ${client.name}`} title="Delete client" className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: CHAT WINDOW */}
        <div className={`md:col-span-7 bg-white rounded-2xl border border-stone-200/80 shadow-sm flex-col overflow-hidden ${
          activeChatClient ? 'flex' : 'hidden md:flex'
        }`}>
          {activeChatClient ? (
            <>
              {/* CHAT HEADER WITH BACK CHEVRON */}
              <div className="bg-marc-charcoal text-white p-3.5 sm:p-4 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {/* Back Chevron Button */}
                  <button
                    onClick={() => setActiveChatClient(null)}
                    title="Back to Client Directory"
                    className="p-1 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition border-none bg-transparent cursor-pointer flex items-center"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <ChatClientAvatar key={activeChatClient.id} clientId={activeChatClient.id} initial={activeChatClient.initial} name={activeChatClient.name} />
                  <div>
                    <h4 className="text-sm font-bold leading-tight">{activeChatClient.name}</h4>
                    <p className="text-[10px] text-brand-100 font-mono">{activeChatClient.projectName}</p>
                  </div>
                </div>
              </div>

              {/* CHAT MESSAGES BODY */}
              <div className="relative flex-1 min-h-0">
              <div ref={feedRef} onScroll={onScroll} className="h-full p-4 pb-6 overflow-y-auto overscroll-contain space-y-3 bg-stone-50/60">
                {(messages[activeChatClient.id] || []).length === 0 && (
                  <div className="flex h-full min-h-48 flex-col items-center justify-center text-center text-stone-400">
                    <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
                    <p className="text-xs font-bold text-stone-500">No messages yet</p>
                    <p className="mt-1 text-[10px]">Start a conversation with {activeChatClient.name}.</p>
                  </div>
                )}
                {(messages[activeChatClient.id] || []).map((msg) => {
                  const isAdmin = msg.sender === 'admin';
                  const isBot = msg.sender === 'bot';
                  if (isBot) return (
                    <div key={msg.id} className="flex justify-center py-1">
                      <div className="max-w-[85%] rounded-2xl border border-stone-200 bg-stone-100 p-3 text-[11px] text-stone-600">
                        <p><span className="font-bold text-brand-700">Design Assistant:</span> {msg.text}</p>
                        {msg.portfolio && msg.portfolio.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {msg.portfolio.map(item => (
                              <div key={item.id} className="rounded-lg border border-stone-200 bg-white p-1 text-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.image} alt={item.title} className="h-16 w-full object-contain rounded" />
                                <span className="block mt-1 text-[9px] font-medium text-stone-700 truncate">{item.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                  return (
                    <div
                      key={msg.id}
                      className={`flex w-full flex-row gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${isAdmin ? 'order-2 bg-marc-charcoal text-white' : 'order-1 bg-stone-200 text-stone-700'}`}>
                        {isAdmin ? 'A' : activeChatClient.initial}
                      </div>
                      <div className={`flex max-w-[85%] flex-col ${isAdmin ? 'order-1 items-end' : 'order-2 items-start'}`}>
                        <span className="mb-1 px-1 text-[9px] font-bold text-stone-500">{isAdmin ? 'Admin · Sender' : `${activeChatClient.name} · Client`}</span>
                        <div className={`min-w-0 rounded-2xl p-3 text-xs shadow-sm ${isAdmin ? 'rounded-br-none bg-marc-charcoal text-white' : 'rounded-bl-none border border-stone-200/80 bg-white text-stone-800'}`}>
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>
                        <span className="mt-1 px-1 text-[9px] font-mono text-stone-400">{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                })}

              </div>

              {showLatestButton && (
          <button type="button" onClick={scrollToLatest} aria-label="Go to latest messages" title="Go to latest messages" className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-brand-600 shadow-lg hover:bg-brand-50 transition cursor-pointer">
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
              </div>

              {/* CHAT INPUT FOOTER */}
              {clientsError && <p role="alert" className="shrink-0 bg-rose-50 px-3 py-2 text-xs text-rose-700">{clientsError}</p>}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-stone-200/80 flex items-center space-x-2 shrink-0">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type a message regarding the project..."
                  className="flex-1 text-xs bg-stone-100 border border-stone-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-600 transition text-stone-800"
                />
                <button
                  type="submit"
                  disabled={isSending || !newMessageText.trim()}
                  className="p-2.5 bg-marc-charcoal hover:bg-marc-charcoal text-white rounded-xl transition border-none cursor-pointer flex items-center justify-center shrink-0 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message as admin"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* EMPTY STATE UNTIL A CLIENT IS SELECTED */
            <div className="h-full flex flex-col justify-between">
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400 space-y-2">
                <MessageSquare className="w-8 h-8 opacity-40" />
                <p className="text-xs font-serif italic">{clients.length ? 'Choose a client to view project communications and reply.' : 'No registered clients yet.'}</p>
              </div>
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-stone-200/80 flex items-center space-x-2 shrink-0">
                <input
                  type="text"
                  disabled={!activeChatClient}
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={clients.length ? 'Select a client to send a reply...' : 'No clients available to message'}
                  className="flex-1 text-xs bg-stone-100 border border-stone-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-600 transition text-stone-800 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={true}
                  className="p-2.5 bg-marc-charcoal text-white rounded-xl transition border-none cursor-not-allowed flex items-center justify-center shrink-0 shadow-sm opacity-50"
                  aria-label="Send message as admin"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
