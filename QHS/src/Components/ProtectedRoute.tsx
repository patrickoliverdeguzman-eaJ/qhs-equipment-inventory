import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStateContext } from '../Context/ContextProvider';
import type { UserRole } from '../types/domain';

interface ProtectedRouteProps extends PropsWithChildren {
  allowedRoles?: readonly UserRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { token, user, initializing } = useStateContext();
  const location = useLocation();

  if (initializing) {
    return <div className="route-loading" role="status" aria-live="polite">Loading your workspace…</div>;
  }

  if (!token || !user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/not-authorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
