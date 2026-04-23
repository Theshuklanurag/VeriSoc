import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SessionDB } from "../utils/db";

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

const SESSION_MAX_DAYS = 7;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Bug 10 fixed: check session expiry on load
    const stored = SessionDB.get();
    if (!stored) return null;
    if (stored.loginAt) {
      const days = (Date.now() - new Date(stored.loginAt).getTime()) / (1000 * 60 * 60 * 24);
      if (days > SESSION_MAX_DAYS) {
        SessionDB.clear();
        return null;
      }
    }
    return stored;
  });

  const login = useCallback((userData) => {
    const safe = SessionDB.set({ ...userData, loginAt: new Date().toISOString() });
    setUser(safe);
    return safe;
  }, []);

  const logout = useCallback(() => {
    SessionDB.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (username) => {
    const updated = await SessionDB.refresh(username);
    if (updated) setUser(updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ─── TOAST CONTEXT ────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)} title="Click to dismiss">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ─── PAGE CONTEXT ─────────────────────────────────────────────────────────────

const PageContext = createContext(null);

export function PageProvider({ children }) {
  const [page, setPage] = useState("home");
  const [pageData, setPageData] = useState(null);

  const navigate = useCallback((to, data = null) => {
    setPage(to);
    setPageData(data);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <PageContext.Provider value={{ page, pageData, navigate }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePage() {
  return useContext(PageContext);
}
