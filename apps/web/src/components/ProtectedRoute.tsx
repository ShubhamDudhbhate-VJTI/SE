import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Role } from '@/contracts';
import AppNavbar from './AppNavbar';

export const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: Role[] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    // Redirect to landing page (main page) instead of login for a clean experience.
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl mb-6 max-w-md">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-sm">You don't have permission to access this page. This might happen if you've recently switched accounts or roles.</p>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-[#356b4f] text-white rounded-xl font-bold shadow-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <>
      <AppNavbar />
      {children}
    </>
  );
};
