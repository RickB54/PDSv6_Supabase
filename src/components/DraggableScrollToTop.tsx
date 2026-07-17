import { useEffect, useState, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const DraggableScrollToTop = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isEnabled, setIsEnabled] = useState(true);
    const [position, setPosition] = useState({ x: -24, y: -24 }); // default bottom right offset
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<HTMLButtonElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const rawDragStart = useRef({ x: 0, y: 0 });
    const lastScrollY = useRef(0);
    const scrollContainerRef = useRef<HTMLElement | Window>(window);

    useEffect(() => {
        const storedPref = localStorage.getItem('pds_show_scroll_to_top');
        if (storedPref !== null) {
            setIsEnabled(storedPref === 'true');
        }
        
        const storedPos = localStorage.getItem('pds_scroll_to_top_pos');
        if (storedPos) {
            try {
                setPosition(JSON.parse(storedPos));
            } catch (e) {
                // ignore
            }
        }

        const handleStorage = () => {
            const updatedPref = localStorage.getItem('pds_show_scroll_to_top');
            if (updatedPref !== null) {
                setIsEnabled(updatedPref === 'true');
            }
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
        if (!isEnabled) {
            setIsVisible(false);
            return;
        }

        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement;
            
            // Ignore tiny scrolling containers like small dropdowns
            if (target && target.scrollHeight && target.scrollHeight < window.innerHeight) {
                return;
            }

            const isDoc = !target || target === document || target === document.documentElement || target === document.body;
            const currentScrollY = isDoc ? window.scrollY : target.scrollTop;
            
            if (currentScrollY === undefined) return;

            scrollContainerRef.current = isDoc ? window : target;

            // Show whenever scrolled down past 100px
            if (currentScrollY > 100) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
            lastScrollY.current = currentScrollY;
        };

        // Use capture phase to catch scroll events from any inner container
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
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        setIsVisible(false);
    };

    if (!isEnabled) return null;

    return (
        <Button
            ref={dragRef}
            variant="default"
            size="icon"
            className={`fixed z-[100] h-12 w-12 rounded-full shadow-2xl bg-zinc-200/50 backdrop-blur-md text-zinc-900 border border-zinc-400/30 touch-none transition-opacity duration-300 ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
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
            <ArrowUp className="h-6 w-6" />
        </Button>
    );
};
