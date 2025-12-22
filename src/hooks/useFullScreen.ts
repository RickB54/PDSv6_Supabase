import { useState, useCallback, useEffect } from 'react';

export function useFullScreen() {
    const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);

    const toggleFullScreen = useCallback(async () => {
        if (!document.fullscreenElement) {
            try {
                await document.documentElement.requestFullscreen();
            } catch (e) {
                console.error("Failed to enter fullscreen", e);
            }
        } else {
            try {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            } catch (e) {
                console.error("Failed to exit fullscreen", e);
            }
        }
    }, []);

    useEffect(() => {
        const handleChange = () => setIsFullScreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

    return { isFullScreen, toggleFullScreen };
}
