'use client';

import { useState, useEffect } from 'react';
import { saveTransaction, getCategories } from '../utils/storage';
import { createClient } from '../utils/supabase/client';
import { saveSupabaseTransaction } from '../utils/supabaseData';

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

export default function QuickAddOverlay({ isOpen, onClose, onSave }) {
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Other');
    const [comment, setComment] = useState('');
    const [type, setType] = useState('expense');
    const [date, setDate] = useState(getTodayDate());
    const [user, setUser] = useState(null);
    const supabase = createClient();
    const categories = getCategories();

    // Check user on mount and auth change
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    // Reset date when overlay opens
    useEffect(() => {
        if (isOpen) {
            setDate(getTodayDate());
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim() || !amount) return;

        const transactionData = {
            title: title.trim(),
            amount: parseFloat(amount),
            category,
            comment: comment.trim(),
            type,
            date
        };

        let saved;
        if (user) {
            saved = await saveSupabaseTransaction(transactionData);
        } else {
            saved = saveTransaction(transactionData);
        }

        if (saved) {
            onSave(saved);
        }

        // Reset form
        setTitle('');
        setAmount('');
        setCategory('Other');
        setComment('');
        setType('expense');
        setDate(getTodayDate());
        onClose();
    };

    if (!isOpen) return null;

    // Handle click on the backdrop (outside the card) to close
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 overlay-backdrop animate-fade-in flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            <div className="glass-card w-full max-w-md animate-slide-up max-h-[90vh] flex flex-col">
                {/* Header - Fixed at top */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
                    <h2 className="text-2xl font-semibold text-white">Quick Add</h2>
                    <button
                        onClick={onClose}
                        className="btn-close"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Scrollable Form Content */}
                <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4 overflow-y-auto flex-1">
                    {/* Type Toggle */}
                    <div className="flex gap-2 p-1 bg-[rgba(30,41,59,0.8)] rounded-xl">
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${type === 'expense'
                                ? 'bg-red-500/20 text-red-400 shadow-lg'
                                : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${type === 'income'
                                ? 'bg-emerald-500/20 text-emerald-400 shadow-lg'
                                : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            Income
                        </button>
                    </div>

                    {/* Amount Input - FIRST */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
                        <div className="input-wrapper">
                            <span className="input-prefix">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                className="input-field"
                                style={{ paddingLeft: '36px' }}
                            />
                        </div>
                    </div>

                    {/* Date Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            max={getTodayDate()}
                            className="input-field"
                        />
                    </div>

                    {/* Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Starbucks Coffee"
                            className="input-field"
                        />
                    </div>

                    {/* Category Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="input-field appearance-none cursor-pointer"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Comment Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Comment (optional)</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add a note..."
                            rows={2}
                            className="input-field resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <button type="submit" className="btn-primary w-full mt-6">
                        Save Transaction
                    </button>
                </form>
            </div>
        </div>
    );
}
