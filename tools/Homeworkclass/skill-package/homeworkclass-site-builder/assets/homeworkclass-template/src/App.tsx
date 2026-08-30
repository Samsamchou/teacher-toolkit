import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Dashboard } from "./components/Dashboard";
import { PublicHome } from "./components/PublicHome";
import { AppDataProvider } from "./state/AppDataContext";
import { SITE } from "./data/semester";

function AppRouter() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <main className="app-loading" role="status">
        <span className="app-loading__mark" aria-hidden="true">好</span>
        <strong>正在確認教師工作階段…</strong>
        <small>{SITE.name}</small>
      </main>
    );
  }

  return authenticated ? (
    <AppDataProvider>
      <Dashboard />
    </AppDataProvider>
  ) : (
    <PublicHome />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
