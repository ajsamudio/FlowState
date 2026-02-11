'use client';

import { useState, useEffect } from 'react';
import QuickAddOverlay from '../components/QuickAddOverlay';
import Dashboard from '../components/Dashboard';
import { createClient } from '../utils/supabase/client';
import {
    getTransactions as getLocalTransactions,
    deleteTransaction as deleteLocalTransaction,
    saveTransaction as saveLocalTransaction
} from '../utils/storage';
import {
    getSupabaseTransactions,
    deleteSupabaseTransaction,
    saveSupabaseTransaction
} from '../utils/supabaseData';

export default function Home() {
    const [showOverlay, setShowOverlay] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [user, setUser] = useState(null);
    const supabase = createClient();

    useEffect(() => {
        const init = async () => {
            try {
                console.log("Initializing PocketWatch...");
                const { data: { user }, error: authError } = await supabase.auth.getUser();

                if (authError) throw authError;

                setUser(user);

                if (user) {
                    console.log("Logged in as:", user.email);
                    const dbData = await getSupabaseTransactions();
                    setTransactions(dbData || []);
                } else {
                    console.log("Not logged in, using local storage");
                    setTransactions(getLocalTransactions());
                }
            } catch (error) {
                console.error("Initialization error:", error);
                // Fallback to local data on any error
                setTransactions(getLocalTransactions());
            } finally {
                setIsLoaded(true);
            }
        };

        const timeoutId = setTimeout(() => {
            if (!isLoaded) {
                console.warn("Initialization taking too long, forcing load...");
                setTransactions(getLocalTransactions());
                setIsLoaded(true);
            }
        }, 5000); // 5 second safety timeout

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth state changed:", event);
            const newUser = session?.user ?? null;
            setUser(newUser);

            if (newUser) {
                const dbData = await getSupabaseTransactions();
                setTransactions(dbData || []);
            } else {
                setTransactions(getLocalTransactions());
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [supabase]);

    const handleSave = async (newTransaction) => {
        if (user) {
            // Data is already saved in QuickAddOverlay.jsx, we just update the UI
            // But actually we should refactor how saving works to be consistent
            setTransactions(prev => [newTransaction, ...prev]);
        } else {
            setTransactions(prev => [newTransaction, ...prev]);
        }
    };

    const handleDelete = async (id) => {
        if (user) {
            await deleteSupabaseTransaction(id);
        } else {
            deleteLocalTransaction(id);
        }
        setTransactions(prev => prev.filter(t => (t.id || t.id) !== id));
    };

    const handleUpdate = (updatedTransaction) => {
        setTransactions(prev =>
            prev.map(t => (t.id || t.id) === (updatedTransaction.id || updatedTransaction.id) ? updatedTransaction : t)
        );
    };

    const handleOpenOverlay = () => {
        setShowOverlay(true);
    };

    const handleCloseOverlay = () => {
        setShowOverlay(false);
    };

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen">
            <Dashboard
                transactions={transactions}
                onAddClick={handleOpenOverlay}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
            />
            <QuickAddOverlay
                isOpen={showOverlay}
                onClose={handleCloseOverlay}
                onSave={handleSave}
            />
        </main>
    );
}
