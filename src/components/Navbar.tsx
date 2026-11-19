import { Menu, Shield, User, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

const PRIMARY_NAV = [
  { label: 'Home', path: '/' },
  { label: 'Explore Schemes', path: '/explore' },
  { label: 'Check Eligibility', path: '/eligibility' },
  { label: 'Recommendations', path: '/recommendations' },
  { label: 'Compare', path: '/compare' },
  { label: 'Yojana Mitra AI', path: '/assistant' },
  { label: 'About', path: '/about' },
];

export function Navbar() {
  const { pathname, navigate, user, logout, compareIds } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleLink('/')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-[#123B65] rounded-md"
        >
          <BrandLogo className="w-8 h-8 shrink-0" />
          <span className="font-display text-lg font-bold tracking-tight text-[#123B65]">
            Yojana Sarthi
          </span>
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden xl:flex items-center gap-5 text-sm font-medium text-[#475467]"
        >
          {PRIMARY_NAV.map((item) => {
            const active =
              item.path === '/'
                ? pathname === '/'
                : pathname === item.path || pathname.startsWith(`${item.path}/`);
            const label =
              item.path === '/compare' && compareIds.length > 0
                ? `${item.label} (${compareIds.length})`
                : item.label;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleLink(item.path)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  active
                    ? 'text-[#123B65] border-[#123B65] font-semibold'
                    : 'border-transparent hover:text-[#123B65] hover:border-[#123B65]/30'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Account + Primary CTA */}
        <div className="hidden xl:flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => handleLink('/dashboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  pathname === '/dashboard'
                    ? 'text-[#123B65] bg-[#123B65]/8'
                    : 'text-[#172B4D] hover:bg-[#F5F7FA]'
                }`}
              >
                <User className="w-4 h-4 text-[#123B65]" />
                <span className="max-w-[110px] truncate">{user.name.split(' ')[0]}</span>
              </button>
              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => handleLink('/admin')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    pathname === '/admin'
                      ? 'text-[#123B65] bg-[#123B65]/8'
                      : 'text-[#172B4D] hover:bg-[#F5F7FA]'
                  }`}
                >
                  <Shield className="w-4 h-4 text-[#138A55]" />
                  <span>Admin</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => logout()}
                className="text-sm font-medium text-[#667085] hover:text-[#172B4D] px-2 py-2 whitespace-nowrap shrink-0"
              >
                Log out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleLink('/login')}
              className="px-3 py-2 text-sm font-medium text-[#172B4D] hover:text-[#123B65] transition-colors whitespace-nowrap shrink-0"
            >
              Login / Register
            </button>
          )}

          <button
            type="button"
            onClick={() => handleLink('/eligibility')}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Check My Eligibility
          </button>
        </div>

        {/* Mobile Menu Trigger */}
        <div className="flex xl:hidden items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleLink('/eligibility')}
            className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg whitespace-nowrap shrink-0"
          >
            Check My Eligibility
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="p-2.5 rounded-lg text-[#172B4D] hover:bg-[#F5F7FA] min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Mobile Menu */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-[#E2E8F0] bg-white px-4 pt-3 pb-5 space-y-1">
          {PRIMARY_NAV.map((item) => {
            const active =
              item.path === '/'
                ? pathname === '/'
                : pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleLink(item.path)}
                className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#123B65]/8 text-[#123B65] font-semibold'
                    : 'text-[#172B4D] hover:bg-[#F5F7FA]'
                }`}
              >
                {item.path === '/compare' && compareIds.length > 0
                  ? `${item.label} (${compareIds.length})`
                  : item.label}
              </button>
            );
          })}

          <div className="pt-3 mt-2 border-t border-[#E2E8F0] space-y-2">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => handleLink('/dashboard')}
                  className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-[#172B4D] hover:bg-[#F5F7FA]"
                >
                  My Dashboard ({user.name})
                </button>
                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleLink('/admin')}
                    className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-[#138A55] hover:bg-[#F5F7FA]"
                  >
                    Admin Scheme Management
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-[#667085] hover:bg-[#F5F7FA]"
                >
                  Log Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleLink('/login')}
                className="w-full text-left px-3 py-3 rounded-lg text-sm font-semibold text-[#123B65] hover:bg-[#F5F7FA]"
              >
                Login / Register
              </button>
            )}

            <button
              type="button"
              onClick={() => handleLink('/eligibility')}
              className="w-full py-3 px-4 text-center text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg"
            >
              Check My Eligibility
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
