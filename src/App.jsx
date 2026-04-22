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

  return routes[page] || <HomePage />;
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
