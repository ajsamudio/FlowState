'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';

export default function UserMenu() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            try {
                // Set a timeout to prevent infinite pulse
                const timeoutId = setTimeout(() => {
                    if (loading) {
                        console.warn("User check timed out, showing sign-in");
                        setLoading(false);
                    }
                }, 3000);

                const { data: { user }, error } = await supabase.auth.getUser();
                clearTimeout(timeoutId);

                if (error) throw error;
                setUser(user);
            } catch (error) {
                console.error("Auth initialization error:", error);
            } finally {
                setLoading(false);
            }
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log("Auth event:", _event);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const handleLogin = async () => {
        try {
            console.log("Login button clicked, initiating Google OAuth...");
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin.replace(/\/$/, '')}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (error) {
            console.error("Login attempt failed:", error.message);
            alert("Login failed: " + error.message);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (loading) return <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />;

    if (!user) {
        return (
            <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-all text-sm"
            >
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>
                Sign in
            </button>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{user.user_metadata?.full_name || 'Logged In'}</p>
                <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{user.email}</p>
                <button
                    onClick={handleLogout}
                    className="text-[10px] text-red-500/70 hover:text-red-400 transition-colors mt-0.5"
                >
                    Sign out
                </button>
            </div>
            <div className="relative group">
                <img
                    src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=10b981&color=fff`}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full border-2 border-emerald-500/20 shadow-lg shadow-emerald-500/10 group-hover:border-emerald-500/50 transition-all"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#090a0f] rounded-full"></div>
            </div>
        </div>
    );
}
