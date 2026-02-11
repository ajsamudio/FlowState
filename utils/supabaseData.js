import { createClient } from './supabase/client';

const supabase = createClient();

export const getSupabaseTransactions = async () => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase fetch error:', error.message, error.details, error.hint);
            return [];
        }
        // Map created_at to createdAt for component compatibility
        return (data || []).map(t => ({
            ...t,
            createdAt: t.created_at || t.createdAt,
            comment: t.notes || t.comment,
            date: t.tx_date || t.date
        }));
    } catch (e) {
        console.error('Unexpected fetch error:', e);
        return [];
    }
};

export const saveSupabaseTransaction = async (transaction) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
        const { data, error } = await supabase
            .from('transactions')
            .insert([{
                user_id: user.id,
                title: transaction.title,
                amount: transaction.amount,
                category: transaction.category,
                type: transaction.type,
                notes: transaction.comment, // mapped from 'comment'
                tx_date: transaction.date   // mapped from 'date'
            }])
            .select()
            .single();

        if (error) {
            console.error('Supabase save error:', error.message, error.details, error.hint);
            return null;
        }

        // Map fields for immediate UI display
        return {
            ...data,
            createdAt: data.created_at || data.createdAt,
            comment: data.notes || data.comment,
            date: data.tx_date || data.date
        };
    } catch (e) {
        console.error('Unexpected save error:', e);
        return null;
    }
};

export const deleteSupabaseTransaction = async (id) => {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting transaction:', error);
        return false;
    }
    return true;
};

export const updateSupabaseTransaction = async (id, updates) => {
    const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating transaction:', error);
        return null;
    }
    return data;
};

export const getSupabaseSettings = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(); // switch to maybeSingle to avoid 406 on empty

        if (error) {
            console.error('Supabase settings fetch error:', error.message);
            return null;
        }
        return data;
    } catch (e) {
        return null;
    }
};

export const updateSupabaseSettings = async (updates) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('settings')
            .upsert({
                user_id: user.id,
                monthly_budget: updates.monthly_budget,
                savings_goal: updates.savings_goal
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase settings save error:', error.message);
            return null;
        }
        return data;
    } catch (e) {
        return null;
    }
};
