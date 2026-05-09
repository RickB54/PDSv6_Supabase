import { useState, useEffect } from "react";
import { getLibraryItems, upsertLibraryItem, deleteLibraryItem, LibraryItem } from "@/lib/supa-data";

/**
 * ELITE MASTER V4 - ULTIMATE STABILITY
 * This version uses MOCK DATA if Supabase fails or is slow, 
 * to prove that the UI is working.
 */
export default function EliteMasterFinal() {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [status, setStatus] = useState("SYSTEM BOOTING...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setStatus("DIAGNOSTIC: CONNECTING TO ARCHIVE...");
            try {
                const data = await getLibraryItems();
                if (data && data.length > 0) {
                    const blogOnly = data.filter(i => i && i.category !== 'Chemical Training');
                    setItems(blogOnly.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
                    setStatus(`SYNC SUCCESS: ${blogOnly.length} STORIES.`);
                } else {
                    setStatus("DB EMPTY: LOADING MOCK DATA FOR RECOVERY...");
                    setItems([
                        { id: 'mock-1', title: 'MOCK STORY: IF YOU SEE THIS, DB IS EMPTY', category: 'SYSTEM' },
                        { id: 'mock-2', title: 'MOCK STORY: CHECK CONNECTION', category: 'SYSTEM' }
                    ]);
                }
            } catch (e: any) {
                setError("CONNECTION BLOCKED");
                setStatus("EMERGENCY MOCK LOAD...");
                setItems([
                    { id: 'err-1', title: 'ERROR RECOVERY MODE ACTIVE', category: 'CRITICAL' },
                    { id: 'err-2', title: `ERROR DETAILS: ${e.message}`, category: 'SYSTEM' }
                ]);
            }
        };
        load();
    }, []);

    return (
        <div style={{ 
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#111', 
            color: '#00ff00', // NEON GREEN TEXT
            zIndex: 9999,
            overflowY: 'auto',
            padding: '100px 50px',
            fontFamily: 'monospace'
        }}>
            <h1 style={{ color: '#ff00ff', fontSize: '40px', borderBottom: '5px solid #ff00ff' }}>
                ELITE MASTER V4: FORCE RENDER
            </h1>
            
            <div style={{ 
                border: '2px solid #00ff00', 
                padding: '20px', 
                margin: '20px 0',
                backgroundColor: '#000'
            }}>
                STATUS: {status}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {items.map((item, idx) => (
                    <div key={item.id} style={{ 
                        border: '1px solid #555', 
                        padding: '30px',
                        backgroundColor: '#1a1a1a',
                        fontSize: '24px'
                    }}>
                        {idx + 1}. {item.title} [{item.category}]
                    </div>
                ))}
            </div>

            <button 
                onClick={() => window.location.reload()}
                style={{
                    marginTop: '50px',
                    padding: '20px',
                    backgroundColor: '#ff00ff',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                }}
            >
                FORCE RELOAD SYSTEM
            </button>
        </div>
    );
}
