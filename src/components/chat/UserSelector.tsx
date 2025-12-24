import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Circle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { OnlineUser } from '@/lib/supa-data';

interface UserSelectorProps {
    currentUserEmail: string;
    onSelectRecipient: (email: string | null) => void;
    selectedRecipient: string | null;
    onlineUsers: OnlineUser[];
}

export function UserSelector({ currentUserEmail, onSelectRecipient, selectedRecipient, onlineUsers }: UserSelectorProps) {
    // Deprecated: Internal presence tracking removed in favor of passed prop
    // const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]); 

    // Presence is now managed by parent (GlobalChatWidget)

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
                    {(onlineUsers || [])
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
