import { Footer } from './components/Footer.tsx';
import { Navbar } from './components/Navbar.tsx';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { CompareSchemesPage } from './pages/CompareSchemesPage.tsx';
import { EligibilityCheckerPage } from './pages/EligibilityCheckerPage.tsx';
import { ExploreSchemesPage } from './pages/ExploreSchemesPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { AboutPage, ContactPage, LegalPage } from './pages/InfoPages.tsx';
import { RecommendationsPage } from './pages/RecommendationsPage.tsx';
import { SchemeDetailPage } from './pages/SchemeDetailPage.tsx';
import { UserDashboardPage } from './pages/UserDashboardPage.tsx';
import { YojanaMitraPage } from './pages/YojanaMitraPage.tsx';

function AppShell() {
  const { pathname, navigate, toast } = useApp();

  const renderPage = () => {
    if (pathname === '/' || pathname === '') return <HomePage />;
    if (pathname === '/explore') return <ExploreSchemesPage />;
    if (pathname.startsWith('/schemes/')) {
      const slugOrId = pathname.replace('/schemes/', '').split('/')[0];
      return <SchemeDetailPage slugOrId={slugOrId} />;
    }
    if (pathname === '/eligibility') return <EligibilityCheckerPage />;
    if (pathname === '/recommendations') return <RecommendationsPage />;
    if (pathname === '/compare') return <CompareSchemesPage />;
    if (pathname === '/assistant') return <YojanaMitraPage />;
    if (pathname === '/dashboard') return <UserDashboardPage />;
    if (pathname === '/admin') return <AdminDashboardPage />;
    if (pathname === '/login') return <AuthPage initialMode="login" />;
    if (pathname === '/register') return <AuthPage initialMode="register" />;
    if (pathname === '/about') return <AboutPage />;
    if (pathname === '/contact') return <ContactPage />;
    if (pathname === '/privacy') return <LegalPage type="privacy" />;
    if (pathname === '/terms') return <LegalPage type="terms" />;
    if (pathname === '/disclaimer') return <LegalPage type="disclaimer" />;

    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-10">
          <h1 className="font-display text-2xl font-bold text-[#172B4D] mb-2">Page Not Found</h1>
          <p className="text-sm text-[#667085] mb-6">
            The page you requested could not be found on Yojana Sarthi.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] rounded-lg"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#172B4D]">
      <Navbar />
      <main className="flex-1">{renderPage()}</main>
      <Footer />

      {/* Accessible Non-Blocking Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl text-sm font-medium border shadow-sm ${
            toast.tone === 'success'
              ? 'bg-white border-[#138A55]/40 text-[#138A55]'
              : toast.tone === 'error'
              ? 'bg-white border-red-300 text-red-700'
              : 'bg-white border-[#123B65]/30 text-[#123B65]'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
