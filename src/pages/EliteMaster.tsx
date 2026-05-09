import { useState, useEffect } from "react";
import { getLibraryItems, upsertLibraryItem, deleteLibraryItem, LibraryItem } from "@/lib/supa-data";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Footer";

export default function EliteMaster() {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [status, setStatus] = useState("Initializing...");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setStatus("Fetching Story Archives...");
        try {
            const data = await getLibraryItems();
            const list = Array.isArray(data) ? data : [];
            const blogOnly = list.filter(i => i && i.category !== 'Chemical Training');
            const sorted = blogOnly.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            setItems(sorted);
            setStatus(`Ready: ${sorted.length} Stories Loaded.`);
        } catch (e: any) {
            setError("Database Sync Failed");
            setStatus("Error.");
        }
    };

    const handleMove = (idx: number, dir: 'up' | 'down') => {
        const nextIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= items.length) return;
        
        const newItems = [...items];
        const temp = newItems[idx];
        newItems[idx] = newItems[nextIdx];
        newItems[nextIdx] = temp;
        
        setItems(newItems);
        setStatus("Layout Modified. Please Save.");
    };

    const handleSave = async () => {
        setIsSaving(true);
        setStatus("Securing Layout to Database...");
        try {
            const updates = items.map((it, i) => upsertLibraryItem({ ...it, sort_order: i + 1 }));
            await Promise.all(updates);
            setStatus("Layout Secured Successfully.");
            setTimeout(() => setStatus(`Active: ${items.length} Stories.`), 2000);
        } catch (e) {
            setError("Failed to Save Layout.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Permanently delete "${title}"?`)) return;
        setStatus(`Deleting "${title}"...`);
        try {
            if (await deleteLibraryItem(id)) {
                setItems(prev => prev.filter(i => i.id !== id));
                setStatus("Story Erased.");
            }
        } catch (e) {
            setError("Delete Operation Failed.");
        }
    };

    return (
        <div style={{ backgroundColor: '#020202', color: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <PageHeader title="Elite Story Master" />
            
            <main style={{ flex: 1, width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
                {/* STATUS BAR */}
                <div style={{ 
                    backgroundColor: error ? '#450a0a' : '#064e3b', 
                    color: error ? '#fecaca' : '#d1fae5',
                    padding: '12px 24px', 
                    borderRadius: '12px', 
                    marginBottom: '30px',
                    fontSize: '11px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    border: error ? '1px solid #991b1b' : '1px solid #065f46',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>{status}</span>
                    {error && <button onClick={() => window.location.reload()} style={{ color: 'white', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}>RETRY</button>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '56px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', margin: 0, letterSpacing: '-2px', lineHeight: 0.9 }}>
                            Elite Master
                        </h1>
                        <p style={{ color: '#444', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '4px', fontSize: '10px', marginTop: '8px' }}>
                            STORY CONTROL HUB // V6.0 STABLE
                        </p>
                    </div>
                    
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || items.length === 0}
                        style={{
                            backgroundColor: isSaving ? '#222' : '#2563eb',
                            color: 'white',
                            border: 'none',
                            padding: '16px 32px',
                            borderRadius: '12px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            fontStyle: 'italic',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            transition: 'all 0.2s',
                            boxShadow: isSaving ? 'none' : '0 10px 20px rgba(37, 99, 235, 0.2)'
                        }}
                    >
                        {isSaving ? 'SECURING...' : 'SAVE LAYOUT'}
                    </button>
                </div>

                {items.length === 0 ? (
                    <div style={{ padding: '100px 0', textAlign: 'center', color: '#333', border: '2px dashed #222', borderRadius: '40px' }}>
                        No Archives Detected.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map((item, idx) => (
                            <div key={item.id} style={{ 
                                backgroundColor: '#0a0a0a', 
                                padding: '20px 24px', 
                                borderRadius: '20px', 
                                border: '1px solid #111',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '24px'
                            }}>
                                {/* ORDER CONTROLS */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <button 
                                        onClick={() => handleMove(idx, 'up')} 
                                        disabled={idx === 0}
                                        style={{ background: '#111', border: 'none', color: idx === 0 ? '#222' : '#444', cursor: 'pointer', padding: '6px', borderRadius: '6px', fontSize: '14px' }}
                                    >▲</button>
                                    <button 
                                        onClick={() => handleMove(idx, 'down')} 
                                        disabled={idx === items.length - 1}
                                        style={{ background: '#111', border: 'none', color: idx === items.length - 1 ? '#222' : '#444', cursor: 'pointer', padding: '6px', borderRadius: '6px', fontSize: '14px' }}
                                    >▼</button>
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '9px', fontWeight: '900', background: '#111', color: '#555', padding: '2px 6px', borderRadius: '4px' }}>#{idx + 1}</span>
                                        <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.category || 'General'}</span>
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                        padding: '8px',
                                        transition: 'color 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                                    onMouseOut={(e) => e.currentTarget.style.color = '#333'}
                                >
                                    DELETE
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
