
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

// Mock user for development
const MOCK_USER: User = {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Desenvolvedor',
    email: 'dev@gvitor.com',
    status: 'active'
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Start with the mock user and not loading
    const [user, setUser] = useState<User | null>(MOCK_USER);
    const [isLoading, setIsLoading] = useState(false);

    const login = async (email: string, password: string) => {
        console.log('Mock login:', { email, password });
        setUser(MOCK_USER);
    };

    const register = async (name: string, email: string, password: string) => {
        console.log('Mock register:', { name, email, password });
        setUser(MOCK_USER);
    };

    const logout = async () => {
        console.log('Mock logout');
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
