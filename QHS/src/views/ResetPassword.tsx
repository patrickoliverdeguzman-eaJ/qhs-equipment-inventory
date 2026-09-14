import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axiosClient, { getApiErrorMessage } from '../axiosClient';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const token = query.get('token');
  const email = query.get('email');
  const hasValidLink = Boolean(token && email);

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState(hasValidLink ? '' : 'This password reset link is incomplete or invalid.');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => navigate('/auth', { replace: true }), 2000);
    return () => window.clearTimeout(timer);
  }, [success, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasValidLink || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const { data } = await axiosClient.post<{ message: string }>('/reset-password', {
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccess(`${data.message} Redirecting to sign in…`);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'The password could not be reset.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card animated fadeInDown">
      <header className="auth-card-header">
        <p className="auth-eyebrow">Secure recovery</p>
        <h2>Choose a new password</h2>
        <p>Use at least eight characters, including letters and numbers.</p>
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}
      <form onSubmit={submit}>
        <label htmlFor="reset-password">New password</label>
        <input
          id="reset-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={!hasValidLink || submitting}
        />
        <label htmlFor="reset-password-confirmation">Confirm new password</label>
        <input
          id="reset-password-confirmation"
          type="password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={!hasValidLink || submitting}
        />
        <button className="btn btn-block" disabled={!hasValidLink || submitting || Boolean(success)}>
          {submitting ? 'Resetting…' : 'Reset password'}
        </button>
        <p className="message">Remember your password? <Link to="/auth">Sign in</Link></p>
      </form>
    </div>
  );
}
