import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MessageCircle, X, Send, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TeamMessage, getTeamMessages, sendTeamMessage } from '@/lib/supa-data';
import { getCurrentUser } from '@/lib/auth';

export function GlobalChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [isIdentified, setIsIdentified] = useState(false);
    const [messages, setMessages] = useState<TeamMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [hasUnread, setHasUnread] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Load identity from storage or auth
    useEffect(() => {
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
            }
        }
    }, []);

    // Sync messages
    useEffect(() => {
        if (!isIdentified) return;

        // Initial load
        (async () => {
            const all = await getTeamMessages();
            setMessages(all);
        })();

        // Subscribe
        const channel = supabase
            .channel('public:team_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, (payload) => {
                const newMsg = payload.new as TeamMessage;
                setMessages(prev => [...prev, newMsg]);

                // If closed and msg is for me (or public), show badge
                const myEmail = guestEmail.toLowerCase();
                const isForMe = newMsg.recipient_email?.toLowerCase() === myEmail || newMsg.sender_email?.toLowerCase() === myEmail;
                // Or if I'm a guest, I should see replies from admins (who might send to null or me)
                if (!isOpen) setHasUnread(true);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isIdentified, guestEmail, isOpen]);

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

    const handleSend = async () => {
        if (!inputText.trim()) return;
        try {
            // Guest sends to NULL (Public Team Inbox)
            // If we wanted to target a specific admin, we'd need their email. For now, NULL is "Everyone".
            await sendTeamMessage(inputText, guestEmail, guestName, null);
            setInputText('');
        } catch (err) {
            console.error(err);
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
        // 3. Public messages (recipient is null) - Guests should NOT see all public internal chat?
        // User requested "allow to see customers here in this chat... chat with customers also".
        // SECURITY: If we show all NULL messages, guests see internal team chat.
        // FIX: We need a flag or logic.
        // Simple filter: Only show if I am the sender OR recipient.
        // BUT what if Admin replies to NULL (Public)? 
        // Admin should reply TO the guest (Direct).
        // So guests only see DMs.
        return false;
    });

    // Correction: If the backend logic expects guests to see their own messages,
    // we must ensure visibleMessages includes them.
    // We re-apply the filter correctly:
    const myMessages = messages.filter(m => {
        const myEmail = guestEmail.toLowerCase();
        const sender = (m.sender_email || '').toLowerCase();
        const recipient = (m.recipient_email || '').toLowerCase();
        const isMe = sender === myEmail || recipient === myEmail;
        return isMe;
    });

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 font-sans">
            {isOpen && (
                <Card className="w-[350px] h-[500px] flex flex-col shadow-2xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    {/* Header */}
                    <div className="p-4 border-b bg-primary text-primary-foreground rounded-t-lg flex justify-between items-center">
                        <div>
                            <h3 className="font-bold flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Chat with Us</h3>
                            <p className="text-xs opacity-90">We typically reply in a few minutes.</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {isIdentified && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-[10px] text-white/80 hover:text-white hover:bg-white/10"
                                    onClick={() => {
                                        localStorage.removeItem('guest_identity');
                                        setIsIdentified(false);
                                        setGuestName('');
                                        setGuestEmail('');
                                        setMessages([]);
                                    }}
                                >
                                    End
                                </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary-foreground/20 text-white" onClick={() => setIsOpen(false)}>
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
                                    {myMessages.length === 0 && (
                                        <div className="text-center py-10 text-muted-foreground text-sm">
                                            No messages yet. Say hi!
                                        </div>
                                    )}
                                    {myMessages.map(m => {
                                        const isMe = (m.sender_email || '').toLowerCase() === guestEmail.toLowerCase();
                                        return (
                                            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none'
                                                    }`}>
                                                    {!isMe && <p className="text-[10px] font-bold opacity-70 mb-1">{m.sender_name}</p>}
                                                    <p>{m.content}</p>
                                                    <p className="text-[9px] opacity-60 text-right mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
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

            {/* Launcher */}
            {!isOpen && (
                <Button
                    size="icon"
                    className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-transform hover:scale-105 relative"
                    onClick={() => setIsOpen(true)}
                >
                    <MessageCircle className="h-7 w-7" />
                    {hasUnread && (
                        <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                    )}
                </Button>
            )}
        </div>
    );
}
