import { useState, useEffect } from "react";
import { getLibraryItems, upsertLibraryItem, deleteLibraryItem, LibraryItem } from "@/lib/supa-data";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Footer";

/**
 * ELITE MASTER FINAL - VERSION 3.0
 * This version uses EXPLICIT inline styles and a unique component name 
 * to bypass any potential browser or build-system caching.
 */
export default function EliteMasterFinal() {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [status, setStatus] = useState("Initializing System...");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setStatus("ACCESSING DATABASE...");
        try {
            const data = await getLibraryItems();
            const list = Array.isArray(data) ? data : [];
            const blogOnly = list.filter(i => i && i.category !== 'Chemical Training');
            const sorted = blogOnly.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            setItems(sorted);
            setStatus(`ACTIVE: ${sorted.length} RECORDS LOADED.`);
        } catch (e: any) {
            setError("DATABASE CONNECTION TIMEOUT");
            setStatus("ERROR.");
        }
    };

    const handleMove = (idx: number, dir: 'up' | 'down') => {
        const nextIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= items.length) return;
        const newItems = [...items];
        [newItems[idx], newItems[nextIdx]] = [newItems[nextIdx], newItems[idx]];
        setItems(newItems);
        setStatus("MODIFICATION DETECTED. PLEASE SAVE.");
    };

    const handleSave = async () => {
        setIsSaving(true);
        setStatus("COMMITTING TO SUPABASE...");
        try {
            await Promise.all(items.map((it, i) => upsertLibraryItem({ ...it, sort_order: i + 1 })));
            setStatus("COMMIT SUCCESSFUL.");
            setTimeout(() => setStatus(`STABLE: ${items.length} RECORDS.`), 2000);
        } catch (e) {
            setError("COMMIT FAILED.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`ERASE "${title}"?`)) return;
        setStatus(`ERASING...`);
        try {
            if (await deleteLibraryItem(id)) {
                setItems(prev => prev.filter(i => i.id !== id));
                setStatus("RECORD PURGED.");
            }
        } catch (e) {
            setError("PURGE FAILED.");
        }
    };

    return (
        <div style={{ 
            backgroundColor: '#0a0a0a', 
            color: '#ffffff', 
            minHeight: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <PageHeader title="Elite Story Master v3" />
            
            <main style={{ flex: 1, width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '60px 20px' }}>
                
                {/* GLOBAL STATUS INDICATOR */}
                <div style={{ 
                    backgroundColor: error ? '#450a0a' : '#111', 
                    color: error ? '#ef4444' : '#3b82f6',
                    padding: '16px 24px', 
                    borderRadius: '16px', 
                    marginBottom: '40px',
                    fontSize: '12px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '3px',
                    border: error ? '1px solid #ef4444' : '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: error ? '#ef4444' : '#3b82f6', animation: 'pulse 2s infinite' }} />
                        {status}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '50px' }}>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '72px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', margin: 0, letterSpacing: '-4px', lineHeight: 0.8, color: '#fff' }}>
                            Master <span style={{ color: '#3b82f6' }}>Story</span>
                        </h1>
                        <p style={{ color: '#555', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '6px', fontSize: '11px', marginTop: '12px' }}>
                            REORDER ARCHIVE // STABILITY VERSION 3.0
                        </p>
                    </div>
                    
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || items.length === 0}
                        style={{
                            backgroundColor: isSaving ? '#111' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '20px 40px',
                            borderRadius: '20px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            fontStyle: 'italic',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isSaving ? 'none' : '0 20px 40px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        {isSaving ? 'COMMITTING...' : 'COMMIT LAYOUT'}
                    </button>
                </div>

                {items.length === 0 && !error ? (
                    <div style={{ padding: '120px 0', textAlign: 'center', color: '#222', border: '2px dashed #111', borderRadius: '50px', fontSize: '20px', fontWeight: 'bold' }}>
                        SCANNING FOR ARCHIVES...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {items.map((item, idx) => (
                            <div key={item.id} style={{ 
                                backgroundColor: '#000000', 
                                padding: '24px 32px', 
                                borderRadius: '24px', 
                                border: '1px solid #111',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '32px',
                                transition: 'transform 0.2s, border-color 0.2s'
                            }}>
                                {/* CONTROLS */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <button 
                                        onClick={() => handleMove(idx, 'up')} 
                                        disabled={idx === 0}
                                        style={{ backgroundColor: '#0a0a0a', border: '1px solid #111', color: idx === 0 ? '#111' : '#555', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '10px', fontWeight: 'bold' }}
                                    >▲</button>
                                    <button 
                                        onClick={() => handleMove(idx, 'down')} 
                                        disabled={idx === items.length - 1}
                                        style={{ backgroundColor: '#0a0a0a', border: '1px solid #111', color: idx === items.length - 1 ? '#111' : '#555', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '10px', fontWeight: 'bold' }}
                                    >▼</button>
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '2px' }}>{item.category || 'GENERAL'}</span>
                                        <div style={{ height: '1px', flex: 1, backgroundColor: '#111' }} />
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.title}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleDelete(item.id, item.title || '')}
                                    style={{ 
                                        background: '#0a0a0a', 
                                        border: '1px solid #111', 
                                        color: '#333', 
                                        cursor: 'pointer', 
                                        padding: '12px 20px',
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        fontWeight: '900',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    PURGE
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
            
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
