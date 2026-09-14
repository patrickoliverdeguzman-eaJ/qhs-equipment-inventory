import StatusPage from '../Components/StatusPage';
import { useStateContext } from '../Context/ContextProvider';

export default function NotFound() {
  const { user } = useStateContext();
  const destination = user?.role === 'admin' ? '/admin' : user?.role === 'custodian' ? '/custodian' : '/';

  return (
    <StatusPage
      code="404"
      eyebrow="Page not found"
      title="This page isn’t available"
      message="The link may be outdated, or the page may have moved. Use the dashboard to get back to a familiar place."
      to={destination}
    />
  );
}
