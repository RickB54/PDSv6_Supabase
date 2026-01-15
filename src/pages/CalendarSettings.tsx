import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
    initGoogleCalendar,
    signInToGoogle,
    signOutFromGoogle,
    isSignedIn,
    saveCalendarConfig,
    getCalendarConfig,
    CalendarConfig
} from '@/lib/googleCalendar';
import { Calendar, Clock, Shield, AlertCircle } from 'lucide-react';

/**
 * Admin panel for Google Calendar integration
 * Allows configuration of availability settings
 */
export default function CalendarSettings() {
    const { toast } = useToast();
    const [config, setConfig] = useState<CalendarConfig>({
        clientId: '',
        apiKey: '',
        calendarIds: ['primary'],
        maxBookingsPerDay: 1,
        bufferMinutes: 120,
        recoveryDays: []
    });
    const [signedIn, setSignedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [apiConfigured, setApiConfigured] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const loadedConfig = await getCalendarConfig();
                setConfig(loadedConfig);

                if (loadedConfig.clientId && loadedConfig.apiKey) {
                    setApiConfigured(true);
                    initGoogleCalendar(loadedConfig)
                        .then(() => {
                            setSignedIn(isSignedIn());
                        })
                        .catch(err => {
                            console.error('Calendar init error:', err);
                        });
                }
            } catch (err) {
                console.error('Failed to load config:', err);
            }
        };
        load();
    }, []);

    const handleSignIn = async () => {
        setLoading(true);
        try {
            await signInToGoogle();
            setSignedIn(true);
            toast({
                title: 'Connected to Google Calendar',
                description: 'Your availability will now sync automatically.'
            });
        } catch (error) {
            toast({
                title: 'Connection failed',
                description: 'Please check your API credentials.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        setLoading(true);
        try {
            await signOutFromGoogle();
            setSignedIn(false);
            // Clear from local storage as well for immediate UI response
            localStorage.removeItem('g_cal_token');
            localStorage.removeItem('g_cal_connected');
            toast({
                title: 'Disconnected',
                description: 'Calendar sync has been disabled.'
            });
        } catch (error) {
            console.error('Sign out error:', error);
            toast({ title: 'Logout failed', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setLoading(true);
        try {
            await saveCalendarConfig(config);

            // Reinitialize if credentials changed
            if (config.clientId && config.apiKey) {
                await initGoogleCalendar(config);
                setApiConfigured(true);
            }

            toast({
                title: 'Settings saved',
                description: 'Calendar configuration updated successfully.'
            });
        } catch (error) {
            toast({
                title: 'Save failed',
                description: 'Please check your settings and try again.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        setLoading(true);
        try {
            await signOutFromGoogle();
            localStorage.clear(); // Nuclear option for stuck local state
            window.location.reload(); // Hard refresh to reset all singletons
        } catch (e) {
            setLoading(false);
        }
    };

    const toggleRecoveryDay = (day: number) => {
        const days = [...config.recoveryDays];
        const index = days.indexOf(day);
        if (index > -1) {
            days.splice(index, 1);
        } else {
            days.push(day);
        }
        setConfig({ ...config, recoveryDays: days });
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <div className="space-y-6">
            {/* Privacy Notice */}
            <Card className="p-6 bg-blue-950/20 border-blue-900/30">
                <div className="flex items-start gap-4">
                    <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                    <div className="space-y-2">
                        <h3 className="font-bold text-blue-400 uppercase tracking-tight">Privacy Protected</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            This integration only checks if you're <strong>busy or free</strong>. Event titles, descriptions, and personal details are <strong>never</strong> accessed or displayed publicly. Customers only see available/unavailable time slots.
                        </p>
                    </div>
                </div>
            </Card>

            {/* API Configuration */}
            <Card className="p-6 bg-zinc-900 border-zinc-800">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                        <Calendar className="w-5 h-5 text-red-500" />
                        <h3 className="font-black text-white uppercase tracking-tight">Google Calendar API Setup</h3>
                    </div>

                    <div className="space-y-4 bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase font-bold">Client ID</Label>
                            <Input
                                className="bg-zinc-900 border-zinc-700 text-white font-mono text-xs"
                                value={config.clientId}
                                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                                placeholder="123456789-abc123.apps.googleusercontent.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase font-bold">API Key</Label>
                            <Input
                                type="password"
                                className="bg-zinc-900 border-zinc-700 text-white font-mono text-xs"
                                value={config.apiKey}
                                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                placeholder="AIza..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase font-bold">Calendar ID (usually "primary")</Label>
                            <Input
                                className="bg-zinc-900 border-zinc-700 text-white font-mono text-xs"
                                value={config.calendarIds[0] || 'primary'}
                                onChange={(e) => setConfig({ ...config, calendarIds: [e.target.value] })}
                                placeholder="primary"
                            />
                        </div>
                    </div>

                    {!apiConfigured && (
                        <div className="flex items-start gap-3 p-4 bg-yellow-950/20 border border-yellow-900/30 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-200">
                                <p className="font-bold mb-1">Setup Required</p>
                                <p className="text-yellow-300/80">
                                    Visit <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a> to create OAuth credentials. Enable the Google Calendar API and add your site URL to authorized origins.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Connection Status */}
            {apiConfigured && (
                <Card className="p-6 bg-zinc-900 border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${signedIn ? 'bg-green-500' : 'bg-zinc-600'}`} />
                            <div>
                                <h3 className="font-bold text-white">Calendar Connection</h3>
                                <p className="text-sm text-zinc-400">
                                    {signedIn ? 'Connected and syncing' : 'Not connected'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {signedIn && (
                                <Button
                                    variant="outline"
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="border-zinc-700 text-zinc-400 hover:text-white"
                                >
                                    Reset
                                </Button>
                            )}
                            <Button
                                onClick={signedIn ? handleSignOut : handleSignIn}
                                disabled={loading}
                                className={signedIn ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-red-700 hover:bg-red-800'}
                            >
                                {loading ? 'Processing...' : signedIn ? 'Disconnect' : 'Connect Calendar'}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Workload Limits */}
            <Card className="p-6 bg-zinc-900 border-zinc-800">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-5 h-5 text-red-500" />
                        <h3 className="font-black text-white uppercase tracking-tight">Workload Limits</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase font-bold">Max Bookings Per Day</Label>
                            <Input
                                type="number"
                                min="1"
                                max="10"
                                className="bg-zinc-950 border-zinc-800 text-white"
                                value={config.maxBookingsPerDay}
                                onChange={(e) => setConfig({ ...config, maxBookingsPerDay: parseInt(e.target.value) || 1 })}
                            />
                            <p className="text-xs text-zinc-500">Limit daily bookings to prevent burnout</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase font-bold">Buffer Time (minutes)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="480"
                                step="30"
                                className="bg-zinc-950 border-zinc-800 text-white"
                                value={config.bufferMinutes}
                                onChange={(e) => setConfig({ ...config, bufferMinutes: parseInt(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-zinc-500">Recovery time between bookings</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Recovery Days */}
            <Card className="p-6 bg-zinc-900 border-zinc-800">
                <div className="space-y-4">
                    <h3 className="font-black text-white uppercase tracking-tight">Recovery Days</h3>
                    <p className="text-sm text-zinc-400">Block entire days from booking (no availability shown)</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {dayNames.map((day, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800"
                            >
                                <Switch
                                    checked={config.recoveryDays.includes(index)}
                                    onCheckedChange={() => toggleRecoveryDay(index)}
                                />
                                <Label className="text-sm text-white cursor-pointer">
                                    {day}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSaveConfig}
                    disabled={loading}
                    className="bg-red-700 hover:bg-red-800 px-8 font-bold uppercase"
                >
                    {loading ? 'Saving...' : 'Save Configuration'}
                </Button>
            </div>
        </div>
    );
}
