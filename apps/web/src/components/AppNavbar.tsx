import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Role } from '@/contracts';
import { LogOut, Utensils, QrCode } from 'lucide-react';

const links = [
  { label: 'Tables', to: '/tables' },
  { label: 'Menu', to: '/menu', roles: [Role.CUSTOMER, Role.WAITER, Role.ADMIN] },
  { label: 'Orders', to: '/orders', roles: [Role.CUSTOMER] },
  { label: 'History', to: '/history', roles: [Role.CUSTOMER] },
  { label: 'Kitchen', to: '/kitchen', roles: [Role.KITCHEN, Role.ADMIN] },
  { label: 'Cashier', to: '/cashier', roles: [Role.CASHIER, Role.ADMIN] },
  { label: 'Waiter', to: '/waiter', roles: [Role.WAITER, Role.ADMIN] },
  { label: 'Admin', to: '/admin', roles: [Role.ADMIN] },
];

export default function AppNavbar() {
  const { user, logout, isLoggingOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const visibleLinks = links.filter((link) => !link.roles || link.roles.includes(user.role));

  const handleLogout = async () => {
    // Navigate to landing first to prevent ProtectedRoute from redirecting to /login
    navigate('/', { replace: true });
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#d9cbbd]/90 bg-[#f3eadf]/90 px-4 py-3 backdrop-blur-md md:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-5">
        <Link to="/tables" className="flex shrink-0 items-center gap-2 text-[#28231f]" aria-label="RMS tables">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#28231f] text-[#f3eadf]">
            <Utensils className="h-4 w-4" />
          </span>
          <span className="hidden text-sm font-bold tracking-[0.16em] sm:inline">RMS</span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Application navigation">
          {visibleLinks.map((link) => {
            const active = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  active ? 'bg-[#28231f] text-[#f3eadf]' : 'text-[#756b63] hover:bg-[#eadfd2] hover:text-[#28231f]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user.role === Role.CUSTOMER && (
            <Link
              to="/tables"
              className="hidden items-center gap-2 rounded-full border border-[#a9c9ad] bg-[#e1eee2] px-3 py-2 text-xs font-semibold text-[#356b4f] sm:inline-flex"
            >
              <QrCode className="h-3.5 w-3.5" />
              Scan
            </Link>
          )}
          <span className="hidden max-w-28 truncate text-xs text-[#756b63] lg:inline">{user.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-full p-2 text-[#756b63] transition-colors hover:bg-[#eadfd2] hover:text-[#a3543e] disabled:opacity-50"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
