import { useEffect, useState, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const DraggableScrollToTop = () => {
    const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem('pds_show_scroll_to_top') !== 'false');
    const [position, setPosition] = useState({ x: -24, y: -24 }); // default bottom right offset
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<HTMLButtonElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const rawDragStart = useRef({ x: 0, y: 0 });
    const scrollContainerRef = useRef<HTMLElement | Window>(window);

    useEffect(() => {
        const storedPref = localStorage.getItem('pds_show_scroll_to_top');
        if (storedPref !== null) {
            setIsEnabled(storedPref !== 'false');
        }
        
        const storedPos = localStorage.getItem('pds_scroll_to_top_pos');
        if (storedPos) {
            try {
                const parsed = JSON.parse(storedPos);
                if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    // Check bounds to ensure it's on screen
                    const maxX = 0;
                    const minX = -(window.innerWidth - 60);
                    const maxY = 0;
                    const minY = -(window.innerHeight - 60);
                    const safeX = Math.min(maxX, Math.max(minX, parsed.x));
                    const safeY = Math.min(maxY, Math.max(minY, parsed.y));
                    setPosition({ x: safeX, y: safeY });
                }
            } catch (e) {
                // ignore
            }
        }

        const handleStorage = () => {
            const updatedPref = localStorage.getItem('pds_show_scroll_to_top');
            setIsEnabled(updatedPref !== 'false');
        };
        window.addEventListener('storage', handleStorage);
        // Custom event for same-window updates
        window.addEventListener('pds-settings-updated', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('pds-settings-updated', handleStorage);
        };
    }, []);

    useEffect(() => {
        if (!isEnabled) return;

        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement;
            if (!target || target === document || target === document.documentElement || target === document.body) {
                scrollContainerRef.current = window;
            } else if (target.scrollHeight && target.scrollHeight >= window.innerHeight) {
                scrollContainerRef.current = target;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
        return () => window.removeEventListener('scroll', handleScroll, { capture: true });
    }, [isEnabled]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!dragRef.current) return;
        setIsDragging(false);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        rawDragStart.current = { x: e.clientX, y: e.clientY };
        dragRef.current.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (e.buttons !== 1) return; // Only if primary button is held
        
        if (!isDragging) {
            const dist = Math.max(
                Math.abs(e.clientX - rawDragStart.current.x),
                Math.abs(e.clientY - rawDragStart.current.y)
            );
            if (dist > 5) {
                setIsDragging(true);
            } else {
                return; // below threshold
            }
        }
        const newX = e.clientX - dragStartPos.current.x;
        const newY = e.clientY - dragStartPos.current.y;
        
        // Boundaries constraint
        const maxX = 0;
        const minX = -(window.innerWidth - 60); // 60px approx width
        const maxY = 0;
        const minY = -(window.innerHeight - 60);
        
        setPosition({
            x: Math.min(maxX, Math.max(minX, newX)),
            y: Math.min(maxY, Math.max(minY, newY))
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (dragRef.current) {
            dragRef.current.releasePointerCapture(e.pointerId);
        }
        if (isDragging) {
            localStorage.setItem('pds_scroll_to_top_pos', JSON.stringify(position));
            setTimeout(() => setIsDragging(false), 50); // delay to prevent click
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isDragging) {
            e.preventDefault();
            return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
        const main = document.querySelector('main');
        if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
        if (scrollContainerRef.current && scrollContainerRef.current !== window) {
            try {
                (scrollContainerRef.current as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
            } catch {}
        }
    };

    if (!isEnabled) return null;

    return (
        <Button
            ref={dragRef}
            variant="default"
            size="icon"
            className="fixed z-[99999] h-12 w-12 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 touch-none transition-all duration-300 opacity-100 pointer-events-auto flex items-center justify-center"
            style={{
                bottom: '24px',
                right: '24px',
                transform: `translate(${position.x}px, ${position.y}px)`,
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            title="Scroll to Top (Drag to move)"
        >
            <ArrowUp className="h-6 w-6 stroke-[2.5]" />
        </Button>
    );
};
