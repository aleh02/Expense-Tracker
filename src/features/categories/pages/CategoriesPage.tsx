import { useEffect, useState } from "react";
import type { Category } from "../../../shared/types/models";
import { useAuth } from "../../auth/auth.context";
import { createCategory, listCategories, removeCategory } from "../categories.service";


export function CategoriesPage() {
    const { user } = useAuth(); //AuthGuard ensures this exists
    const [items, setItems] = useState<Category[]>([]);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if(!user) return;

        let cancelled = false;

        (async () => {
            try {
                const data = await listCategories(user.uid);
                if(!cancelled) setItems(data);
            } catch(e: unknown) {
                console.log(e);
                if(!cancelled) setError('Failed to load categories.');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    async function onAdd() {
        if(!user) return;
        setBusy(true);
        setError(null);
        try {
            await createCategory(user.uid, name);
            setName('');
            
            //reload after write
            const data = await listCategories(user.uid);
            setItems(data);
        } catch(e: unknown) {
            console.error(e);
            setError('Failed to create a category.')
        } finally {
            setBusy(false);
        }
    }

    async function onDelete(id: string) {
        if(!user) return;
        setBusy(true);
        setError(null);

        try{
            await removeCategory(id);

            //reload after delete
            const data = await listCategories(user.uid);
            setItems(data);
        } catch(e: unknown) {
            console.error(e);
            setError('Failed to delete category.');
        } finally {
            setBusy(false);
        }  
    }

    return (
        <div>
            <h2>Categories</h2>
            <p style={{ color: '#666', marginTop: 4 }}>
                Create categories (e.g. Food, Rent, Transport...).
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input 
                    placeholder="New category name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                />
                <button onClick={onAdd} disabled={busy || name.trim().length === 0}>
                    {busy ? 'Working...' : 'Add'}
                </button>
            </div>

            {error && <p style={{ color: 'crimson' }}>{error}</p>}

            <ul style={{ marginTop: 16 }}>
                {items.map((c) => (
                    <li key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span>{c.name}</span>
                        <button onClick={() => onDelete(c.id)} disabled={busy}>
                            Delete
                        </button>
                    </li>
                ))}
            </ul>

            {items.length === 0 && <p style={{ color: '#666' }}>No categories yet.</p>}
        </div>
    )
}