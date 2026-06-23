import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { useAssets } from './hooks/useAssets.js';
import Sidebar from './components/layout/Sidebar.jsx';
import TopBar from './components/layout/TopBar.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import EntryForm from './components/entry/EntryForm.jsx';
import Register from './components/register/Register.jsx';
import StatusBoard from './components/status/StatusBoard.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import ReportsPage from './components/reports/ReportsPage.jsx';
import SignOff from './components/signoff/SignOff.jsx';
import UsersPage from './components/auth/UsersPage.jsx';
import Login from './components/auth/Login.jsx';
import ScanView from './components/scan/ScanView.jsx';
import { Banner, Btn } from './components/ui.jsx';
import { IconRefresh, IconSpinner } from './components/Icon.jsx';

function Splash() {
  return (
    <div className="min-h-dvh flex items-center justify-center paper-bg text-navy">
      <div className="flex flex-col items-center gap-3">
        <IconSpinner size={28} />
        <div className="text-[13px] text-muted">Loading…</div>
      </div>
    </div>
  );
}

function AuthedApp() {
  const { user, isAdmin, logout } = useAuth();
  const [tab, setTab] = useState('entry');
  const { assets, loading, error, reload } = useAssets();

  // Non-admins can't reach the Users screen.
  const activeTab = tab === 'users' && !isAdmin ? 'entry' : tab;

  return (
    <div className="lg:grid lg:grid-cols-[264px_1fr] min-h-dvh">
      <Sidebar
        active={activeTab}
        onChange={setTab}
        assets={assets}
        user={user}
        isAdmin={isAdmin}
        onLogout={logout}
      />

      <div className="flex flex-col min-h-dvh paper-bg">
        <TopBar assets={assets} user={user} isAdmin={isAdmin} onLogout={logout} onManageUsers={() => setTab('users')} />

        <main className="flex-1 w-full max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-10 pt-5 lg:pt-8 pb-28 lg:pb-14">
          {error && (
            <Banner tone="error" role="alert">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span>{error}</span>
                <Btn sm variant="ghost" icon={<IconRefresh size={15} />} onClick={reload}>
                  Retry
                </Btn>
              </div>
            </Banner>
          )}

          <div key={activeTab} className="animate-fade-in-up">
            {activeTab === 'entry' && <EntryForm onSaved={reload} />}
            {activeTab === 'register' && <Register assets={assets} loading={loading} reload={reload} />}
            {activeTab === 'status' && <StatusBoard assets={assets} loading={loading} reload={reload} />}
            {activeTab === 'dashboard' && <Dashboard assets={assets} loading={loading} reload={reload} />}
            {activeTab === 'reports' && <ReportsPage assets={assets} loading={loading} reload={reload} />}
            {activeTab === 'signoff' && <SignOff assets={assets} reload={reload} />}
            {activeTab === 'users' && isAdmin && <UsersPage />}
          </div>
        </main>

        <BottomNav active={activeTab} onChange={setTab} assets={assets} />
      </div>
    </div>
  );
}

// Public scan deep-link: #/scan/<token>[/<unit>] — works for anyone, no login.
function useScanRoute() {
  const read = () => {
    const m = (window.location.hash || '').match(/^#\/scan\/([^/?]+)(?:\/(\d+))?/);
    return m ? { scanId: decodeURIComponent(m[1]), unit: m[2] ? parseInt(m[2], 10) : null } : null;
  };
  const [scan, setScan] = useState(read);
  useEffect(() => {
    const on = () => setScan(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return scan;
}

export default function App() {
  const scan = useScanRoute();
  const { user, loading } = useAuth();
  if (scan) return <ScanView scanId={scan.scanId} unit={scan.unit} />;
  if (loading) return <Splash />;
  if (!user) return <Login />;
  return <AuthedApp />;
}
