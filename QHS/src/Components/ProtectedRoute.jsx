import { Navigate, useLocation } from 'react-router-dom';
import { useStateContext } from '../Context/ContextProvider';

const ProtectedRoute = ({ children, allowedRoles }) => {
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
