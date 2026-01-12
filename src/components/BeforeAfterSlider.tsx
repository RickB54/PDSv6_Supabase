import React, { useState, useRef, useEffect } from 'react';

interface BeforeAfterSliderProps {
    beforeImage: string;
    afterImage: string;
}

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ beforeImage, afterImage }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = 'touches' in e
            ? e.touches[0].clientX - rect.left
            : (e as React.MouseEvent).clientX - rect.left;

        const position = (x / rect.width) * 100;
        setSliderPos(Math.min(Math.max(position, 0), 100));
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl cursor-col-resize select-none border-4 border-white"
            onMouseMove={handleMove}
            onTouchMove={handleMove}
        >
            {/* Before Image (Background) */}
            <img
                src={beforeImage}
                alt="Before"
                className="absolute inset-0 w-full h-full object-cover grayscale brightness-75"
            />

            {/* After Image (Top Layer) */}
            <div
                className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none z-10"
                style={{ width: `${sliderPos}%` }}
            >
                <div className="absolute inset-0 w-[100vw] sm:w-[50vw] md:w-[800px] lg:w-[1200px]" style={{ width: containerRef.current?.offsetWidth }}>
                    <img
                        src={afterImage}
                        alt="After"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                </div>
            </div>

            {/* Slider Line & Handle */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/80 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.5)] z-20 pointer-events-none"
                style={{ left: `${sliderPos}%` }}
            >
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white/50">
                    <div className="flex gap-1">
                        <div className="w-1 h-3 bg-zinc-400 rounded-full" />
                        <div className="w-1 h-3 bg-zinc-400 rounded-full" />
                    </div>
                </div>

                {/* Labels - positioned relative to the slider position */}
                <div className="absolute top-4 right-8 bg-zinc-900/80 backdrop-blur-md px-3 py-1 rounded-sm text-white text-[9px] font-black uppercase tracking-[0.2em] border border-white/10 whitespace-nowrap">
                    The Before
                </div>
                <div className="absolute top-4 left-8 bg-blue-600/80 backdrop-blur-md px-3 py-1 rounded-sm text-white text-[9px] font-black uppercase tracking-[0.2em] border border-blue-400/20 whitespace-nowrap" style={{ transform: `translateX(-100%) translateX(-64px)` }}>
                    The After
                </div>
            </div>
        </div>
    );
};

export default BeforeAfterSlider;
