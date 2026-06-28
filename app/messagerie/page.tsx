'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send, Plus, Search, MessageSquare, Users,
  RefreshCw, X, ChevronLeft, Loader2
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderType: string;
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  subject?: string;
  type: string;
  lastMessage?: Message;
  participants: { userId: string; userType: string }[];
  updatedAt: string;
}

interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  type: string;
  email: string;
}

export default function MessageriePage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [recipients, setRecipients] = useState<{ users: Recipient[]; teachers: Recipient[] }>({ users: [], teachers: [] });
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState('');
  const [firstMsg, setFirstMsg] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = authStorage.getUser();

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    loadConversations();
    loadRecipients();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const { data } = await api.get('/messaging/conversations');
      setConversations(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadRecipients = async () => {
    try {
      const { data } = await api.get('/messaging/recipients');
      setRecipients(data);
    } catch (e) { console.error(e); }
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    try {
      const { data } = await api.get(`/messaging/conversations/${conv.id}/messages`);
      setMessages(data);
    } catch (e) { console.error(e); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    setSending(true);
    try {
      const { data } = await api.post(`/messaging/conversations/${selectedConv.id}/messages`, {
        content: newMessage.trim(),
      });
      setMessages(m => [...m, data]);
      setNewMessage('');
      loadConversations();
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const createConversation = async () => {
    if (!firstMsg.trim() || selectedRecipients.length === 0) return;
    setSending(true);
    try {
      const { data } = await api.post('/messaging/conversations', {
        subject: subject.trim() || undefined,
        type: selectedRecipients.length > 1 ? 'GROUP' : 'DIRECT',
        participantIds: selectedRecipients.map(r => r.id),
        participantTypes: selectedRecipients.map(r => r.type),
        firstMessage: firstMsg.trim(),
      });
      setConversations(c => [data, ...c]);
      setShowNewConv(false);
      setSelectedRecipients([]);
      setSubject('');
      setFirstMsg('');
      selectConversation(data);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const toggleRecipient = (r: Recipient) => {
    setSelectedRecipients(prev =>
      prev.find(x => x.id === r.id) ? prev.filter(x => x.id !== r.id) : [...prev, r]
    );
  };

  const fmtTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const allRecipients = [...recipients.users, ...recipients.teachers]
    .filter(r => r.id !== user?.id)
    .filter(r => {
      const q = recipientSearch.toLowerCase();
      return !q || `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q);
    });

  const filteredConvs = conversations.filter(c => {
    const q = search.toLowerCase();
    return !q || c.subject?.toLowerCase().includes(q) ||
      c.lastMessage?.senderName?.toLowerCase().includes(q);
  });

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin', DIRECTOR: 'Directeur', CENSOR: 'Censeur',
    TEACHER: 'Enseignant', SECRETARY: 'Secrétaire', ACCOUNTANT: 'Comptable',
    CASHIER: 'Caissier', SURVEILLANT: 'Surveillant', PARENT: 'Parent',
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Messagerie" subtitle="Communication interne" />

        <div className="flex-1 flex overflow-hidden">

          {/* ── Liste conversations ── */}
          <div className={`w-80 bg-white border-r border-gray-100 flex flex-col ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
                <button onClick={() => setShowNewConv(true)}
                  className="w-9 h-9 bg-[#1B3A6B] text-white rounded-xl flex items-center justify-center hover:bg-blue-800 flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 text-sm">Aucune conversation</p>
                  <button onClick={() => setShowNewConv(true)}
                    className="mt-3 text-[#1B3A6B] text-sm font-medium hover:underline">
                    Nouveau message
                  </button>
                </div>
              ) : filteredConvs.map(conv => (
                <button key={conv.id} onClick={() => selectConversation(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedConv?.id === conv.id ? 'bg-blue-50 border-l-2 border-l-[#1B3A6B]' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-[#1B3A6B]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {conv.type === 'GROUP' || conv.type === 'BROADCAST'
                        ? <Users className="w-4 h-4 text-[#1B3A6B]" />
                        : <MessageSquare className="w-4 h-4 text-[#1B3A6B]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800 text-sm truncate">
                          {conv.subject || 'Message direct'}
                        </p>
                        {conv.lastMessage && (
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {fmtTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          <span className="font-medium">{conv.lastMessage.senderName.split(' ')[0]}</span>
                          {' : '}{conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Zone messages ── */}
          <div className={`flex-1 flex flex-col ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>
            {!selectedConv ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Sélectionnez une conversation</p>
                  <p className="text-sm mt-1">ou créez-en une nouvelle</p>
                  <button onClick={() => setShowNewConv(true)}
                    className="mt-4 bg-[#1B3A6B] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800">
                    Nouveau message
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header conversation */}
                <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                  <button onClick={() => setSelectedConv(null)} className="md:hidden text-gray-400">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 bg-[#1B3A6B]/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-[#1B3A6B]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{selectedConv.subject || 'Message direct'}</p>
                    <p className="text-xs text-gray-400">{selectedConv.participants.length} participant(s)</p>
                  </div>
                  <button onClick={() => { selectConversation(selectedConv); }}
                    className="text-gray-400 hover:text-gray-600">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                  {messages.map(msg => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          {!isMe && (
                            <span className="text-xs text-gray-400 px-1">{msg.senderName}</span>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe
                            ? 'bg-[#1B3A6B] text-white rounded-br-sm'
                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'}`}>
                            {msg.content}
                          </div>
                          <span className="text-xs text-gray-400 px-1">{fmtTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input message */}
                <div className="bg-white border-t border-gray-100 p-4">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Écrivez votre message... (Entrée pour envoyer)"
                      rows={1}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                      style={{ minHeight: '42px', maxHeight: '120px' }}
                    />
                    <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                      className="w-10 h-10 bg-[#1B3A6B] text-white rounded-xl flex items-center justify-center hover:bg-blue-800 disabled:opacity-40 flex-shrink-0">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal nouvelle conversation ── */}
      {showNewConv && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Nouveau message</h3>
              <button onClick={() => { setShowNewConv(false); setSelectedRecipients([]); }}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Destinataires */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destinataires *</label>
                {selectedRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedRecipients.map(r => (
                      <span key={r.id} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                        {r.firstName} {r.lastName}
                        <button onClick={() => toggleRecipient(r)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)}
                    placeholder="Rechercher un utilisateur..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
                <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {allRecipients.map(r => (
                    <button key={r.id} onClick={() => toggleRecipient(r)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${selectedRecipients.find(x => x.id === r.id) ? 'bg-blue-50' : ''}`}>
                      <div className="w-7 h-7 bg-[#1B3A6B]/10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#1B3A6B]">
                        {r.firstName[0]}{r.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{r.firstName} {r.lastName}</p>
                        <p className="text-xs text-gray-400">{ROLE_LABELS[r.role] ?? r.role}</p>
                      </div>
                      {selectedRecipients.find(x => x.id === r.id) && (
                        <span className="ml-auto text-blue-600">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sujet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Objet du message (optionnel)"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea value={firstMsg} onChange={e => setFirstMsg(e.target.value)}
                  placeholder="Votre message..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setShowNewConv(false); setSelectedRecipients([]); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={createConversation}
                  disabled={sending || selectedRecipients.length === 0 || !firstMsg.trim()}
                  className="flex-1 bg-[#1B3A6B] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-40 flex items-center justify-center gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}