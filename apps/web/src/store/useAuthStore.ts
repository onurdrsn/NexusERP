import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    requires_password_change: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    login: (user: User, token: string) => void;
    logout: () => void;
    isAuthenticated: () => boolean;
    setRequiresPasswordChange: (requires: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            login: (user, token) => set({ user, token }),
            logout: () => set({ user: null, token: null }),
            isAuthenticated: () => !!get().token,
            setRequiresPasswordChange: (requires) => set((state) => ({
                user: state.user ? { ...state.user, requires_password_change: requires } : null
            })),
        }),
        {
            name: 'auth-storage',
        }
    )
);
