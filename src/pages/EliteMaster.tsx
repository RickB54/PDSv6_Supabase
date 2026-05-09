import { useState, useEffect } from "react";
import { getLibraryItems, LibraryItem } from "@/lib/supa-data";

export default function EliteMaster() {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [status, setStatus] = useState("Initializing...");

    useEffect(() => {
        async function load() {
            setStatus("Fetching from Database...");
            try {
                const data = await getLibraryItems();
                setStatus(`Found ${data.length} total items in library.`);
                const blogOnly = data.filter(i => i.category !== 'Chemical Training');
                setItems(blogOnly);
                setStatus(prev => prev + ` | ${blogOnly.length} are Blog posts.`);
            } catch (e: any) {
                setStatus("Error: " + e.message);
            }
        }
        load();
    }, []);

    return (
        <div style={{ padding: '50px', background: 'white', color: 'black', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            <h1 style={{ borderBottom: '4px solid red', paddingBottom: '10px' }}>SYSTEM RECOVERY: STORY MASTER</h1>
            <div style={{ background: '#fff9c4', padding: '10px', marginBottom: '20px', fontWeight: 'bold' }}>
                STATUS: {status}
            </div>
            
            <div style={{ marginTop: '20px' }}>
                {items.length === 0 ? (
                    <p>No blog posts found. If you expect posts here, there may be a database connection issue.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {items.map(item => (
                            <li key={item.id} style={{ padding: '15px', border: '1px solid #ddd', marginBottom: '10px', borderRadius: '8px' }}>
                                <strong>{item.title}</strong> ({item.category})
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <button 
                onClick={() => window.location.reload()}
                style={{ marginTop: '30px', padding: '10px 20px', cursor: 'pointer' }}
            >
                REFRESH SYSTEM
            </button>
        </div>
    );
}
