import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Circle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { OnlineUser } from '@/lib/supa-data';

interface UserSelectorProps {
    currentUserEmail: string;
    onSelectRecipient: (email: string | null) => void;
    selectedRecipient: string | null;
}

export function UserSelector({ currentUserEmail, onSelectRecipient, selectedRecipient }: UserSelectorProps) {
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

    useEffect(() => {
        // Track presence and get online users
        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: currentUserEmail
                }
            }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users: OnlineUser[] = [];

                Object.keys(state).forEach((presenceKey) => {
                    const presences = state[presenceKey];
                    presences.forEach((presence: any) => {
                        users.push({
                            email: presence.email,
                            name: presence.name,
                            role: presence.role,
                            lastSeen: new Date().toISOString()
                        });
                    });
                });

                setOnlineUsers(users);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track our own presence
                    await channel.track({
                        email: currentUserEmail,
                        name: currentUserEmail.split('@')[0],
                        online_at: new Date().toISOString()
                    });
                }
            });

        return () => {
            channel.unsubscribe();
        };
    }, [currentUserEmail]);

    return (
        <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select
                value={selectedRecipient || 'everyone'}
                onValueChange={(value) => onSelectRecipient(value === 'everyone' ? null : value)}
            >
                <SelectTrigger className="h-9 w-[200px]">
                    <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="everyone">
                        <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>Everyone (Public)</span>
                        </div>
                    </SelectItem>
                    {onlineUsers
                        .filter(user => user.email !== currentUserEmail)
                        .map((user) => (
                            <SelectItem key={user.email} value={user.email}>
                                <div className="flex items-center gap-2">
                                    <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                                    <span>{user.name || user.email}</span>
                                    {user.role && <span className="text-xs text-muted-foreground">({user.role})</span>}
                                </div>
                            </SelectItem>
                        ))}
                </SelectContent>
            </Select>
        </div>
    );
}
