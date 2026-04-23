import "./styles/globals.css";

import { AuthProvider, ToastProvider, PageProvider, usePage } from "./context/AppContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Chatbot from "./components/Chatbot";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import KycPage from "./pages/KycPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import SupportPage from "./pages/SupportPage";
import { AboutPage, ContactPage } from "./pages/StaticPages";

// Bug 20 fixed: proper 404 fallback component
function NotFoundPage() {
  const { navigate } = usePage();
  return (
    <div style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div className="card" style={{ textAlign: "center", padding: 48, maxWidth: 400 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, marginBottom: 10, color: "var(--cream)" }}>Page Not Found</h2>
        <p style={{ color: "var(--text2)", marginBottom: 28 }}>The page you're looking for doesn't exist.</p>
        <button className="btn btn-primary" onClick={() => navigate("home")}>Go Home</button>
      </div>
    </div>
  );
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────

function AppRouter() {
  const { page } = usePage();

  const routes = {
    home:          <HomePage />,
    login:         <LoginPage />,
    signup:        <SignupPage />,
    kyc:           <KycPage />,
    dashboard:     <DashboardPage />,
    admin:         <AdminPage />,
    "admin-login": <AdminLoginPage />,
    support:       <SupportPage />,
    about:         <AboutPage />,
    contact:       <ContactPage />,
  };

  return routes[page] || <NotFoundPage />;
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <PageProvider>
      <AuthProvider>
        <ToastProvider>
          <div className="bg-texture" aria-hidden="true" />
          <Navbar />
          <main>
            <AppRouter />
          </main>
          <Footer />
          <Chatbot />
        </ToastProvider>
      </AuthProvider>
    </PageProvider>
  );
}
