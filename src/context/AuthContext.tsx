
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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

// Production User Session keys
const SESSION_KEY = 'gvitor_system_session';

const PROD_USER: User = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Gvitor Design',
    email: 'gvitordesign@gmail.com',
    status: 'active'
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize user from localStorage to persist session on reload
    const [user, setUser] = useState<User | null>(() => {
        const savedSession = localStorage.getItem(SESSION_KEY);
        return savedSession ? JSON.parse(savedSession) : null;
    });
    const [isLoading, setIsLoading] = useState(false);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        // Simulate a sleek 1-second server authorization delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
            if (email.trim().toLowerCase() === 'gvitordesign@gmail.com' && password === 'gvitor2026!') {
                setUser(PROD_USER);
                localStorage.setItem(SESSION_KEY, JSON.stringify(PROD_USER));
            } else {
                throw new Error('E-mail ou senha incorretos. Por favor, verifique suas credenciais.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name: string, email: string, password: string) => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 800));
        setIsLoading(false);
        throw new Error('O cadastro de novos usuários está temporariamente desativado para segurança.');
    };

    const logout = async () => {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
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
