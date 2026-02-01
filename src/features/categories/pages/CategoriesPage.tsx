import React, { useEffect, useState } from "react";
import type { Category } from "../../../shared/types/models";
import { useAuth } from "../../auth/auth.context";
import { createCategory, listCategories, removeCategory, updateCategory } from "../categories.service";
import { OfflineBanner } from "../../../shared/components/OfflineBanner";
import styles from "../../../app/layouts/AppShell.module.css";

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

    function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        onAdd();
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

    async function onSaveEdit(id: string) {
        if (!user) return;
        if (draftName.trim().length === 0) {
            setError("Category name cannot be empty.");
            return;
        }

        setBusy(true);
        setError(null);
        try {
            await updateCategory(id, draftName.trim());
            await reload();
            cancelEdit();
        } catch (e: unknown) {
            console.error(e);
            setError("Failed to update category.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ marginTop: -18, maxWidth: 1100, padding: "24px 16px" }}>
            <h2 style={{ margin: 0, fontWeight: 800 }}>Categories</h2>

            <OfflineBanner />

            {!loading ? (
                <>
                    <p className={styles.muted}>
                        Create categories (e.g. Food, Rent, Transport...).
                    </p>

                    <div
                        className={styles.card}
                        style={{
                            marginTop: 14,
                            padding: 14,
                            borderRadius: 14,
                            maxWidth: 700,
                        }}
                    >
                        <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <input
                                className={styles.input}
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

                            <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                type="submit"
                                disabled={busy || name.trim().length === 0}
                                style={{ height: 36, padding: "0 14px", borderRadius: 10 }}
                            >
                                {busy ? "Working..." : "Add"}
                            </button>
                        </form>

                        {error && (
                            <p className={styles.danger} style={{ marginTop: 10, marginBottom: 0 }}>
                                {error}
                            </p>
                        )}
                    </div>

                    <h3 style={{ fontSize: 21, fontWeight: 800, marginTop: 32 }}>Your Categories</h3>

                    <ul
                        style={{
                            marginTop: 10,
                            padding: 0,
                            listStyle: "none",
                            maxWidth: 700,
                            display: "grid",
                            gap: 10,
                        }}
                    >
                        {items.map((c) => (
                            <li
                                key={c.id}
                                className={styles.listItem}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr auto",
                                    gap: 12,
                                    alignItems: "center",
                                    padding: 12,
                                    borderRadius: 12,
                                    marginLeft: 20,
                                }}
                            >
                                {editingId === c.id ? (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            onSaveEdit(c.id);
                                        }}
                                        style={{ display: "contents" }}
                                    >
                                        <input
                                            className={styles.input}
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
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") cancelEdit();
                                            }}
                                            autoFocus
                                        />

                                        <div style={{ marginRight: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                            <button
                                                className={`${styles.btn} ${styles.btnPrimary}`}
                                                type="submit"
                                                disabled={busy}
                                                style={{ height: 32, padding: "0 12px", borderRadius: 10 }}
                                            >
                                                Save
                                            </button>

                                            <button
                                                className={styles.btn}
                                                type="button"
                                                onClick={cancelEdit}
                                                disabled={busy}
                                                style={{ height: 32, padding: "0 12px", borderRadius: 10 }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div
                                            style={{
                                                marginLeft: 20,
                                                fontSize: 18,
                                                fontWeight: 600,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {c.name}
                                        </div>

                                        <div style={{ marginRight: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                            <button
                                                className={styles.btn}
                                                onClick={() => startEdit(c.id, c.name)}
                                                disabled={busy}
                                                style={{ height: 32, padding: "0 12px", borderRadius: 10 }}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                className={styles.btn}
                                                onClick={() => onDelete(c.id)}
                                                disabled={busy}
                                                style={{ height: 32, padding: "0 12px", borderRadius: 10 }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>

                    {items.length === 0 && (
                        <p className={styles.muted} style={{ marginTop: 10 }}>
                            No categories yet.
                        </p>
                    )}
                </>
            ) : (
                <p className={styles.muted} style={{ margin: 0 }}>
                    Loading...
                </p>
            )}
        </div>
    );
}