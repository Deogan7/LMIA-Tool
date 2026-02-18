import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

type User = {
  email: string;
  name: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => string | null;
  signup: (name: string, email: string, password: string) => string | null;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

type StoredUser = {
  name: string;
  email: string;
  password: string;
};

function getUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem("lmia_users") || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem("lmia_users", JSON.stringify(users));
}

function getSession(): User | null {
  try {
    const s = localStorage.getItem("lmia_session");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function saveSession(user: User | null) {
  if (user) {
    localStorage.setItem("lmia_session", JSON.stringify(user));
  } else {
    localStorage.removeItem("lmia_session");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getSession);

  useEffect(() => {
    saveSession(user);
  }, [user]);

  const login = (email: string, password: string): string | null => {
    const users = getUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return "Invalid email or password";
    setUser({ email: found.email, name: found.name });
    return null;
  };

  const signup = (name: string, email: string, password: string): string | null => {
    if (!name.trim()) return "Name is required";
    if (!email.trim()) return "Email is required";
    if (password.length < 6) return "Password must be at least 6 characters";

    const users = getUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return "An account with this email already exists";
    }

    users.push({ name: name.trim(), email: email.trim().toLowerCase(), password });
    saveUsers(users);
    setUser({ email: email.trim().toLowerCase(), name: name.trim() });
    return null;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
