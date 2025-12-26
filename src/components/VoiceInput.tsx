import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    className?: string;
}

export function VoiceInput({ onTranscript, className = '' }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const finalTranscriptRef = useRef('');

    useEffect(() => {
        // Check if browser supports speech recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            finalTranscriptRef.current = '';
            toast.info('🎤 Listening... Speak now');
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                finalTranscriptRef.current += finalTranscript;
                setTranscript(finalTranscriptRef.current);

                // Reset silence timer - give 2 seconds after each phrase
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                }

                silenceTimerRef.current = setTimeout(() => {
                    if (recognitionRef.current && isListening) {
                        stopListening();
                    }
                }, 2000); // 2 seconds of silence to auto-stop
            } else {
                setTranscript(finalTranscriptRef.current + interimTranscript);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                toast.error('No speech detected. Try again.');
            } else if (event.error === 'not-allowed') {
                toast.error('Microphone access denied');
            }
            stopListening();
        };

        recognition.onend = () => {
            if (finalTranscriptRef.current) {
                onTranscript(finalTranscriptRef.current.trim());
                toast.success('✅ Voice input added');
            }
            setIsListening(false);
            setTranscript('');
            finalTranscriptRef.current = '';
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, [onTranscript]);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (err) {
                console.error('Failed to start recognition:', err);
                toast.error('Failed to start voice input');
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        <div className={className}>
            <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleListening}
                title={isListening ? "Stop recording" : "Start voice input"}
                className={isListening ? "animate-pulse" : ""}
            >
                {isListening ? (
                    <MicOff className="w-4 h-4" />
                ) : (
                    <Mic className="w-4 h-4" />
                )}
            </Button>
            {transcript && (
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300 max-w-xs">
                    {transcript}
                </div>
            )}
        </div>
    );
}
