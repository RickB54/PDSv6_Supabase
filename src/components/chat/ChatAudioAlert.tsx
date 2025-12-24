import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TeamMessage } from '@/lib/supa-data';
import { getCurrentUser } from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';

export function ChatAudioAlert() {
    const [user, setUser] = useState(getCurrentUser());

    // Sync auth
    useEffect(() => {
        const update = () => setUser(getCurrentUser());
        window.addEventListener('auth-changed', update);
        update();
        return () => window.removeEventListener('auth-changed', update);
    }, []);

    const playSound = () => {
        try {
            // Web Audio API Oscillator (replaces Base64 file which might be silent/corrupt)
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();

            // Resume context if suspended (browser autoplay policy)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            // "Digital Ring" parameters
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch (A5)
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
            osc.frequency.setValueAtTime(0, ctx.currentTime + 0.11); // Gap
            osc.frequency.setValueAtTime(1108, ctx.currentTime + 0.2); // Higher pitch (C#6)

            // Volume control
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.5);

            console.log("🔊 Audio Alert Attempted");

            // Clean up context after a second
            setTimeout(() => {
                try { ctx.close(); } catch { }
            }, 1000);

        } catch (e) {
            console.error("Audio generation error", e);
        }
    };

    // Request Notification Permission on mount/interaction
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            const request = () => Notification.requestPermission();
            document.addEventListener('click', request, { once: true });
            return () => document.removeEventListener('click', request);
        }
    }, []);

    // Trigger Desktop Notification
    const sendDesktopNotification = (title: string, body: string) => {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, {
                body,
                icon: '/favicon.ico', // Optional: requires valid path
                silent: true // We play our own sound
            });
        }
    };

    // Test Alert Listener
    useEffect(() => {
        const handleTest = () => {
            console.log("🔔 TEST TRIGGERED");
            playSound();
            toast({ title: "Test Alert", description: "This is a test notification." });
            sendDesktopNotification("Test Notification", "This is how alerts will appear outside the browser.");
        };
        window.addEventListener('test-chat-alert', handleTest);
        return () => window.removeEventListener('test-chat-alert', handleTest);
    }, []);

    // Main Subscription
    useEffect(() => {
        // user state might be null if we are a Guest, so check localStorage too
        const checkIdentity = () => {
            const u = getCurrentUser();
            if (u) return { email: u.email, name: u.name || '' };

            const raw = localStorage.getItem('guest_identity');
            if (raw) {
                try {
                    return JSON.parse(raw); // { name, email }
                } catch { }
            }
            return null;
        };

        const channel = supabase
            .channel('global_chat_alerts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, (payload) => {
                const newMsg = payload.new as TeamMessage;
                const currentIdentity = checkIdentity();

                if (!currentIdentity) return;

                const myEmail = currentIdentity.email.toLowerCase().trim();
                const sender = (newMsg.sender_email || '').toLowerCase().trim();
                const recipient = (newMsg.recipient_email || '').toLowerCase().trim();

                // Logic Check
                const isSenderMe = sender === myEmail;
                const isDirectlyForMe = recipient === myEmail;
                const isPublic = !recipient;

                if (!isSenderMe) {
                    if (isDirectlyForMe || isPublic) {
                        console.log("🔔 NOTIFICATION MATCHED!", { myEmail, sender });

                        // 1. Audio
                        playSound();

                        // 2. Desktop Notification
                        sendDesktopNotification(
                            "New Message",
                            `From: ${newMsg.sender_name || 'Guest'}\n${newMsg.content}`
                        );

                        // 3. Window Event
                        window.dispatchEvent(new CustomEvent('new-chat-alert'));

                        // 4. Toast (The Real One)
                        toast({
                            title: "New Message",
                            description: `From: ${newMsg.sender_name || 'Guest'}`,
                            className: "bg-emerald-600 text-white border-none",
                            duration: 4000
                        });

                        // 5. Tab Blink
                        let count = 0;
                        const original = document.title;
                        const interval = setInterval(() => {
                            document.title = count % 2 === 0 ? "🔔 New Message!" : original;
                            count++;
                            if (count > 6) {
                                clearInterval(interval);
                                document.title = original;
                            }
                        }, 800);
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.email]);

    return null;
}
