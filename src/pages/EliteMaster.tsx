import { useState, useEffect } from "react";
import { getLibraryItems, LibraryItem } from "@/lib/supa-data";

export default function EliteMaster() {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [status, setStatus] = useState("Initializing...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setStatus("Fetching Story Archives...");
            try {
                const data = await getLibraryItems();
                if (!Array.isArray(data)) {
                    throw new Error("Database returned invalid data format.");
                }
                setStatus(`Sync Complete: ${data.length} items found.`);
                const blogOnly = data.filter(i => i && i.category !== 'Chemical Training');
                setItems(blogOnly);
            } catch (e: any) {
                console.error("EliteMaster Load Error:", e);
                setError(e.message || "Unknown Database Error");
            }
        }
        load();
    }, []);

    return (
        <div style={{ 
            backgroundColor: '#0a0a0a', 
            color: '#ffffff', 
            minHeight: '100vh', 
            padding: '40px', 
            fontFamily: 'system-ui, sans-serif' 
        }}>
            {/* FORCE VISIBLE HEADER */}
            <h1 style={{ 
                fontSize: '48px', 
                fontWeight: '900', 
                textTransform: 'uppercase', 
                fontStyle: 'italic', 
                margin: '0 0 10px 0',
                color: '#ffffff',
                borderBottom: '2px solid #3b82f6'
            }}>
                Story Control Hub
            </h1>
            
            <div style={{ 
                backgroundColor: '#1a1a1a', 
                padding: '15px', 
                borderRadius: '8px', 
                border: '1px solid #333',
                fontSize: '14px',
                fontWeight: 'bold',
                color: error ? '#ef4444' : '#22c55e',
                marginBottom: '30px'
            }}>
                STATUS: {error ? `CRITICAL ERROR: ${error}` : status}
            </div>

            {items.length === 0 && !error ? (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                    Waiting for archives to populate... (Checking 40+ posts)
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {items.map((item, idx) => (
                        <div key={item.id || idx} style={{ 
                            backgroundColor: '#121212', 
                            padding: '20px', 
                            borderRadius: '16px', 
                            border: '1px solid #222',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {item.category || 'General'}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {item.title}
                                </div>
                            </div>
                            <div style={{ color: '#444', fontSize: '12px' }}>
                                #{idx + 1}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: '50px', fontSize: '10px', color: '#333', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Prime Detailing Systems // Elite Story Master v2.0
            </div>
        </div>
    );
}
