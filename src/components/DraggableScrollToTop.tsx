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
    const lastScrollY = useRef(0);

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

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            // Show only when scrolling up AND not near the very top (e.g., > 200px)
            if (currentScrollY < lastScrollY.current && currentScrollY > 200) {
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY.current || currentScrollY <= 200) {
                setIsVisible(false);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isEnabled]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!dragRef.current) return;
        setIsDragging(false);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        dragRef.current.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (e.buttons !== 1) return; // Only if primary button is held
        setIsDragging(true);
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
