'use client';

import { useState, useEffect } from 'react';
import { getTransactions, getMonthlySpending, getSettings, getEOYSavingsData, deleteTransaction, updateSettings, updateTransaction, getCategories } from '../utils/storage';

import UserMenu from './UserMenu';

import { createClient } from '../utils/supabase/client';
import { getSupabaseSettings, updateSupabaseSettings, getEOYSavingsData as getSupabaseEOYData, updateSupabaseTransaction } from '../utils/supabaseData';

// Progress Ring Component
function ProgressRing({ progress, size = 180, strokeWidth = 12 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

    // Color based on progress
    const getColor = () => {
        if (progress < 50) return '#10b981'; // emerald
        if (progress < 75) return '#f59e0b'; // warning
        return '#ef4444'; // danger
    };

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="progress-ring" width={size} height={size}>
                {/* Background circle */}
                <circle
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress circle */}
                <circle
                    className="progress-ring__circle"
                    stroke={getColor()}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: offset,
                        filter: `drop-shadow(0 0 8px ${getColor()}40)`
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{Math.round(progress)}%</span>
                <span className="text-sm text-gray-400">of budget</span>
            </div>
        </div>
    );
}

// EOY Savings Chart Component - Positive focused design with clickable months
function SavingsChart({ data, savingsGoal, selectedMonth, onMonthClick }) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    // Calculate monthly savings (income - expenses) for each month, floor at 0 for display
    const monthlySavings = data.map(d => Math.max(d.savings || 0, 0));

    // Calculate total saved so far (only positive contributions)
    const totalSaved = data.slice(0, currentMonth + 1).reduce((sum, d) => {
        return sum + Math.max(d.savings || 0, 0);
    }, 0);

    // Find max value for scaling bars
    const maxMonthlySaving = Math.max(...monthlySavings.slice(0, currentMonth + 1), 1);
    const chartHeight = 100;

    // Progress percentage toward goal
    const progressPercent = Math.min((totalSaved / savingsGoal) * 100, 100);

    // Remaining to goal
    const remaining = Math.max(savingsGoal - totalSaved, 0);

    // Encouraging message based on progress
    const getMessage = () => {
        if (progressPercent >= 100) return "🎉 Goal achieved!";
        if (progressPercent >= 75) return "Almost there! Keep going!";
        if (progressPercent >= 50) return "Halfway to your goal!";
        if (progressPercent >= 25) return "Great progress!";
        if (progressPercent > 0) return "You've started saving!";
        return "Start saving to reach your goal";
    };

    return (
        <div className="w-full">
            {/* Instruction text */}
            <p className="text-xs text-gray-500 text-center mb-3">Tap a month to view details</p>

            {/* Monthly savings bars - ALL months are clickable */}
            <div className="flex items-end justify-between gap-1.5 h-28 px-1 mb-2">
                {months.map((month, i) => {
                    const saving = monthlySavings[i] || 0;
                    const height = maxMonthlySaving > 0 ? (saving / maxMonthlySaving) * chartHeight : 0;
                    const isSelected = i === selectedMonth;
                    const isPast = i <= currentMonth;

                    return (
                        <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                            onClick={() => onMonthClick && onMonthClick(i)}
                        >
                            {/* Bar */}
                            <div
                                className={`w-full rounded-t-md transition-all duration-300 ${isSelected
                                    ? 'bg-gradient-to-t from-cyan-500 to-cyan-300'
                                    : isPast
                                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300'
                                        : 'bg-gray-600 group-hover:bg-gray-500'
                                    }`}
                                style={{
                                    height: isPast ? `${Math.max(height, 8)}px` : '8px',
                                    opacity: isSelected ? 1 : isPast ? 0.7 : 0.4,
                                    boxShadow: isSelected ? '0 0 16px rgba(6, 182, 212, 0.6)' : 'none',
                                    transform: isSelected ? 'scaleX(1.15)' : 'scaleX(1)'
                                }}
                            />
                            <span className={`text-[10px] transition-colors ${isSelected
                                ? 'text-cyan-400 font-bold'
                                : isPast
                                    ? 'text-gray-400 group-hover:text-gray-200'
                                    : 'text-gray-600 group-hover:text-gray-400'
                                }`}>
                                {month}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Progress section */}
            <div className="mt-4 space-y-3">
                {/* Progress bar */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Progress to Goal</span>
                        <span className="font-semibold text-emerald-400">
                            {Math.round(progressPercent)}%
                        </span>
                    </div>
                    <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-700"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Stats row */}
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-2xl font-bold text-white">${totalSaved.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">saved so far</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-semibold text-gray-300">${remaining.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">left to reach ${savingsGoal.toLocaleString()}</p>
                    </div>
                </div>

                {/* Encouraging message */}
                <p className="text-center text-sm text-emerald-400/80 font-medium pt-1">
                    {getMessage()}
                </p>
            </div>
        </div>
    );
}

// Category color mapping for badges
const categoryColors = {
    'Food': 'bg-orange-500/20 text-orange-400',
    'Utilities': 'bg-blue-500/20 text-blue-400',
    'Transport': 'bg-purple-500/20 text-purple-400',
    'Entertainment': 'bg-pink-500/20 text-pink-400',
    'Shopping': 'bg-yellow-500/20 text-yellow-400',
    'Health': 'bg-red-500/20 text-red-400',
    'Subscriptions': 'bg-indigo-500/20 text-indigo-400',
    'Income': 'bg-emerald-500/20 text-emerald-400',
    'Other': 'bg-gray-500/20 text-gray-400'
};

// Category hex colors for pie chart
const categoryHexColors = {
    'Food': '#f97316',
    'Utilities': '#3b82f6',
    'Transport': '#a855f7',
    'Entertainment': '#ec4899',
    'Shopping': '#eab308',
    'Health': '#ef4444',
    'Subscriptions': '#6366f1',
    'Income': '#10b981',
    'Other': '#6b7280'
};

// Spending Pie Chart Component
function SpendingPieChart({ categoryData }) {
    const total = categoryData.reduce((sum, c) => sum + c.amount, 0);

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8">
                <div className="w-32 h-32 rounded-full bg-gray-700/30 flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                </div>
                <p className="text-gray-400 text-sm">No expenses this month</p>
            </div>
        );
    }

    // Calculate pie slices
    let currentAngle = 0;
    const slices = categoryData.map(cat => {
        const percentage = (cat.amount / total) * 100;
        const angle = (cat.amount / total) * 360;
        const slice = {
            ...cat,
            percentage,
            startAngle: currentAngle,
            endAngle: currentAngle + angle
        };
        currentAngle += angle;
        return slice;
    });

    // Create SVG path for each slice
    const createSlicePath = (startAngle, endAngle, radius = 80) => {
        const startRad = (startAngle - 90) * (Math.PI / 180);
        const endRad = (endAngle - 90) * (Math.PI / 180);

        const x1 = 100 + radius * Math.cos(startRad);
        const y1 = 100 + radius * Math.sin(startRad);
        const x2 = 100 + radius * Math.cos(endRad);
        const y2 = 100 + radius * Math.sin(endRad);

        const largeArc = endAngle - startAngle > 180 ? 1 : 0;

        return `M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    };

    return (
        <div className="flex flex-col items-center">
            {/* Pie Chart */}
            <div className="relative">
                <svg width="200" height="200" viewBox="0 0 200 200">
                    {slices.map((slice, i) => (
                        <path
                            key={i}
                            d={createSlicePath(slice.startAngle, slice.endAngle)}
                            fill={categoryHexColors[slice.category] || categoryHexColors['Other']}
                            className="transition-all duration-300 hover:opacity-80"
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                        />
                    ))}
                    {/* Center hole for donut effect */}
                    <circle cx="100" cy="100" r="50" fill="var(--background)" />
                    {/* Center text */}
                    <text x="100" y="95" textAnchor="middle" className="fill-white text-lg font-bold">
                        ${total.toFixed(0)}
                    </text>
                    <text x="100" y="115" textAnchor="middle" className="fill-gray-400 text-xs">
                        total
                    </text>
                </svg>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 w-full max-w-xs">
                {slices.map((slice, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: categoryHexColors[slice.category] || categoryHexColors['Other'] }}
                        />
                        <span className="text-xs text-gray-400 truncate">{slice.category}</span>
                        <span className="text-xs text-white font-medium ml-auto">{Math.round(slice.percentage)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Dashboard({ transactions, onAddClick, onDelete, onUpdate }) {
    const [spending, setSpending] = useState(0);
    const [budget, setBudget] = useState(3000);
    const [savingsGoal, setSavingsGoal] = useState(5000);
    const [savingsData, setSavingsData] = useState([]);
    const [deletingId, setDeletingId] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [editBudget, setEditBudget] = useState('');
    const [editSavingsGoal, setEditSavingsGoal] = useState('');

    // Month selector state
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Edit transaction state
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editCategory, setEditCategory] = useState('');

    // Expanded transaction for viewing comments
    const [expandedId, setExpandedId] = useState(null);

    const categories = getCategories();

    // Filter transactions for selected month
    const monthTransactions = transactions.filter(t => {
        const date = new Date(t.createdAt || t.created_at);
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });

    // Calculate spending for selected month (expenses only)
    const monthlySpending = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Calculate category breakdown for pie chart
    const categoryBreakdown = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            const existing = acc.find(c => c.category === t.category);
            if (existing) {
                existing.amount += parseFloat(t.amount);
            } else {
                acc.push({ category: t.category, amount: parseFloat(t.amount) });
            }
            return acc;
        }, [])
        .sort((a, b) => b.amount - a.amount);

    const handleDelete = (id) => {
        setDeletingId(id);
        setTimeout(() => {
            onDelete(id);
            setDeletingId(null);
        }, 300);
    };

    const openSettings = () => {
        setEditBudget(budget.toString());
        setEditSavingsGoal(savingsGoal.toString());
        setShowSettings(true);
    };

    // Auth state
    const [user, setUser] = useState(null);
    const supabase = createClient();

    useEffect(() => {
        const init = async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            if (currentUser) {
                const settings = await getSupabaseSettings();
                if (settings) {
                    setBudget(parseFloat(settings.monthly_budget));
                    setSavingsGoal(parseFloat(settings.savings_goal));
                }
                // EOY data is calculated locally from transactions for now, 
                // but we could optimize later
                setSavingsData(getEOYSavingsData());
            } else {
                const settings = getSettings();
                setBudget(settings.monthlyBudget);
                setSavingsGoal(settings.savingsGoal);
                setSavingsData(getEOYSavingsData());
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [transactions, supabase]);

    const saveSettings = async () => {
        const newBudget = parseFloat(editBudget) || budget;
        const newSavingsGoal = parseFloat(editSavingsGoal) || savingsGoal;

        setBudget(newBudget);
        setSavingsGoal(newSavingsGoal);

        if (user) {
            await updateSupabaseSettings({
                monthly_budget: newBudget,
                savings_goal: newSavingsGoal
            });
        } else {
            updateSettings({ monthlyBudget: newBudget, savingsGoal: newSavingsGoal });
        }

        setShowSettings(false);
    };
    // Open edit modal for a transaction
    const openEditModal = (t) => {
        setEditingTransaction(t);
        setEditTitle(t.title);
        setEditAmount(t.amount.toString());
        const datePart = (t.createdAt || t.created_at || new Date().toISOString()).split('T')[0];
        setEditDate(datePart);
        setEditCategory(t.category);
    };

    // Save edited transaction
    const saveEditedTransaction = async () => {
        if (!editingTransaction) return;

        const updates = {
            title: editTitle.trim(),
            amount: parseFloat(editAmount),
            date: editDate,
            category: editCategory
        };

        let updated;
        if (user) {
            updated = await updateSupabaseTransaction(editingTransaction.id, updates);
        } else {
            updated = updateTransaction(editingTransaction.id, updates);
        }

        if (updated && onUpdate) {
            onUpdate(updated);
        }
        setEditingTransaction(null);
    };

    // Toggle expanded state for a transaction
    const toggleExpanded = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };
    const progress = (monthlySpending / budget) * 100;
    const remaining = budget - monthlySpending;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Sort transactions by date (newest first) - only for selected month
    const sortedTransactions = [...monthTransactions].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at);
        const dateB = new Date(b.createdAt || b.created_at);
        return dateB - dateA;
    });

    return (
        <div className="min-h-screen pb-24">
            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 overlay-backdrop animate-fade-in flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-sm animate-slide-up p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">Settings</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="btn-close"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Monthly Budget</label>
                                <div className="input-wrapper">
                                    <span className="input-prefix">$</span>
                                    <input
                                        type="number"
                                        value={editBudget}
                                        onChange={(e) => setEditBudget(e.target.value)}
                                        placeholder="3000"
                                        step="100"
                                        min="0"
                                        className="input-field"
                                        style={{ paddingLeft: '36px' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">EOY Savings Goal</label>
                                <div className="input-wrapper">
                                    <span className="input-prefix">$</span>
                                    <input
                                        type="number"
                                        value={editSavingsGoal}
                                        onChange={(e) => setEditSavingsGoal(e.target.value)}
                                        placeholder="5000"
                                        step="500"
                                        min="0"
                                        className="input-field"
                                        style={{ paddingLeft: '36px' }}
                                    />
                                </div>
                            </div>
                            <button onClick={saveSettings} className="btn-primary w-full mt-4">
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="pt-12 pb-6 px-6 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">PocketWatch</h1>
                    <p className="text-gray-400 mt-1">Track your financial flow</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={openSettings}
                        className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all"
                        aria-label="Settings"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <UserMenu />
                </div>
            </header>

            {/* Main Content */}
            <div className="px-4 grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
                {/* EOY Savings Card - FIRST, contains month selector */}
                <div className="glass-card p-6 md:col-span-2">
                    <h2 className="text-lg font-semibold text-white mb-4">EOY Savings</h2>
                    <SavingsChart
                        data={savingsData}
                        savingsGoal={savingsGoal}
                        selectedMonth={selectedMonth}
                        onMonthClick={(month) => setSelectedMonth(month)}
                    />
                </div>

                {/* Monthly Budget Card */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">{monthNames[selectedMonth]} Budget</h2>
                        <span className="text-sm text-gray-400">${budget.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <ProgressRing progress={progress} />
                        <div className="mt-4 flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-400">Spent</p>
                                <p className="text-xl font-semibold text-white">${monthlySpending.toFixed(2)}</p>
                            </div>
                            <div className="w-px h-10 bg-gray-700" />
                            <div className="text-center">
                                <p className="text-sm text-gray-400">Remaining</p>
                                <p className={`text-xl font-semibold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ${remaining.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Spending Breakdown Pie Chart */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">{monthNames[selectedMonth]} Spending</h2>
                    <SpendingPieChart categoryData={categoryBreakdown} />
                </div>

                {/* Transactions for selected month */}
                <div className="glass-card p-6 md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">{monthNames[selectedMonth]} Transactions</h2>
                        <span className="text-sm text-gray-400">{sortedTransactions.length} total</span>
                    </div>

                    {sortedTransactions.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-400">No transactions this month</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {sortedTransactions.map((t) => (
                                <div
                                    key={t.id}
                                    className={`transaction-item transition-all duration-300 ${deletingId === t.id ? 'opacity-0 translate-x-full' : ''
                                        }`}
                                >
                                    {/* Main row */}
                                    <div className="flex items-center justify-between group">
                                        <div
                                            className="flex items-center gap-3 flex-1 cursor-pointer"
                                            onClick={() => toggleExpanded(t.id)}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-500/20' : 'bg-gray-700'
                                                }`}>
                                                {t.type === 'income' ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                                                        <line x1="12" y1="19" x2="12" y2="5"></line>
                                                        <polyline points="5 12 12 5 19 12"></polyline>
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                                        <polyline points="19 12 12 19 5 12"></polyline>
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-white truncate">{t.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`category-badge ${categoryColors[t.category] || categoryColors['Other']}`}>
                                                        {t.category}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{formatDate(t.createdAt)}</span>
                                                    {t.comment && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-lg font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                                                {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                                            </span>
                                            {/* Edit button */}
                                            <button
                                                onClick={() => openEditModal(t)}
                                                className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20"
                                                aria-label="Edit transaction"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </button>
                                            {/* Delete button */}
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20"
                                                aria-label="Delete transaction"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded comment section */}
                                    {expandedId === t.id && t.comment && (
                                        <div className="mt-3 pt-3 border-t border-white/10 animate-fade-in">
                                            <p className="text-xs text-gray-400 mb-1">Comment</p>
                                            <p className="text-sm text-gray-300">{t.comment}</p>
                                        </div>
                                    )}

                                    {/* Show "No comment" if expanded but no comment */}
                                    {expandedId === t.id && !t.comment && (
                                        <div className="mt-3 pt-3 border-t border-white/10 animate-fade-in">
                                            <p className="text-sm text-gray-500 italic">No comment added</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Transaction Modal */}
            {editingTransaction && (
                <div className="fixed inset-0 z-50 overlay-backdrop animate-fade-in flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-sm animate-slide-up p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">Edit Transaction</h2>
                            <button
                                onClick={() => setEditingTransaction(null)}
                                className="btn-close"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
                                <div className="input-wrapper">
                                    <span className="input-prefix">$</span>
                                    <input
                                        type="number"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        step="0.01"
                                        min="0"
                                        className="input-field"
                                        style={{ paddingLeft: '36px' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                                <select
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    className="input-field appearance-none cursor-pointer"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <button onClick={saveEditedTransaction} className="btn-primary w-full mt-4">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={onAddClick}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-110 transition-transform z-40"
                aria-label="Add transaction"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
        </div>
    );
}
