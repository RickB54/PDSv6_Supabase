import { useState, useEffect, useRef } from 'react';
import { PageHeader } from "@/components/PageHeader";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MessageCircle, Send, User, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TeamMessage, getTeamMessages, sendTeamMessage } from '@/lib/supa-data';
import { getCurrentUser } from '@/lib/auth';
import { UserSelector } from '@/components/chat/UserSelector';

export default function TeamChat() {
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [isIdentified, setIsIdentified] = useState(false);
    const [messages, setMessages] = useState<TeamMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);

    // Auth user if available
    const [authUser, setAuthUser] = useState(getCurrentUser());

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

    // Load identity
    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setAuthUser(user);
            setGuestName(user.name);
            setGuestEmail(user.email);
            setIsIdentified(true);
        } else {
            // Check guest storage if not logged in (e.g. strict public mode tests)
            // But this page is likely protected? Yes, "Team Chat" implies team.
            // But we keep guest logic for continuity if user testing as anon.
            const stored = localStorage.getItem('guest_identity');
            if (stored) {
                const { name, email } = JSON.parse(stored);
                setGuestName(name);
                setGuestEmail(email);
                setIsIdentified(true);
            }
        }
    }, []);

    // Sync messages
    useEffect(() => {
        if (!isIdentified) return;

        loadMessages();

        // Enhanced real-time subscription with logging
        const channel = supabase
            .channel('team_messages_realtime', {
                config: {
                    broadcast: { self: true }, // Receive own messages too
                    presence: { key: guestEmail }
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'team_messages'
            }, (payload) => {
                console.log('📨 Real-time message received:', payload);
                const newMsg = payload.new as TeamMessage;
                // Avoid duplicate if we already have it from optimistic update
                setMessages(prev => {
                    const exists = prev.some(m => m.id === newMsg.id);
                    if (exists) {
                        console.log('⚠️ Message already exists, skipping duplicate');
                        return prev;
                    }
                    return [...prev, newMsg];
                });
            })
            .subscribe((status) => {
                console.log('🔌 Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to team_messages');
                }
            });

        return () => {
            console.log('🔌 Unsubscribing from team_messages');
            supabase.removeChannel(channel);
        };
    }, [isIdentified, guestEmail]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleIdentify = () => {
        if (!guestName.trim() || !guestEmail.trim()) return;
        localStorage.setItem('guest_identity', JSON.stringify({ name: guestName, email: guestEmail }));
        setIsIdentified(true);
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
            // Send to Supabase with selected recipient
            await sendTeamMessage(messageToSend, guestEmail, guestName, selectedRecipient);
            // Real-time listener will add the confirmed message
            // Remove optimistic once real one arrives (handled by subscription)
        } catch (err) {
            console.error(err);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
            setInputText(messageToSend); // Restore text
        }
    };

    // Show ALL messages if admin/employee? Or just my scope?
    // Widget had specific filtering. Full page might expect fuller view?
    // "Team Chat" usually implies seeing the Public channel.
    // The previous widget logic:
    // const myMessages = messages.filter(m => {
    //    const myEmail = guestEmail.toLowerCase();
    //    const sender = (m.sender_email || '').toLowerCase();
    //    const recipient = (m.recipient_email || '').toLowerCase();
    //    const isMe = sender === myEmail || recipient === myEmail;
    //    return isMe;
    // });
    // If I'm an admin/employee, I should see PUBLIC messages (recipient is null) too.
    // If I'm a guest, maybe restrict?
    // Let's assume for "Team Chat" page (protected route), we show Public + My DMs.

    const visibleMessages = messages.filter(m => {
        // If I haven't identified, show nothing
        if (!guestEmail) return false;

        const myEmail = guestEmail.toLowerCase();
        const sender = (m.sender_email || '').toLowerCase();
        const recipient = (m.recipient_email || '').toLowerCase();
        const isPublic = !m.recipient_email;

        // 1. I sent it
        if (sender === myEmail) return true;
        // 2. Sent to me
        if (recipient === myEmail) return true;
        // 3. Public message?
        if (isPublic) return true;

        return false;
    });

    return (
        <div className="flex flex-col h-screen max-w-6xl mx-auto w-full">
            <div className="p-4 shrink-0">
                <PageHeader title="Team Chat" />
            </div>

            <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-0">
                <Card className="flex-1 flex flex-col shadow-xl border-zinc-800 bg-[#0c1220] overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-zinc-800 bg-[#0f1629] flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="text-emerald-500 h-6 w-6" />
                            <div>
                                <h3 className="font-bold text-white">Team Channel</h3>
                                <p className="text-xs text-zinc-400">Public messages visible to all staff</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={loadMessages}
                                disabled={isLoading}
                                className="p-2 hover:bg-zinc-700 rounded transition-colors"
                                title="Refresh messages"
                            >
                                <RefreshCw className={`h-4 w-4 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            {isIdentified && (
                                <div className="text-xs text-zinc-500">
                                    Signed in as <span className="text-emerald-400">{guestName}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-hidden p-0 relative bg-[#090d16]">
                        {!isIdentified ? (
                            <div className="flex flex-col gap-4 justify-center items-center h-full max-w-sm mx-auto p-6">
                                <div className="text-center space-y-2 mb-4">
                                    <User className="h-16 w-16 mx-auto text-muted-foreground" />
                                    <h3 className="text-xl font-semibold text-white">Identity Required</h3>
                                    <p className="text-sm text-zinc-400">Please confirm your name to join the chat.</p>
                                </div>
                                <Input
                                    placeholder="Your Name"
                                    value={guestName}
                                    onChange={e => setGuestName(e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-white"
                                />
                                <Input
                                    placeholder="Your Email"
                                    value={guestEmail}
                                    onChange={e => setGuestEmail(e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-white"
                                />
                                <Button onClick={handleIdentify} className="w-full bg-emerald-600 hover:bg-emerald-700">Join Chat</Button>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                                    {visibleMessages.length === 0 && (
                                        <div className="text-center py-20 text-zinc-500">
                                            No messages yet. Start the conversation!
                                        </div>
                                    )}
                                    {visibleMessages.map(m => {
                                        const isMe = (m.sender_email || '').toLowerCase() === guestEmail.toLowerCase();
                                        return (
                                            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                                <div className={`max-w-[80%] md:max-w-[60%] rounded-2xl px-5 py-3 shadow-md ${isMe
                                                    ? 'bg-emerald-600 text-white rounded-br-sm'
                                                    : 'bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700'
                                                    }`}>
                                                    {!isMe && <p className="text-[11px] font-bold text-emerald-400 mb-1">{m.sender_name}</p>}
                                                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                                                    <p className={`text-[10px] mt-1.5 text-right ${isMe ? 'text-emerald-100/70' : 'text-zinc-500'}`}>
                                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="p-4 bg-[#0f1629] border-t border-zinc-800 shrink-0">
                                    {/* Recipient Selector */}
                                    <div className="mb-3">
                                        <UserSelector
                                            currentUserEmail={guestEmail}
                                            onSelectRecipient={setSelectedRecipient}
                                            selectedRecipient={selectedRecipient}
                                        />
                                    </div>
                                    <div className="flex gap-3 max-w-4xl mx-auto">
                                        <Input
                                            placeholder="Type a message..."
                                            value={inputText}
                                            onChange={e => setInputText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                                            className="flex-1 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-emerald-500 h-11"
                                        />
                                        <Button size="icon" onClick={handleSend} disabled={!inputText.trim()} className="h-11 w-11 bg-emerald-600 hover:bg-emerald-700">
                                            <Send className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
