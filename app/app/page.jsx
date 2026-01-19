'use client';

import { useState, useEffect } from 'react';
import QuickAddOverlay from '../components/QuickAddOverlay';
import Dashboard from '../components/Dashboard';
import { getTransactions, deleteTransaction } from '../utils/storage';

export default function Home() {
    const [showOverlay, setShowOverlay] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load transactions on mount
        setTransactions(getTransactions());
        setIsLoaded(true);
    }, []);

    const handleSave = (newTransaction) => {
        setTransactions(prev => [newTransaction, ...prev]);
    };

    const handleDelete = (id) => {
        deleteTransaction(id);
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const handleUpdate = (updatedTransaction) => {
        setTransactions(prev =>
            prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
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
