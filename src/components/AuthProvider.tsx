import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type User = {
  email: string;
  name: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isRecoveryMode: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (newPassword: string) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function sessionToUser(session: Session | null): User | null {
  if (!session?.user) return null;
  return {
    email: session.user.email ?? "",
    name: (session.user.user_metadata?.name as string) ?? session.user.email ?? "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    // Get the initial session (also picks up tokens from URL hash automatically)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(sessionToUser(session));
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(sessionToUser(session));

      if (event === "PASSWORD_RECOVERY") {
        // User arrived via invite link or password reset link
        setIsRecoveryMode(true);
      }

      if (event === "SIGNED_OUT") {
        setIsRecoveryMode(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsRecoveryMode(false);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) return error.message;
    return null;
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return error.message;
    setIsRecoveryMode(false);
    return null;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isRecoveryMode, login, logout, resetPassword, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}
