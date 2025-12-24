import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { TeamMessage } from '@/lib/supa-data';
import { getCurrentUser } from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';

// Simple "Phone Ring" sound effect (base64 to avoid external dependency issues)
// This is a short digital ring tone.
const RING_SOUND = "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...";
// NOTE: The above is truncated. I will use a simple Beep URL or a cleaner implementation.
// Better: Use a reliable CDN or just a simple Oscillator if possible? 
// Oscillator is best for zero-dependency "Loud Ring".

export function ChatAudioAlert() {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const playRing = () => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            const t = ctx.currentTime;

            // Create oscillator for "Digital Phone Ring" - Louder & High Pitch
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square'; // Sharper sound than sine

            // Pattern: High-High ... High-High
            osc.frequency.setValueAtTime(880, t); // A5
            osc.frequency.setValueAtTime(880, t + 0.1);
            osc.frequency.setValueAtTime(0, t + 0.11); // Silence
            osc.frequency.setValueAtTime(1108, t + 0.2); // C#6
            osc.frequency.setValueAtTime(1108, t + 0.3);
            osc.frequency.setValueAtTime(0, t + 0.31);
            osc.frequency.setValueAtTime(1108, t + 0.4); // Repeat C#6
            osc.frequency.setValueAtTime(1108, t + 0.5);

            // Volume Envelope
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.3, t + 0.5);
            gain.gain.linearRampToValueAtTime(0.01, t + 0.6);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(t + 0.7);

            // Dispatch Event for Visuals
            window.dispatchEvent(new CustomEvent('new-chat-alert'));

        } catch (e) {
            console.error("Audio Alert Failed", e);
        }
    };

    useEffect(() => {
        const user = getCurrentUser();
        // Only admins/employees should hear the ring for "Incoming Support"
        if (!user || user.role === 'customer') return;

        const channel = supabase
            .channel('public:team_messages:alert')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, (payload) => {
                const newMsg = payload.new as TeamMessage;

                // Logic: Ring if:
                // 1. I am NOT the sender.
                // 2. It is meant for ME or the PUBLIC (support channel).
                const myEmail = user.email.toLowerCase();
                const sender = (newMsg.sender_email || '').toLowerCase();
                const recipient = (newMsg.recipient_email || '').toLowerCase();

                if (sender !== myEmail) {
                    // Check if it's relevant
                    if (!recipient || recipient === myEmail) {
                        // IT IS A NEW MESSAGE!
                        console.log("Incoming Chat Alert!");
                        playRing();

                        // Visual Toast as well
                        toast({
                            title: "Incoming Message!",
                            description: `From: ${newMsg.sender_name || 'Guest'}`,
                            duration: 5000,
                            className: "bg-emerald-500 text-white font-bold border-2 border-white shadow-xl"
                        });
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return null; // Headless
}
