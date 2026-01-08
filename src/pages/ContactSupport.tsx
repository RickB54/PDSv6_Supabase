import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { MessageSquare, Send } from "lucide-react";
import { getTeamMessages, sendTeamMessage, TeamMessage } from "@/lib/supa-data";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

const ContactSupport = () => {
    const [chatMessages, setChatMessages] = useState<TeamMessage[]>([]);
    const [newChatText, setNewChatText] = useState("");
    const user = getCurrentUser();

    useEffect(() => {
        // Load chat history
        (async () => {
            const msgs = await getTeamMessages();
            setChatMessages(msgs);
        })();

        // Subscribe to Realtime Updates
        const channel = supabase
            .channel('public:team_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, (payload) => {
                const newMsg = payload.new as TeamMessage;
                setChatMessages(prev => [...prev, newMsg]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleSend = async () => {
        const text = newChatText.trim();
        if (!text) return;
        const senderEmail = user?.email || '';
        const senderName = user?.name || senderEmail;
        // Send to public (null) so it appears in Admin "All Team" inbox. 
        try {
            await sendTeamMessage(text, senderEmail, senderName, null);
            setNewChatText("");
        } catch (err) {
            toast({ title: "Failed to send", variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="Contact Support" />
            <main className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
                <Card className="p-6 border-border relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-blue-500/10">
                                <MessageSquare className="h-6 w-6 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">Chat with Us</h2>
                        </div>
                        <div className="flex flex-col h-[500px]">
                            <div className="flex-1 overflow-auto bg-background/50 rounded-md border border-border p-4 mb-4 space-y-3">
                                {(() => {
                                    const myEmail = (user?.email || '').toLowerCase();
                                    const visibleMsgs = chatMessages.filter(m =>
                                        (m.sender_email || '').toLowerCase() === myEmail ||
                                        (m.recipient_email || '').toLowerCase() === myEmail
                                    );

                                    if (visibleMsgs.length === 0) return <p className="text-sm text-muted-foreground text-center mt-10">Send us a message if you need help!</p>;

                                    return visibleMsgs.map(m => {
                                        const isMe = (m.sender_email || '').toLowerCase() === myEmail;
                                        return (
                                            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-lg p-3 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                                                    <p className="text-xs font-bold mb-1 opacity-80">{isMe ? 'You' : m.sender_name}</p>
                                                    <p className="text-sm">{m.content}</p>
                                                    <p className="text-[10px] mt-1 opacity-70 text-right">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Type a message..."
                                    value={newChatText}
                                    onChange={e => setNewChatText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSend();
                                    }}
                                />
                                <Button onClick={handleSend}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </main>
        </div>
    );
};

export default ContactSupport;
