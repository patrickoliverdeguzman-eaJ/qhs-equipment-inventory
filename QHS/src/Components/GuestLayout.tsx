import { Navigate, Outlet } from 'react-router-dom';
import { useStateContext } from '../Context/ContextProvider';
import qhsMark from '../assets/qhs-mark.svg';

export default function GuestLayout() {
  const { token, user, initializing } = useStateContext();

  if (initializing) {
    return <div className="route-loading" role="status">Checking your session…</div>;
  }

  if (token && user) {
    const destination = user.role === 'admin' ? '/admin' : user.role === 'custodian' ? '/custodian' : '/';
    return <Navigate to={destination} replace />;
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand" aria-labelledby="auth-brand-title">
        <img className="auth-brand-mark" src={qhsMark} alt="" />
        <p className="auth-eyebrow">Quirino High School</p>
        <h1 id="auth-brand-title">Equipment ready when learning needs it.</h1>
        <p>One secure place for students and staff to request, track, and care for laboratory equipment.</p>
      </section>
      <section className="auth-content" aria-label="Account access">
        <Outlet />
        <p className="auth-help">Need help accessing your account? Contact your school administrator.</p>
      </section>
    </main>
  );
}
