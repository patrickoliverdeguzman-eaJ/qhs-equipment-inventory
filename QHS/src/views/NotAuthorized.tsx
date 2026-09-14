import { Navigate } from 'react-router-dom';
import StatusPage from '../Components/StatusPage';
import { useStateContext } from '../Context/ContextProvider';

export default function NotAuthorized() {
  const { user, token } = useStateContext();

  if (!token) return <Navigate to="/auth" replace />;

  const destination = user?.role === 'admin' ? '/admin' : user?.role === 'custodian' ? '/custodian' : '/';

  return (
    <StatusPage
      code="403"
      eyebrow="Access restricted"
      title="You don’t have permission to view this page"
      message="Your account is active, but this area belongs to a different role. Return to your dashboard to continue working."
      to={destination}
    />
  );
}
