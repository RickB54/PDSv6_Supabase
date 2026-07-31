import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MessageCircle, X, Send, User, RefreshCw, Bell, Download, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TeamMessage, getTeamMessages, sendTeamMessage } from '@/lib/supa-data';
import { getCurrentUser } from '@/lib/auth';
import { UserSelector } from '@/components/chat/UserSelector';

export function GlobalChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [isIdentified, setIsIdentified] = useState(false);
    const [messages, setMessages] = useState<TeamMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [hasUnread, setHasUnread] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    
    const [adminHidden, setAdminHidden] = useState(() => localStorage.getItem('hide_chat_bot') === 'true');
    const [forceShowPopup, setForceShowPopup] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Load messages function
    const loadMessages = async () => {
        setIsLoading(true);
        try {
            const all = await getTeamMessages();
            setMessages(all);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Load identity from storage or auth
    useEffect(() => {
        const updateIdentity = () => {
            const user = getCurrentUser();
            if (user) {
                setGuestName(user.name);
                setGuestEmail(user.email);
                setIsIdentified(true);
            } else {
                const stored = localStorage.getItem('guest_identity');
                if (stored) {
                    const { name, email } = JSON.parse(stored);
                    setGuestName(name);
                    setGuestEmail(email);
                    setIsIdentified(true);
                } else {
                    setGuestName('');
                    setGuestEmail('');
                    setIsIdentified(false);
                }
            }
        };

        updateIdentity();
        window.addEventListener('auth-changed', updateIdentity);
        
        const handleHideUpdate = () => {
            const isHidden = localStorage.getItem('hide_chat_bot') === 'true';
            setAdminHidden(isHidden);
            if (!isHidden) setForceShowPopup(false);
        };
        window.addEventListener('hide-chat-bot-updated', handleHideUpdate);
        
        return () => {
            window.removeEventListener('auth-changed', updateIdentity);
            window.removeEventListener('hide-chat-bot-updated', handleHideUpdate);
        };
    }, []);

    // Sync messages
    useEffect(() => {
        if (!isIdentified) return;

        // Initial load
        loadMessages();

        // Subscribe
        const channel = supabase
            .channel('global_widget_team_messages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_messages' }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                    return;
                }
                
                if (payload.eventType === 'INSERT') {
                    const newMsg = payload.new as TeamMessage;
                    setMessages(prev => {
                    // 1. Check if we already have this exact ID
                    if (prev.some(m => m.id === newMsg.id)) return prev;

                    // 2. Check for optimistic match (same content, sender, and is temp)
                    // We look for a temp message from ME with same content
                    const optimisticMatch = prev.find(m =>
                        m.id.startsWith('temp-') &&
                        m.content === newMsg.content &&
                        m.sender_email === newMsg.sender_email
                    );

                    if (optimisticMatch) {
                        // Replace the optimistic one with the real one
                        return prev.map(m => m.id === optimisticMatch.id ? newMsg : m);
                    }

                    // 3. Otherwise append
                    return [...prev, newMsg];
                });

                // If closed and msg is for me (or public), show badge
                const myEmail = guestEmail.toLowerCase();
                
                // If I am a guest, only show badge if the message is to me or sent by me.
                const userRole = getCurrentUser()?.role;
                const isAdmin = userRole === 'admin' || userRole === 'employee';
                
                const isForMe = newMsg.recipient_email?.toLowerCase() === myEmail || newMsg.sender_email?.toLowerCase() === myEmail;
                
                if (!isOpen) {
                    if (isAdmin || isForMe) {
                        setHasUnread(true);
                    }
                }

                const isCurrentlyHidden = localStorage.getItem('hide_chat_bot') === 'true';
                if (isAdmin && isCurrentlyHidden) {
                    setForceShowPopup(true);
                    setIsOpen(true);
                }

                // Auto-select guest if I am admin and someone sends a message
                if (isAdmin && newMsg.sender_email && newMsg.sender_email.toLowerCase() !== myEmail) {
                    setSelectedRecipient(newMsg.sender_email);
                }
            })
            .subscribe();

        // Listen for global audio alerts (triggered by ChatAudioAlert hidden component)
        const handleGlobalAlert = () => {
            if (!isOpen) setHasUnread(true);
        };
        window.addEventListener('new-chat-alert', handleGlobalAlert);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('new-chat-alert', handleGlobalAlert);
        };
    }, [isIdentified, guestEmail, isOpen]);

    // Presence Tracking (Global)
    useEffect(() => {
        if (!isIdentified || !guestEmail) return;

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: guestEmail,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users: any[] = [];
                Object.keys(state).forEach((key) => {
                    state[key].forEach((u: any) => users.push(u));
                });
                // Deduplicate by email
                const unique = users.filter((v, i, a) => a.findIndex(t => t.email === v.email) === i);
                setOnlineUsers(unique);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const user = getCurrentUser();
                    await channel.track({
                        email: guestEmail,
                        name: guestName || guestEmail.split('@')[0],
                        role: user?.role || 'guest',
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isIdentified, guestEmail, guestName]);

    // Auto-scroll
    useEffect(() => {
        if (isOpen && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            setHasUnread(false);
        }
    }, [messages, isOpen]);

    const handleIdentify = () => {
        if (!guestName.trim() || !guestEmail.trim()) return;
        localStorage.setItem('guest_identity', JSON.stringify({ name: guestName, email: guestEmail }));
        setIsIdentified(true);
    };

    const handleClearChat = async () => {
        if (!window.confirm("Are you sure you want to clear your chat history? This will permanently delete your stored conversation.")) return;
        try {
            await supabase.from('team_messages').delete().or(`sender_email.eq.${guestEmail},recipient_email.eq.${guestEmail}`);
            setMessages([]);
        } catch (e) {
            console.error("Failed to clear chat", e);
        }
    };

    const handleSaveChat = () => {
        const text = visibleMessages.map(m => `[${new Date(m.created_at).toLocaleString()}] ${m.sender_name || m.sender_email}: ${m.content}`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_history_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;

        // Create optimistic message
        const optimisticMessage: TeamMessage = {
            id: `temp-${Date.now()}`,
            content: inputText,
            sender_email: guestEmail,
            sender_name: guestName,
            recipient_email: null,
            created_at: new Date().toISOString()
        };

        // Add to UI immediately
        setMessages(prev => [...prev, optimisticMessage]);
        const messageToSend = inputText;
        setInputText('');

        try {
            await sendTeamMessage(messageToSend, guestEmail, guestName, selectedRecipient);
        } catch (err) {
            console.error(err);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
            setInputText(messageToSend);
        }
    };

    // Filter messages relevant to this user
    const visibleMessages = messages.filter(m => {
        const myEmail = guestEmail.toLowerCase();
        const sender = (m.sender_email || '').toLowerCase();
        const recipient = (m.recipient_email || '').toLowerCase();

        // 1. I sent it
        if (sender === myEmail) return true;
        // 2. Sent to me
        if (recipient === myEmail) return true;
        
        // 3. Admins and employees should see all messages to monitor customer chats
        const user = getCurrentUser();
        if (user?.role === 'admin' || user?.role === 'employee') return true;

        return false;
    });

    const userRole = getCurrentUser()?.role;
    const isAdminOrEmployee = userRole === 'admin' || userRole === 'employee';

    const offlineUsersMap = new Map<string, any>();
    messages.forEach(m => {
        if (m.sender_email && m.sender_email !== guestEmail) {
            if (!onlineUsers.some(ou => ou.email === m.sender_email)) {
                offlineUsersMap.set(m.sender_email, {
                    email: m.sender_email,
                    name: m.sender_name || m.sender_email.split('@')[0],
                    role: 'guest',
                    online_at: m.created_at,
                });
            }
        }
    });
    const offlineUsers = Array.from(offlineUsersMap.values());

    // Drag functionality
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragStartPosRef = useRef({ x: 0, y: 0 });
    const startPositionRef = useRef({ x: 0, y: 0 });

    const handlePointerDown = (e: React.PointerEvent) => {
        // Only allow left click or touch
        if (e.button !== 0) return;

        e.preventDefault();

        isDraggingRef.current = false;
        dragStartPosRef.current = { x: e.clientX, y: e.clientY };
        startPositionRef.current = { ...position };

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const deltaX = moveEvent.clientX - dragStartPosRef.current.x;
            const deltaY = moveEvent.clientY - dragStartPosRef.current.y;

            // Threshold to consider it a drag
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                isDraggingRef.current = true;
            }

            setPosition({
                x: startPositionRef.current.x + deltaX,
                y: startPositionRef.current.y + deltaY
            });
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);

            if (!isDraggingRef.current) {
                setIsOpen(true);
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    // Screen boundary detection for Card alignment
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getCardStyles = () => {
        const CARD_WIDTH = 350;
        const CARD_HEIGHT = 500;
        const BUTTON_SIZE = 56;
        const GAP = 8; // gap-2
        const BOTTOM_OFFSET = 16; // bottom-4
        const RIGHT_OFFSET = 16;  // right-4
        
        // Container Bottom-Right Position relative to window
        const containerRight = windowSize.width - RIGHT_OFFSET + position.x;
        const containerBottom = windowSize.height - BOTTOM_OFFSET + position.y;

        let translateX = 0;
        let translateY = 0;

        // X-Axis Logic
        // By default, Card extends LEFT from containerRight.
        // Left Edge = containerRight - CARD_WIDTH
        if (containerRight - CARD_WIDTH < 10) {
             // Too close to left edge, flip to align Left with Button Left
             // Button Left is containerRight - BUTTON_SIZE
             // We want Card Left = containerRight - BUTTON_SIZE
             // Shift = (containerRight - BUTTON_SIZE) - (containerRight - CARD_WIDTH)
             translateX = CARD_WIDTH - BUTTON_SIZE;
        }

        // Y-Axis Logic
        // By default, Card extends UP from containerBottom (above the button).
        // Structure: [Card] -> [Gap] -> [Button] (at containerBottom)
        // Card Top = containerBottom - BUTTON_SIZE - GAP - CARD_HEIGHT
        const cardTop = containerBottom - BUTTON_SIZE - GAP - CARD_HEIGHT;
        
        if (cardTop < 10) {
            // Too close to top edge, flip to display BELOW button
            // Shift down past: Card Height + Original Gap + Button Height + New Gap
            // = 500 + 8 + 56 + 8 = 572
            translateY = CARD_HEIGHT + BUTTON_SIZE + (GAP * 2);
        }

        return {
            transform: `translate(${translateX}px, ${translateY}px)`
        };
    };

    const isSuperAdmin = getCurrentUser()?.role === 'admin';
    if (isSuperAdmin && adminHidden && !forceShowPopup) return null;

    return (
        <div 
            className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 font-sans touch-none"
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        >
            {isOpen && (
                <Card 
                    className="w-[350px] h-[500px] flex flex-col shadow-2xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-200"
                    style={getCardStyles()}
                >
                    {/* Header */}
                    <div 
                        className="p-4 border-b bg-primary text-primary-foreground rounded-t-lg flex justify-between items-center cursor-move"
                        onPointerDown={handlePointerDown}
                    >
                        <div>
                            <h3 className="font-bold flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Chat with Us</h3>
                            <p className="text-xs opacity-90">We will get back to you as soon as possible.</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {isIdentified && (
                                <>
                                    <button
                                        onClick={() => window.dispatchEvent(new CustomEvent('test-chat-alert'))}
                                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                        title="Test Notification Sound"
                                    >
                                        <Bell className="h-4 w-4 text-white/80" />
                                    </button>
                                    <button
                                        onClick={loadMessages}
                                        disabled={isLoading}
                                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                        title="Refresh messages"
                                    >
                                        <RefreshCw className={`h-4 w-4 text-white/80 ${isLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={handleSaveChat}
                                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                        title="Save Chat History"
                                    >
                                        <Download className="h-4 w-4 text-white/80" />
                                    </button>
                                    <button
                                        onClick={handleClearChat}
                                        className="p-1.5 hover:bg-white/10 rounded transition-colors text-red-300 hover:text-red-400"
                                        title="Clear Chat History"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[10px] text-white/80 hover:text-white hover:bg-white/10"
                                        onClick={() => {
                                            if (window.confirm("Are you sure you want to end this chat?")) {
                                                localStorage.removeItem('guest_identity');
                                                setIsIdentified(false);
                                                setGuestName('');
                                                setGuestEmail('');
                                                setMessages([]);
                                            }
                                        }}
                                    >
                                        End
                                    </Button>
                                </>
                            )}
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary-foreground/20 text-white" onClick={() => {
                                setIsOpen(false);
                                if (adminHidden) setForceShowPopup(false);
                            }}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-hidden flex flex-col p-4">
                        {!isIdentified ? (
                            <div className="flex flex-col gap-4 justify-center h-full">
                                <div className="text-center space-y-2">
                                    <User className="h-12 w-12 mx-auto text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Please introduce yourself to start chatting.</p>
                                </div>
                                <Input placeholder="Your Name" value={guestName} onChange={e => setGuestName(e.target.value)} />
                                <Input placeholder="Your Email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
                                <Button onClick={handleIdentify}>Start Chat</Button>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto space-y-4 pr-2" ref={scrollRef}>
                                    {visibleMessages.length === 0 && (
                                        <div className="text-center py-10 text-muted-foreground text-sm">
                                            No messages yet. Say hi!
                                        </div>
                                    )}
                                    {visibleMessages.map(m => {
                                        const isMe = (m.sender_email || '').toLowerCase() === guestEmail.toLowerCase();
                                        return (
                                            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none'
                                                    }`}>
                                                    {!isMe && (
                                                        <div className="flex items-center justify-between mb-1 gap-4">
                                                            <p className="text-[10px] font-bold opacity-70">{m.sender_name}</p>
                                                            {isAdminOrEmployee && (
                                                                <button 
                                                                    onClick={() => setSelectedRecipient(m.sender_email)}
                                                                    className="text-[9px] text-blue-500 hover:underline opacity-80 hover:opacity-100 uppercase tracking-wider font-bold"
                                                                >
                                                                    Reply
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    <p>{m.content}</p>
                                                    <p className="text-[9px] opacity-60 text-right mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Recipient Selector */}
                                {isAdminOrEmployee && (
                                    <div className="mb-2 px-1">
                                        <UserSelector
                                            currentUserEmail={guestEmail}
                                            onSelectRecipient={setSelectedRecipient}
                                            selectedRecipient={selectedRecipient}
                                            onlineUsers={onlineUsers}
                                            offlineUsers={offlineUsers}
                                        />
                                    </div>
                                )}

                                <div className="mt-4 flex gap-2 pt-2 border-t">
                                    <Input
                                        placeholder="Type a message..."
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                                        className="flex-1"
                                    />
                                    <Button size="icon" onClick={handleSend} disabled={!inputText.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            )}

            {/* Launcher with Priority Alert */}
            {!isOpen && (
                <Button
                    size="icon"
                    className={`h-14 w-14 rounded-full shadow-xl transition-all hover:scale-105 relative
                        ${hasUnread
                            ? 'animate-[pulse_0.5s_cubic-bezier(0.4,0,0.6,1)_infinite] bg-red-600 hover:bg-red-700 ring-4 ring-offset-2 ring-blue-500' // Flashing Red/Blue effect handled via rapid pulse + ring
                            : 'bg-primary hover:bg-primary/90'
                        }
                    `}
                    onPointerDown={handlePointerDown}
                >
                    <MessageCircle className={`h-7 w-7 ${hasUnread ? 'text-white' : ''}`} />
                    {hasUnread && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-blue-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
                            !
                        </span>
                    )}
                </Button>
            )}
        </div>
    );
}
