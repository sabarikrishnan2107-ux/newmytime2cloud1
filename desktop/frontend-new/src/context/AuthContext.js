// context/AuthContext.js
"use client";

import { getUser } from '@/config';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Replace this logic with your actual API call or JWT decoding
        const initializeAuth = async () => {
            try {
                const user = await getUser();
                setUser(user);

            } catch (error) {
                console.error("Failed to load user", error);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    // Helper function to check specific module access based on your JSON structure
    const hasModuleAccess = (moduleName) => {
        return user?.role?.modules?.[moduleName] || false;
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, hasModuleAccess }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};