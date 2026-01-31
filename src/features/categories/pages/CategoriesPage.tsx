import { useEffect, useState } from "react";
import type { Category } from "../../../shared/types/models";
import { useAuth } from "../../auth/auth.context";
import { createCategory, listCategories, removeCategory, updateCategory } from "../categories.service";
import { OfflineBanner } from "../../../shared/components/OfflineBanner";

export function CategoriesPage() {
    const { user } = useAuth(); //AuthGuard ensures this exists
    const [items, setItems] = useState<Category[]>([]);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                const data = await listCategories(user.uid);
                if (!cancelled) setItems(data);
            } catch (e: unknown) {
                console.log(e);
                if (!cancelled) setError('Failed to load categories.');
            } finally {
                setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    async function reload() {
        if (!user) return;
        setLoading(true);
        const data = await listCategories(user.uid);
        setItems(data);
        setLoading(false);
    }

    async function onAdd() {
        if (!user) return;
        setBusy(true);
        setError(null);
        try {
            await createCategory(user.uid, name);
            setName('');

            //reload after write
            await reload();
        } catch (e: unknown) {
            console.error(e);
            setError('Failed to create a category.')
        } finally {
            setBusy(false);
        }
    }

    async function onDelete(id: string) {
        if (!user) return;
        setBusy(true);
        setError(null);

        try {
            await removeCategory(id);

            //reload after delete
            await reload();
        } catch (e: unknown) {
            console.error(e);
            setError('Failed to delete category.');
        } finally {
            setBusy(false);
        }
    }

    async function startEdit(id: string, currentName: string) {
        setEditingId(id);
        setDraftName(currentName);
    }

    async function cancelEdit() {
        setEditingId(null);
        setDraftName('');
    }

    return (
        <div style={{ marginTop: -18, maxWidth: 1100, padding: "24px 16px" }}>
            <h2>Categories</h2>

            <OfflineBanner />

            {!loading ? (
                <>
                    <p style={{ color: "#888", marginTop: -4 }}>
                        Create categories (e.g. Food, Rent, Transport...).
                    </p>
                    
                    <div
                        style={{
                            marginTop: 14,
                            padding: 14,
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.03)",
                            maxWidth: 700,
                        }}
                    >
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <input
                                placeholder="New category name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={busy}
                                style={{
                                    flex: 1,
                                    height: 32,
                                    padding: "4px 10px",
                                    borderRadius: 10,
                                    boxSizing: "border-box",
                                    marginLeft: 2,
                                }}
                            />
                            <button onClick={onAdd} disabled={busy || name.trim().length === 0} style={{ height: 36 }}>
                                {busy ? "Working..." : "Add"}
                            </button>
                        </div>

                        {error && <p style={{ color: "crimson", marginTop: 10, marginBottom: 0 }}>{error}</p>}
                    </div>

                    <h3 style={{ fontSize: 21, marginTop: 32 }}>Your Categories</h3>

                    <ul style={{ marginTop: 10, padding: 0, listStyle: "none", maxWidth: 700, display: "grid", gap: 10 }}>
                        {items.map((c) => (
                            <li
                                key={c.id}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr auto",
                                    gap: 12,
                                    alignItems: "center",
                                    padding: 12,
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: 12,
                                    background: "rgba(255,255,255,0.02)",
                                    marginLeft: 20,
                                }}
                            >
                                {editingId === c.id ? (
                                    <>
                                        <input
                                            value={draftName}
                                            onChange={(e) => setDraftName(e.target.value)}
                                            disabled={busy}
                                            style={{
                                                width: "93%",
                                                minWidth: 0,
                                                height: 32,
                                                padding: "4px 10px",
                                                borderRadius: 10,
                                                boxSizing: "border-box",
                                                marginLeft: 18,
                                            }}
                                        />

                                        <div style={{ marginRight: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                            <button
                                                onClick={async () => {
                                                    setBusy(true);
                                                    setError(null);
                                                    try {
                                                        await updateCategory(c.id, draftName);
                                                        await reload();
                                                        cancelEdit();
                                                    } catch (e: unknown) {
                                                        console.error(e);
                                                        setError("Failed to update category.");
                                                    } finally {
                                                        setBusy(false);
                                                    }
                                                }}
                                                disabled={busy}
                                            >
                                                Save
                                            </button>
                                            <button onClick={cancelEdit} disabled={busy}>
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ marginLeft: 20, fontSize: 18, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {c.name}
                                        </div>

                                        <div style={{ marginRight: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                            <button onClick={() => startEdit(c.id, c.name)} disabled={busy}>
                                                Edit
                                            </button>
                                            <button onClick={() => onDelete(c.id)} disabled={busy}>
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>

                    {items.length === 0 && <p style={{ color: "#666", marginTop: 10 }}>No categories yet.</p>}
                </>
            ) : (
                <p style={{ color: "#666", margin: 0 }}>Loading...</p>
            )}
        </div>
    );
}