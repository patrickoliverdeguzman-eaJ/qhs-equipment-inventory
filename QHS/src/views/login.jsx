import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axiosClient from '../axiosClient';
import { useStateContext } from '../Context/ContextProvider';

export default function Login() {
  const { setUser, setToken } = useStateContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    setUnverified(false);

    try {
      const { data } = await axiosClient.post('/login', form);
      setUser(data.user);
      setToken(data.token);
      const requested = new URLSearchParams(location.search).get('next');
      const safeNext = requested?.startsWith('/') && !requested.startsWith('//') ? requested : null;
      navigate(safeNext || data.redirectUrl || '/', { replace: true });
    } catch (requestError) {
      const response = requestError.response;
      setUnverified(response?.status === 403 && response.data?.needs_verification === true);
      setError(response?.data?.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card animated fadeInDown">
      <header className="auth-card-header">
        <p className="auth-eyebrow">Welcome back</p>
        <h2>Sign in to QHS Inventory</h2>
        <p>Use your verified school account to continue.</p>
      </header>

      {error && <div className="alert" role="alert">{error}</div>}
      {unverified && (
        <p className="auth-inline-action">
          <Link to="verify-email" state={{ email: form.email }}>Resend the verification email</Link>
        </p>
      )}

      <form onSubmit={submit}>
        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          autoComplete="email"
          required
        />
        <div className="label-row">
          <label htmlFor="login-password">Password</label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <input
          id="login-password"
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          autoComplete="current-password"
          required
        />
        <button className="btn btn-block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="message">New to the system? <Link to="register">Create an account</Link></p>
    </div>
  );
}
