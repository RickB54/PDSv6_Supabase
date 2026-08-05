import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TeamMessage } from '@/lib/supa-data';
import { getCurrentUser } from '@/lib/auth';

export function ChatAudioAlert() {
    const [user, setUser] = useState(getCurrentUser());

    // Sync auth
    useEffect(() => {
        const update = () => setUser(getCurrentUser());
        window.addEventListener('auth-changed', update);
        update();
        return () => window.removeEventListener('auth-changed', update);
    }, []);

    // Unlock audio context and request notification permission on first user interaction
    useEffect(() => {
        const unlock = () => {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
            }
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
        return () => {
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
        };
    }, []);

    const createBeep = (ctx: AudioContext, freq: number, startTime: number, duration: number, maxGain = 0.95) => {
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            // Sawtooth waveform has rich harmonics to cut through outdoor noise
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(maxGain, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);
        } catch { }
    };

    const triggerAlertSystem = (msgContent?: string, senderName?: string) => {
        // 1. Phone Vibration (Haptic feedback in pocket while working outside)
        try {
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([400, 150, 400, 150, 600]);
            }
        } catch { }

        // 2. Mobile System / Phone Lockscreen Notification
        try {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const title = senderName ? `🚨 Message from ${senderName}` : "🚨 URGENT Chat Alert!";
                const body = msgContent ? msgContent.slice(0, 100) : "You have a new live message!";
                new Notification(title, {
                    body,
                    icon: '/favicon.ico',
                    tag: 'chat-alert',
                    requireInteraction: true
                });
            }
        } catch { }

        // 3. Loud Outdoor Double-Siren Audio Alert (Max Gain, Sawtooth Harmonics)
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const now = ctx.currentTime;
            
            // Cycle 1 - High pitch escalation
            createBeep(ctx, 880, now, 0.18, 0.95);         // High A5
            createBeep(ctx, 1174.66, now + 0.2, 0.18, 0.95); // D6
            createBeep(ctx, 1396.91, now + 0.4, 0.25, 1.0);  // F6 Peak

            // Cycle 2 - Repeat double blast for extra audibility outdoors
            createBeep(ctx, 880, now + 0.85, 0.18, 0.95);
            createBeep(ctx, 1174.66, now + 1.05, 0.18, 0.95);
            createBeep(ctx, 1396.91, now + 1.25, 0.35, 1.0);

            console.log("🔊 Loud Outdoor Audio Siren Broadcasted");

            setTimeout(() => {
                try { ctx.close(); } catch { }
            }, 2500);

        } catch (e) {
            console.error("Loud audio generation error", e);
        }
    };

    // Test Alert Listener
    useEffect(() => {
        const handleTest = () => {
            console.log("🔔 TEST TRIGGERED");
            triggerAlertSystem("Test alert broadcasted at maximum volume!", "Test User");
        };
        window.addEventListener('test-chat-alert', handleTest);
        return () => window.removeEventListener('test-chat-alert', handleTest);
    }, []);

    // Main Subscription
    useEffect(() => {
        // user state might be null if we are a Guest, so check localStorage too
        const checkIdentity = () => {
            const u = getCurrentUser();
            if (u) return { email: u.email, name: u.name || '', role: u.role };

            const raw = localStorage.getItem('guest_identity');
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    return { email: parsed.email, name: parsed.name, role: 'guest' };
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
                
                const userRole = currentIdentity.role;
                const isAdminOrEmployee = userRole === 'admin' || userRole === 'employee';

                if (!isSenderMe) {
                    const shouldAlert = isDirectlyForMe || (isPublic && isAdminOrEmployee);
                    
                    if (shouldAlert) {
                        console.log("ðŸ”” NOTIFICATION MATCHED!", { myEmail, sender });

                        // 1. Audio & Phone Haptics / Lockscreen Notification
                        triggerAlertSystem(newMsg.content, newMsg.sender_name || newMsg.sender_email);

                        // 3. Window Event
                        window.dispatchEvent(new CustomEvent('new-chat-alert'));

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
