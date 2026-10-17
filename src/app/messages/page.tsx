'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Send, 
  Heart, 
  Pencil,
  X,
  CheckCheck,
  Check,
  Loader2,
  Camera,
  ZoomIn
} from 'lucide-react';
import { useCurrentUser } from '@/components/UserContext';
import { createClient } from '@/lib/supabase/client';
import confetti from 'canvas-confetti';
import { playWhoosh, playShutter } from '@/lib/sound-effects';

interface Message {
  id: string;
  sender: 'berk' | 'jaquilyn';
  text: string;
  timestamp: string;
  created_at?: number;
  isLoveNote?: boolean;
  isEdited?: boolean;
  editedAt?: number;
  photo_url?: string | null;
}

interface PartnerPresenceState {
  is_online: boolean; // 1. Sistemde mi
  is_in_chat: boolean; // 2. Chat'te mi
  is_typing: boolean; // Typing status
  last_seen_message_id: string | null; // Read receipt
  last_seen_message_at: number | null;
}

export default function MessagesPage() {
  const { currentUser } = useCurrentUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Photo upload state
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedFullPhoto, setSelectedFullPhoto] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Active sender is the authenticated user
  const activeSender = currentUser === 'jaquilyn' ? 'jaquilyn' : 'berk';
  // Target partner
  const partnerUser = activeSender === 'berk' ? 'jaquilyn' : 'berk';
  const partnerName = activeSender === 'berk' ? 'Jaquilyn' : 'Berk';
  const partnerAvatar = activeSender === 'berk' ? '🌸' : '🦁';

  // Partner presence state
  const [partnerPresence, setPartnerPresence] = useState<PartnerPresenceState>({
    is_online: false,
    is_in_chat: false,
    is_typing: false,
    last_seen_message_id: null,
    last_seen_message_at: null,
  });

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const lastMarkedSeenIdRef = useRef<string | null>(null);

  // Supabase client instance for real-time WebSockets
  const supabase = useMemo(() => createClient(), []);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Helper to broadcast via Supabase Realtime
  const channelBroadcast = useCallback((event: string, payload: any) => {
    try {
      const channel = supabase.channel('berlyn_couple_realtime_chat');
      channel.send({
        type: 'broadcast',
        event,
        payload,
      });
    } catch (e) {
      // ignore
    }
  }, [supabase]);

  // Update presence on server & broadcast
  const updateMyPresence = useCallback(async (data: {
    in_chat?: boolean;
    is_typing?: boolean;
    last_seen_message_id?: string;
    offline?: boolean;
  }) => {
    try {
      const res = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: activeSender,
          ...data,
        }),
        keepalive: true,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.presence && json.presence[partnerUser]) {
          setPartnerPresence(json.presence[partnerUser]);
        }
      }
    } catch (err) {
      // ignore
    }
  }, [activeSender, partnerUser]);

  // Fetch presence from server
  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch('/api/presence', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.presence && json.presence[partnerUser]) {
          setPartnerPresence(json.presence[partnerUser]);
        }
      }
    } catch (err) {
      // ignore
    }
  }, [partnerUser]);

  // Fetch all persistent messages from the server
  const fetchMessages = useCallback(async (silent = false) => {
    try {
      const res = await fetch('/api/messages', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
          if (!silent) {
            setTimeout(scrollToBottom, 50);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  // Check if messages have arrived that I need to mark as seen
  useEffect(() => {
    if (messages.length === 0) return;
    const latestPartnerMsg = [...messages].reverse().find(m => m.sender === partnerUser);
    if (latestPartnerMsg && latestPartnerMsg.id !== lastMarkedSeenIdRef.current) {
      lastMarkedSeenIdRef.current = latestPartnerMsg.id;
      updateMyPresence({ in_chat: true, last_seen_message_id: latestPartnerMsg.id });
      channelBroadcast('seen_event', { user: activeSender, message_id: latestPartnerMsg.id });
    }
  }, [messages, partnerUser, activeSender, updateMyPresence, channelBroadcast]);

  useEffect(() => {
    // 1. Initial messages & presence fetch
    fetchMessages();
    fetchPresence();
    updateMyPresence({ in_chat: true });

    // 2. Realtime WebSocket subscription with Supabase broadcast channel
    const channel = supabase.channel('berlyn_couple_realtime_chat', {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (payload && payload.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
          setTimeout(scrollToBottom, 50);
          if (payload.text === '❤️') {
            confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
          }

          // If partner sent it and we are in chat, mark it as seen immediately
          if (payload.sender === partnerUser) {
            updateMyPresence({ in_chat: true, last_seen_message_id: payload.id });
            channelBroadcast('seen_event', { user: activeSender, message_id: payload.id });
          }
        }
      })
      .on('broadcast', { event: 'edit_message' }, ({ payload }) => {
        if (payload && payload.id) {
          setMessages((prev) => prev.map((m) => (m.id === payload.id ? { ...m, ...payload } : m)));
        }
      })
      .on('broadcast', { event: 'delete_message' }, ({ payload }) => {
        if (payload && payload.id) {
          setMessages((prev) => prev.filter((m) => m.id !== payload.id));
        }
      })
      .on('broadcast', { event: 'typing_event' }, ({ payload }) => {
        if (payload && payload.user === partnerUser) {
          setPartnerPresence((prev) => ({
            ...prev,
            is_typing: !!payload.is_typing,
          }));
        }
      })
      .on('broadcast', { event: 'seen_event' }, ({ payload }) => {
        if (payload && payload.user === partnerUser) {
          setPartnerPresence((prev) => ({
            ...prev,
            last_seen_message_id: payload.message_id,
            last_seen_message_at: Date.now(),
          }));
        }
      })
      .on('broadcast', { event: 'presence_event' }, ({ payload }) => {
        if (payload && payload.user === partnerUser) {
          setPartnerPresence((prev) => ({
            ...prev,
            is_online: true,
            is_in_chat: typeof payload.in_chat === 'boolean' ? payload.in_chat : prev.is_in_chat,
            last_seen_message_id: payload.last_seen_msg_id || prev.last_seen_message_id,
          }));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          channelBroadcast('presence_event', { user: activeSender, in_chat: true });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    // 3. Keep-alive polling fallback every 3.5 seconds
    const interval = setInterval(() => {
      fetchMessages(true);
      fetchPresence();
      updateMyPresence({ in_chat: document.visibilityState === 'visible' });
    }, 3500);

    // 4. Tab visibility handler
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      updateMyPresence({ in_chat: isVisible });
      channelBroadcast('presence_event', { user: activeSender, in_chat: isVisible });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updateMyPresence({ in_chat: false, is_typing: false });
      channelBroadcast('presence_event', { user: activeSender, in_chat: false });
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [supabase, activeSender, partnerUser, fetchMessages, fetchPresence, updateMyPresence, channelBroadcast]);

  // Typing event handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (!isTypingRef.current && text.trim().length > 0) {
      isTypingRef.current = true;
      updateMyPresence({ is_typing: true, in_chat: true });
      channelBroadcast('typing_event', { user: activeSender, is_typing: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      updateMyPresence({ is_typing: false, in_chat: true });
      channelBroadcast('typing_event', { user: activeSender, is_typing: false });
    }, 2500);
  };

  // Send message handler (supports both regular text and heart emoji)
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    const isHeartOnly = text === '❤️';

    // Clear typing state immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    updateMyPresence({ is_typing: false, in_chat: true });
    channelBroadcast('typing_event', { user: activeSender, is_typing: false });

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sender: activeSender,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newMsg: Message = data.message;

        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        if (!textToSend) {
          setInputText('');
        }

        setTimeout(scrollToBottom, 50);

        // Broadcast immediately over Realtime WebSocket to partner
        channelBroadcast('new_message', newMsg);
        playWhoosh();

        if (isHeartOnly) {
          confetti({ particleCount: 35, spread: 65, origin: { y: 0.7 } });
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (msg: Message) => {
    setEditingMessage(msg);
    setEditText(msg.text);
  };

  // Save edited message
  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim() || isSavingEdit) return;
    setIsSavingEdit(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMessage.id,
          text: editText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedMsg = data.message;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessage.id
              ? {
                  ...m,
                  text: editText.trim(),
                  isEdited: true,
                  editedAt: Date.now(),
                  ...(updatedMsg || {}),
                }
              : m
          )
        );
        channelBroadcast('edit_message', {
          id: editingMessage.id,
          text: editText.trim(),
          isEdited: true,
          editedAt: Date.now(),
        });
        setEditingMessage(null);
        setEditText('');
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle selecting a photo (supports iPhone HEIC, JPG, PNG, WebP)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingPhotoFile(file);
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    if (!isHeic) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }

    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Send permanent photo (converts to WebP on server)
  const handleSendPhoto = async () => {
    if (!pendingPhotoFile || isUploadingPhoto) return;
    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('file', pendingPhotoFile);
      formData.append('sender', activeSender);
      formData.append('caption', photoCaption.trim());

      const res = await fetch('/api/messages/photo', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to upload photo');

      const data = await res.json();
      const newMsg: Message = data.message;

      setMessages((prev) => [...prev, newMsg]);
      setTimeout(scrollToBottom, 50);

      channelBroadcast('new_message', newMsg);
      playShutter();

      // Reset modal state
      setPendingPhotoFile(null);
      setPhotoPreview(null);
      setPhotoCaption('');
    } catch (err) {
      console.error('Failed to send photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Determine if partner has seen the latest message sent by active user
  const lastMyMessage = useMemo(() => {
    return [...messages].reverse().find((m) => m.sender === activeSender);
  }, [messages, activeSender]);

  const isLastMessageSeen = useMemo(() => {
    if (!lastMyMessage) return false;
    if (partnerPresence.last_seen_message_id === lastMyMessage.id) return true;
    if (
      partnerPresence.last_seen_message_at &&
      lastMyMessage.created_at &&
      partnerPresence.last_seen_message_at >= lastMyMessage.created_at
    ) {
      return true;
    }
    // If partner is currently active in chat room, they see it in real-time
    if (partnerPresence.is_in_chat && isConnected) return true;
    return false;
  }, [lastMyMessage, partnerPresence, isConnected]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0a0e17] animate-fade-in">
      {/* 1. Header Bar: Private Chat Info + Realtime Partner Status Box */}
      <div className="w-full px-3 py-2 bg-[#0e1422] border-b border-white/[0.08] flex items-center justify-between gap-2 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div>
            <h1 className="text-xs font-bold text-white flex items-center gap-1.5 leading-tight">
              <span>Our Chat</span>
              <span 
                className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} 
                title={isConnected ? 'Realtime Connected' : 'Connecting...'}
              />
            </h1>
            <p className="text-[9px] text-slate-400 leading-none">
              {isConnected ? 'Realtime' : 'Connecting...'}
            </p>
          </div>
        </div>

        {/* 2. Partner Live 4-State Status Box */}
        <div className="p-1 px-2 rounded-xl bg-[#141b29] border border-white/[0.08] flex items-center gap-1.5 shrink-0">
          {/* Partner Identity Bar */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-white/[0.08]">
            <span className="text-xs">{partnerAvatar}</span>
            <span className="text-[11px] font-bold text-white">{partnerName}</span>
          </div>

          {/* 4 Net States */}
          <div className="flex items-center gap-1 text-[8.5px]">
            {/* 1. System */}
            <div 
              className={`px-1.5 py-0.5 rounded border font-medium flex items-center gap-0.5 ${
                partnerPresence.is_online 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                  : 'bg-white/[0.03] border-white/[0.05] text-slate-400'
              }`}
              title="Platform Status"
            >
              <span className={`w-1 h-1 rounded-full ${partnerPresence.is_online ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>{partnerPresence.is_online ? 'Online' : 'Offline'}</span>
            </div>

            {/* 2. Chat */}
            <div 
              className={`px-1.5 py-0.5 rounded border font-medium ${
                partnerPresence.is_in_chat 
                  ? 'bg-purple-500/15 border-purple-500/25 text-purple-300' 
                  : partnerPresence.is_online 
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' 
                  : 'bg-white/[0.03] border-white/[0.05] text-slate-500'
              }`}
              title="Chat Room Status"
            >
              <span>{partnerPresence.is_in_chat ? 'In Chat 💬' : partnerPresence.is_online ? 'Online 📱' : 'Away'}</span>
            </div>

            {/* 3. Seen receipt */}
            <div 
              className={`px-1.5 py-0.5 rounded border font-medium ${
                !lastMyMessage 
                  ? 'bg-white/[0.03] border-white/[0.05] text-slate-500' 
                  : isLastMessageSeen 
                  ? 'bg-sky-500/15 border-sky-500/25 text-sky-300' 
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              }`}
              title="Last Message Read Status"
            >
              <span>{!lastMyMessage ? '—' : isLastMessageSeen ? 'Seen 👁️' : 'Sent ⏳'}</span>
            </div>

            {/* 4. Typing indicator */}
            <div 
              className={`px-1.5 py-0.5 rounded border font-medium ${
                partnerPresence.is_typing 
                  ? 'bg-pink-500/20 border-pink-500/40 text-pink-300 font-bold animate-pulse' 
                  : 'bg-white/[0.03] border-white/[0.05] text-slate-500'
              }`}
              title="Typing Status"
            >
              <span>{partnerPresence.is_typing ? 'Typing ✍️' : 'Idle'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Messages Stream (Full Screen Native Scroll) */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-2.5 overscroll-contain bg-[#0a0e17]"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
            <Heart className="w-8 h-8 text-rose-500/30" />
            <p className="text-xs">No messages yet. Send a message or a heart to your love! ❤️</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === activeSender;
            const isBerk = msg.sender === 'berk';
            const isHeartOnly = msg.text.trim() === '❤️';
            
            // Check if this specific message was seen
            const isMsgSeen = isMe && (
              partnerPresence.last_seen_message_id === msg.id ||
              (partnerPresence.last_seen_message_at && msg.created_at && partnerPresence.last_seen_message_at >= msg.created_at) ||
              (partnerPresence.is_in_chat && isConnected)
            );

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                {/* Sender label & Timestamp */}
                <div className="flex items-center gap-1 px-1 mb-0.5 text-[10px] text-slate-400 font-medium">
                  <span>{isBerk ? '🦁 Berk' : '🌸 Jaquilyn'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                  {msg.isEdited && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 text-[9px] flex items-center gap-0.5 font-normal">
                        <Pencil className="w-2 h-2" />
                        edited
                      </span>
                    </>
                  )}
                </div>

                {/* Message Bubble: Photo, Heart Emoji, or Text */}
                {msg.photo_url ? (
                  <div className="relative max-w-[85%]">
                    {/* Permanent Chat Photo */}
                    <div className="rounded-2xl overflow-hidden border border-white/[0.1] relative group bg-[#121824] shadow-md">
                      <div
                        onClick={() => setSelectedFullPhoto(msg.photo_url || null)}
                        className="cursor-pointer overflow-hidden max-h-72 relative"
                      >
                        <img
                          src={msg.photo_url}
                          alt="Photo"
                          loading="lazy"
                          className="w-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="p-2 rounded-full bg-black/60 text-white backdrop-blur-sm">
                            <ZoomIn className="w-4 h-4" />
                          </span>
                        </div>
                      </div>

                      {/* Caption if provided */}
                      {msg.text && !msg.text.startsWith('📷') && (
                        <div className="p-2.5 bg-[#121824] border-t border-white/[0.08] text-xs text-slate-200">
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer receipt */}
                    <div className={`flex items-center gap-1 mt-0.5 text-[9px] ${isMe ? 'justify-end text-slate-400' : 'justify-start text-slate-500'}`}>
                      {isMe && (
                        <span className="flex items-center gap-0.5 font-medium">
                          {isMsgSeen ? (
                            <>
                              <CheckCheck className="w-3 h-3 text-sky-400" />
                              <span className="text-sky-300 text-[8px]">Seen</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-400 text-[8px]">Sent</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ) : isHeartOnly ? (
                  <div className="relative py-1 px-2 flex items-center gap-1">
                    <span className="text-4xl animate-bounce hover:scale-125 transition-transform cursor-default select-none">
                      ❤️
                    </span>
                    <button
                      onClick={() => handleOpenEdit(msg)}
                      className="opacity-0 group-hover:opacity-100 hover:text-amber-400 text-slate-500 transition-opacity p-1 cursor-pointer"
                      title="Edit Message"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="relative max-w-[82%]">
                    <div
                      onDoubleClick={() => handleOpenEdit(msg)}
                      className={`p-3 rounded-2xl text-xs leading-relaxed transition-all shadow-sm ${
                        isMe
                          ? isBerk
                            ? 'bg-blue-600 text-white rounded-tr-xs'
                            : 'bg-rose-600 text-white rounded-tr-xs'
                          : 'bg-[#182133] border border-white/[0.08] text-slate-200 rounded-tl-xs'
                      } ${msg.isLoveNote ? 'ring-1 ring-rose-400/30' : ''}`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>

                    {/* Footer read receipt & edit button */}
                    <div className={`flex items-center gap-1 mt-0.5 text-[9px] ${isMe ? 'justify-end text-slate-400' : 'justify-start text-slate-500'}`}>
                      {msg.isEdited && (
                        <span className="text-[8px] text-amber-400/80 italic mr-0.5">
                          edited
                        </span>
                      )}
                      {isMe && (
                        <span className="flex items-center gap-0.5 font-medium">
                          {isMsgSeen ? (
                            <>
                              <CheckCheck className="w-3 h-3 text-sky-400" />
                              <span className="text-sky-300 text-[8px]">Seen</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-400 text-[8px]">Sent</span>
                            </>
                          )}
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenEdit(msg)}
                        className="opacity-0 group-hover:opacity-100 hover:text-amber-400 text-slate-500 transition-opacity ml-1 cursor-pointer p-0.5 rounded hover:bg-white/[0.05]"
                        title="Edit Message"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Live Typing Notification Banner right above input */}
      {partnerPresence.is_typing && (
        <div className="flex items-center gap-2 px-3.5 py-1 bg-pink-500/10 border-t border-pink-500/20 text-xs text-pink-300 animate-fade-in shrink-0">
          <span className="text-sm">{partnerAvatar}</span>
          <span className="font-semibold">{partnerName} is typing</span>
          <span className="flex gap-0.5 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
      )}

      {/* 3. Input Bar: Docked seamlessly above bottom navbar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="w-full px-3 py-2 bg-[#0d121c] border-t border-white/[0.08] flex items-center gap-2 shrink-0 z-10"
      >
        {/* Hidden Photo File Input (Supports iPhone HEIC, JPG, PNG, WebP) */}
        <input
          type="file"
          ref={photoInputRef}
          accept="image/*,.heic,.heif"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        {/* Real Heart Emoji sender */}
        <button
          type="button"
          onClick={() => handleSend('❤️')}
          disabled={isSending || isUploadingPhoto}
          className="p-2.5 rounded-xl bg-[#161f2e] hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-500/30 text-rose-400 hover:text-rose-300 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
          title="Send Heart ❤️"
        >
          <Heart className="w-4 h-4 fill-rose-500 text-rose-500 animate-pulse" />
        </button>

        {/* Chat Photo Button */}
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={isSending || isUploadingPhoto}
          className="p-2.5 rounded-xl bg-[#161f2e] hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-500/30 text-rose-400 hover:text-rose-300 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
          title="Send Photo"
        >
          <Camera className="w-4 h-4" />
        </button>

        <input
          type="text"
          placeholder={`Message to ${partnerName}...`}
          value={inputText}
          onChange={handleInputChange}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#141b28] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isSending || isUploadingPhoto}
          className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white transition-all cursor-pointer shadow-md shrink-0 flex items-center justify-center"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {/* 4. Edit Message Modal with Sticky Header */}
      {editingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Edit Message</h3>
                  <p className="text-[10px] text-slate-400">
                    {editingMessage.sender === 'berk' ? '🦁 Berk' : '🌸 Jaquilyn'} • {editingMessage.timestamp}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingMessage(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit();
              }}
              className="p-4 space-y-3 overflow-y-auto"
            >
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1.5">
                  Message Text
                </label>
                <textarea
                  rows={4}
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveEdit();
                    }
                  }}
                  placeholder="Edit your message..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Tip: Press Enter to save, Shift+Enter for new line.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingMessage(null)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editText.trim() || isSavingEdit}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Photo Upload Modal with Sticky Header */}
      {pendingPhotoFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Send Photo</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    High-speed WebP optimization & saved permanently
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPendingPhotoFile(null);
                  setPhotoPreview(null);
                  setPhotoCaption('');
                }}
                disabled={isUploadingPhoto}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.05] cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 space-y-3.5 overflow-y-auto">
              {/* Photo Preview / HEIC badge */}
              <div className="relative rounded-xl overflow-hidden border border-white/[0.1] bg-[#0c1017] min-h-[180px] max-h-[260px] flex items-center justify-center">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-h-[260px] w-full object-contain"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 mx-auto flex items-center justify-center text-rose-400">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-medium text-slate-200">
                      iPhone Photo (HEIC / HEIF) Detected
                    </p>
                    <p className="text-[10px] text-rose-300">
                      Automatically converted to ultra-lightweight WebP format
                    </p>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
                  <span className="text-[9.5px] px-2 py-0.5 rounded-md bg-black/75 border border-white/20 text-slate-300 font-mono inline-block truncate max-w-full">
                    {pendingPhotoFile.name} ({(pendingPhotoFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              </div>

              {/* Optional Caption */}
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Photo Note / Caption (Optional)
                </label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Write something about this photo..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPendingPhotoFile(null);
                    setPhotoPreview(null);
                    setPhotoCaption('');
                  }}
                  disabled={isUploadingPhoto}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendPhoto}
                  disabled={isUploadingPhoto}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Optimizing & Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Photo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Fullscreen Photo Lightbox Modal */}
      {selectedFullPhoto && (
        <div
          onClick={() => setSelectedFullPhoto(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in"
        >
          {/* Sticky top bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl flex items-center justify-between pb-3"
          >
            <div className="flex items-center gap-2 text-white text-xs font-medium">
              <Camera className="w-4 h-4 text-rose-400" />
              <span>Photo Preview</span>
            </div>
            <button
              onClick={() => setSelectedFullPhoto(null)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden border border-white/10 bg-black/50 shadow-2xl flex items-center justify-center"
          >
            <img
              src={selectedFullPhoto}
              alt="Chat Photo"
              className="max-h-[80vh] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
