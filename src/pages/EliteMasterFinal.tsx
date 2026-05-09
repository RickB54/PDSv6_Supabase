import { useState, useEffect } from "react";
import { getLibraryItems, upsertLibraryItem, deleteLibraryItem, LibraryItem } from "@/lib/supa-data";
import { Save, Trash2, ArrowUp, ArrowDown, RefreshCw, Loader2, Database } from "lucide-react";

/**
 * ELITE MASTER FINAL - VERSION 4.1
 * PURE ISOLATION: No external components (PageHeader/Footer) to prevent cross-page crashes.
 * PURE THEME: Explicit inline styles for dark mode.
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
            setStatus(`READY: ${sorted.length} ARCHIVES.`);
        } catch (e: any) {
            setError("SYNC FAILED");
            setStatus("ERROR.");
        }
    };

    const handleMove = (idx: number, dir: 'up' | 'down') => {
        const nextIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= items.length) return;
        const newItems = [...items];
        [newItems[idx], newItems[nextIdx]] = [newItems[nextIdx], newItems[idx]];
        setItems(newItems);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setStatus("COMMITTING...");
        try {
            await Promise.all(items.map((it, i) => upsertLibraryItem({ ...it, sort_order: i + 1 })));
            setStatus("LAYOUT SECURED.");
            setTimeout(() => setStatus(`STABLE: ${items.length} ARCHIVES.`), 2000);
            await loadData();
        } catch (e) {
            setError("SAVE FAILED.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`ERASE "${title}"?`)) return;
        try {
            if (await deleteLibraryItem(id)) {
                setItems(prev => prev.filter(i => i.id !== id));
                setStatus("PURGED.");
            }
        } catch (e) {
            setError("PURGE FAILED.");
        }
    };

    return (
        <div style={{ 
            backgroundColor: '#020202', 
            color: '#ffffff', 
            minHeight: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* ISOLATED COMPONENT HEADER */}
            <header style={{ 
                padding: '20px 40px', 
                borderBottom: '1px solid #111', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: '#050505'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#3b82f6', borderRadius: '10px' }}>
                        <Database size={20} color="white" />
                    </div>
                    <span style={{ fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', fontSize: '20px', letterSpacing: '-1px' }}>
                        Elite <span style={{ color: '#3b82f6' }}>Story Master</span>
                    </span>
                </div>
                <div style={{ fontSize: '10px', fontWeight: '900', color: error ? '#ef4444' : '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    {status}
                </div>
            </header>

            <main style={{ flex: 1, width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '60px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '60px' }}>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '64px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', margin: 0, letterSpacing: '-3px', lineHeight: 0.8 }}>
                            Master <span style={{ color: '#3b82f6' }}>Story</span>
                        </h1>
                        <p style={{ color: '#333', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '5px', fontSize: '10px', marginTop: '10px' }}>
                            PRIME AUTO DETAIL // BLOG ARCHITECT v4.1
                        </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={loadData}
                            style={{ background: '#111', border: '1px solid #222', color: '#555', padding: '15px', borderRadius: '15px', cursor: 'pointer' }}
                        >
                            <RefreshCw size={20} />
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving || items.length === 0}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '18px 36px',
                                borderRadius: '15px',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                fontStyle: 'italic',
                                cursor: 'pointer',
                                fontSize: '13px',
                                boxShadow: '0 15px 30px rgba(59, 130, 246, 0.2)'
                            }}
                        >
                            {isSaving ? 'SECURING...' : 'SAVE LAYOUT'}
                        </button>
                    </div>
                </div>

                {items.length === 0 && !error ? (
                    <div style={{ padding: '150px 0', textAlign: 'center', color: '#222', border: '2px dashed #111', borderRadius: '40px' }}>
                        <Loader2 size={40} style={{ animation: 'spin 2s linear infinite', marginBottom: '20px' }} />
                        <div style={{ fontWeight: 'bold' }}>SYNCING ARCHIVES...</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {items.map((item, idx) => (
                            <div key={item.id} style={{ 
                                backgroundColor: '#0a0a0a', 
                                padding: '25px 30px', 
                                borderRadius: '24px', 
                                border: '1px solid #151515',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '30px'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <button 
                                        onClick={() => handleMove(idx, 'up')} 
                                        disabled={idx === 0}
                                        style={{ background: '#151515', border: 'none', color: idx === 0 ? '#222' : '#444', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                                    ><ArrowUp size={16} /></button>
                                    <button 
                                        onClick={() => handleMove(idx, 'down')} 
                                        disabled={idx === items.length - 1}
                                        style={{ background: '#151515', border: 'none', color: idx === items.length - 1 ? '#222' : '#444', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                                    ><ArrowDown size={16} /></button>
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase' }}>{item.category || 'General'}</span>
                                        <div style={{ flex: 1, height: '1px', backgroundColor: '#111' }} />
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.title}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleDelete(item.id, item.title || '')}
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        color: '#333', 
                                        cursor: 'pointer', 
                                        padding: '10px',
                                        transition: 'color 0.2s'
                                    }}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <footer style={{ padding: '40px', textAlign: 'center', color: '#111', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Prime Systems // Elite Master v4.1 // Secure Build
            </footer>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
