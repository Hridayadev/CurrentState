'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import * as api from '@/lib/api';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<User>;
  signOut: () => Promise<void>;
  completeOnboarding: (input: { displayName: string; emojiAvatar: string; timezone: string }) => Promise<User>;
  updateProfile: (input: Partial<Pick<User, 'displayName' | 'emojiAvatar' | 'timezone'>>) => Promise<User>;
  updatePreferences: (input: Partial<User['preferences']>) => Promise<User>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: api.getSession,
  });

  // Keep the session query in sync with real Supabase auth state changes
  // (sign-in callback, token refresh, sign-out on another tab, etc).
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['session'] });
  }, [queryClient]);

  const signIn = useCallback(async () => {
    const user = await api.signInWithGoogle();
    queryClient.setQueryData(['session'], user);
    return user;
  }, [queryClient]);

  const signOut = useCallback(async () => {
    await api.signOut();
    queryClient.setQueryData(['session'], null);
    queryClient.removeQueries();
  }, [queryClient]);

  const completeOnboarding = useCallback(
    async (input: { displayName: string; emojiAvatar: string; timezone: string }) => {
      const user = await api.completeOnboarding(input);
      queryClient.setQueryData(['session'], user);
      return user;
    },
    [queryClient],
  );

  const updateProfile = useCallback(
    async (input: Partial<Pick<User, 'displayName' | 'emojiAvatar' | 'timezone'>>) => {
      const user = await api.updateProfile(input);
      queryClient.setQueryData(['session'], user);
      queryClient.invalidateQueries({ queryKey: ['room'] });
      queryClient.invalidateQueries({ queryKey: ['partner'] });
      return user;
    },
    [queryClient],
  );

  const updatePreferences = useCallback(
    async (input: Partial<User['preferences']>) => {
      const user = await api.updatePreferences(input);
      queryClient.setQueryData(['session'], user);
      return user;
    },
    [queryClient],
  );

  return (
    <AuthContext.Provider
      value={{
        user: sessionQuery.data ?? null,
        loading: sessionQuery.isLoading,
        signIn,
        signOut,
        completeOnboarding,
        updateProfile,
        updatePreferences,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
