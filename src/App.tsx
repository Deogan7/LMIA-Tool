import { useEffect } from "react";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import AuthPage from "./components/AuthPage";
import LMIAExplorer from "./components/LMIAExplorer";

function AppContent() {
  const { user, loading, isRecoveryMode } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show password-set form when arriving via invite/reset link
  if (isRecoveryMode) {
    return <AuthPage />;
  }

  return user ? <LMIAExplorer /> : <AuthPage />;
}

export default function App() {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Block common screenshot / devtools keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
      }
      // Ctrl/Cmd + Shift + S (screenshot on some systems)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
      }
      // Ctrl/Cmd + P (print)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
      }
    };

    // Blur content when tab/window loses focus (deters screen capture tools)
    const handleVisibilityChange = () => {
      const root = document.getElementById("root");
      if (!root) return;
      if (document.hidden) {
        root.classList.add("app-blurred");
      } else {
        root.classList.remove("app-blurred");
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
