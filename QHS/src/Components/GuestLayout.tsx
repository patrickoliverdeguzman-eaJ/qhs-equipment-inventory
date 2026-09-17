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
        <div className="auth-brand-lockup">
          <img className="auth-brand-mark" src={qhsMark} alt="" />
          <div>
            <strong>Quirino High School</strong>
            <span>Laboratory services</span>
          </div>
        </div>
        <div className="auth-brand-copy">
          <p className="auth-eyebrow">Equipment inventory platform</p>
          <h1 id="auth-brand-title">Every unit accounted for. Every handover clear.</h1>
          <p className="auth-brand-summary">Request, issue, track, and return laboratory equipment through one reliable school workspace.</p>
        </div>
        <div className="auth-capabilities" aria-label="Platform capabilities">
          <div><b>01</b><span><strong>Live availability</strong><small>See which units are ready to borrow.</small></span></div>
          <div><b>02</b><span><strong>Verified custody</strong><small>Track equipment from approval to return.</small></span></div>
          <div><b>03</b><span><strong>Clear records</strong><small>Keep every condition and activity documented.</small></span></div>
        </div>
        <p className="auth-brand-footnote">QHS · Science and technology services</p>
      </section>
      <section className="auth-content" aria-label="Account access">
        <div className="auth-content-inner">
          <div className="auth-mobile-brand">
            <img src={qhsMark} alt="" />
            <span><strong>QHS Inventory</strong><small>Laboratory services</small></span>
          </div>
          <Outlet />
          <p className="auth-help">Need help accessing your account? Contact your school administrator.</p>
          <p className="auth-security-note"><span aria-hidden="true">●</span> Secure school access</p>
        </div>
      </section>
    </main>
  );
}
