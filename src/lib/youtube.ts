// Extract YouTube video ID from various URL formats
export const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;

    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
        /youtube\.com\/v\/([^&\s]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
};

// Get YouTube thumbnail URL
export const getYouTubeThumbnail = (url: string): string | null => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

// Get YouTube embed URL
export const getYouTubeEmbedUrl = (url: string): string | null => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
};
