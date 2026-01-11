import React from 'react';

interface VideoEmbedProps {
    url: string;
    title?: string;
    className?: string;
}

export function VideoEmbed({ url, title, className = "" }: VideoEmbedProps) {
    if (!url) return null;

    const getEmbedInfo = (url: string) => {
        // YouTube
        if (url.includes('youtube.com/watch')) {
            const videoId = new URL(url).searchParams.get('v');
            return { src: `https://www.youtube.com/embed/${videoId}`, type: 'youtube' };
        }
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1].split('?')[0];
            return { src: `https://www.youtube.com/embed/${videoId}`, type: 'youtube' };
        }

        // Facebook
        if (url.includes('facebook.com') && (url.includes('/videos/') || url.includes('/watch/'))) {
            return {
                src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560`,
                type: 'facebook'
            };
        }

        // Instagram
        if (url.includes('instagram.com/p/') || url.includes('instagram.com/reels/') || url.includes('instagram.com/reel/')) {
            const parts = url.split('/');
            const idIndex = parts.findIndex(p => p === 'p' || p === 'reels' || p === 'reel') + 1;
            const postId = parts[idIndex];
            return { src: `https://www.instagram.com/p/${postId}/embed`, type: 'instagram' };
        }

        // TikTok
        if (url.includes('tiktok.com/')) {
            // Find the video ID - it's usually the numbered string at the end
            const match = url.match(/\/video\/(\d+)/);
            const videoId = match ? match[1] : null;
            if (videoId) {
                return { src: `https://www.tiktok.com/embed/v2/${videoId}`, type: 'tiktok' };
            }
        }

        // Fallback to direct iframe if it's already an embed URL, or just the URL
        return { src: url, type: 'other' };
    };

    const { src, type } = getEmbedInfo(url);

    return (
        <div className={`aspect-video w-full bg-black rounded-lg overflow-hidden ${className}`}>
            <iframe
                src={src}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                title={title || "Embedded Video"}
            />
        </div>
    );
}
