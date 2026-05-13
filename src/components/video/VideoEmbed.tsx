import React from 'react';

interface VideoEmbedProps {
    url: string;
    title?: string;
    className?: string;
}

export function VideoEmbed({ url, title, className = "" }: VideoEmbedProps) {
    if (!url) return null;

    const getEmbedInfo = (url: string) => {
        if (!url) return { src: '', type: 'other' };

        // YouTube
        if (url.includes('youtube.com/watch')) {
            try {
                const videoId = new URL(url).searchParams.get('v');
                return { src: `https://www.youtube.com/embed/${videoId}`, type: 'youtube' };
            } catch (e) {
                return { src: url, type: 'other' };
            }
        }
        if (url.includes('youtube.com/shorts/')) {
            const videoId = url.split('shorts/')[1].split('?')[0];
            return { src: `https://www.youtube.com/embed/${videoId}`, type: 'youtube' };
        }
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1].split('?')[0];
            return { src: `https://www.youtube.com/embed/${videoId}`, type: 'youtube' };
        }

        // Google Drive
        if (url.includes('drive.google.com')) {
            let embedUrl = url;
            if (url.includes('/view')) {
                embedUrl = url.replace('/view', '/preview');
            } else if (!url.includes('/preview')) {
                // Try to extract ID and form preview URL
                const match = url.match(/\/d\/([^/]+)/);
                if (match && match[1]) {
                    embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
                }
            }
            return { src: embedUrl, type: 'google-drive' };
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
            const match = url.match(/\/video\/(\d+)/);
            const videoId = match ? match[1] : null;
            if (videoId) {
                return { src: `https://www.tiktok.com/embed/v2/${videoId}`, type: 'tiktok' };
            }
        }

        // Direct Video Files
        if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
            return { src: url, type: 'direct' };
        }

        // Fallback
        return { src: url, type: 'other' };
    };

    const { src, type } = getEmbedInfo(url);

    return (
        <div className={`aspect-video w-full bg-black rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
            {type === 'direct' ? (
                <video 
                    src={src} 
                    controls 
                    className="w-full h-full"
                    playsInline
                >
                    Your browser does not support the video tag.
                </video>
            ) : (
                <iframe
                    src={src}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                    title={title || "Embedded Video"}
                />
            )}
        </div>
    );
}
