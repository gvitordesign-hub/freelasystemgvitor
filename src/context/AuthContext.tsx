import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'expired' | 'pending' | 'blocked';
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 1. Check for active sessions in Supabase on application load
        const checkUserSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser({
                        id: session.user.id,
                        name: session.user.user_metadata?.name || 'Administrador',
                        email: session.user.email || '',
                        status: 'active'
                    });
                }
            } catch (err) {
                console.error('Error fetching Supabase session:', err);
            } finally {
                setIsLoading(false);
            }
        };

        checkUserSession();

        // 2. Listen to real-time authentication state changes from Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(prevUser => {
                    const name = session.user.user_metadata?.name || 'Administrador';
                    const email = session.user.email || '';
                    if (prevUser &&
                        prevUser.id === session.user.id &&
                        prevUser.email === email &&
                        prevUser.name === name) {
                        return prevUser;
                    }
                    return {
                        id: session.user.id,
                        name,
                        email,
                        status: 'active'
                    };
                });
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: password
            });

            if (error) {
                // Return a friendly error message
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('E-mail ou senha incorretos. Por favor, verifique suas credenciais.');
                }
                throw new Error(error.message);
            }

            if (data?.user) {
                setUser({
                    id: data.user.id,
                    name: data.user.user_metadata?.name || 'Administrador',
                    email: data.user.email || '',
                    status: 'active'
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name: string, email: string, password: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim().toLowerCase(),
                password: password,
                options: {
                    data: {
                        name: name
                    }
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            if (data?.user) {
                setUser({
                    id: data.user.id,
                    name: name,
                    email: data.user.email || '',
                    status: 'active'
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await supabase.auth.signOut();
            setUser(null);
        } catch (err) {
            console.error('Error logging out:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
