import React, { useEffect } from "react";
import { useNotesStore } from "@/store/notes";
import { getReminderData } from "@/pages/StickyNotes";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useNavigate } from "react-router-dom";

export function StickyNotesReminderEngine() {
  const notesStore = useNotesStore();
  const navigate = useNavigate();

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      
      notesStore.notes.forEach(note => {
        const reminder = getReminderData(note);
        if (!reminder) return;

        // Parse reminder date and time
        const [year, month, day] = reminder.date.split('-').map(Number);
        const [hour, minute] = reminder.time.split(':').map(Number);
        if (!year || isNaN(hour)) return;
        const reminderDate = new Date(year, month - 1, day, hour, minute);

        if (reminderDate <= now) {
          // Trigger notification
          if (reminder.popup !== false) {
            toast({
              title: `🔔 Reminder: ${note.title || 'Untitled Sticky'}`,
              description: (note.content || '').replace(/^[✅⬜⏳❌]\s*/gm, '').replace(/[\u200B-\u200D\uFEFF]/g, '').substring(0, 100),
              duration: 10000,
              action: (
                <ToastAction altText="Open Note" onClick={() => {
                  navigate('/sticky-notes');
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('open-sticky-note', { detail: { note } }));
                  }, 100);
                }}>
                  Open Note
                </ToastAction>
              ),
            });
          }
          
          if (reminder.sound !== false) {
            try {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContextClass) {
                const ctx = new AudioContextClass();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
                
                setTimeout(() => {
                  try {
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(1100, ctx.currentTime);
                    gain2.gain.setValueAtTime(0.1, ctx.currentTime);
                    osc2.start();
                    osc2.stop(ctx.currentTime + 0.15);
                  } catch (e) {}
                }, 200);
              }
            } catch (e) {}
          }

          // Handle repeating rules or clear the tag
          if (reminder.repeat && reminder.repeat !== 'none') {
            let nextDate = new Date(reminderDate);
            if (reminder.repeat === 'daily') {
              nextDate.setDate(nextDate.getDate() + 1);
            } else if (reminder.repeat === 'weekly') {
              nextDate.setDate(nextDate.getDate() + 7);
            } else if (reminder.repeat === 'monthly') {
              nextDate.setMonth(nextDate.getMonth() + 1);
            } else if (reminder.repeat === 'yearly') {
              nextDate.setFullYear(nextDate.getFullYear() + 1);
            }
            
            const nextDateStr = nextDate.toISOString().split('T')[0];
            const nextTimeStr = nextDate.toTimeString().split(' ')[0].substring(0, 5);
            const cleanTags = (note.tags || []).filter(t => !t.startsWith('__reminder:'));
            const soundPref = reminder.sound === false ? 'false' : 'true';
            const popupPref = reminder.popup === false ? 'false' : 'true';
            
            cleanTags.push(`__reminder:${nextDateStr}|${nextTimeStr}|${reminder.repeat}|${soundPref}|${popupPref}__`);
            
            notesStore.updateNote(note.id, { tags: cleanTags });
          } else {
            // One-off reminder: completely clear it!
            const cleanTags = (note.tags || []).filter(t => !t.startsWith('__reminder:'));
            notesStore.updateNote(note.id, { tags: cleanTags });
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 15000);
    checkReminders(); // check immediately on mount
    return () => clearInterval(interval);
  }, [notesStore.notes, navigate]);

  return null; // This component runs in the background
}
