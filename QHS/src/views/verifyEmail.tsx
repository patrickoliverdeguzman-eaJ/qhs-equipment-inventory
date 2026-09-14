import { useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import axiosClient, { getApiErrorMessage } from '../axiosClient';

export default function VerifyEmail() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const initialEmail = (location.state as { email?: string } | null)?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState(
    status === 'success'
      ? 'Your email is verified. You can sign in now.'
      : status === 'already_verified'
        ? 'This email is already verified.'
        : '',
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await axiosClient.post<{ message: string }>('/email/resend', { email });
      setMessage(data.message);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'The verification email could not be requested.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card animated fadeInDown">
      <header className="auth-card-header">
        <p className="auth-eyebrow">Email verification</p>
        <h2>Check your inbox</h2>
        <p>Verification links expire after 24 hours and can only verify the account named in the signed link.</p>
      </header>
      {message && <div className="alert alert-success" role="status">{message}</div>}
      {error && <div className="alert" role="alert">{error}</div>}
      {!status && (
        <form onSubmit={resend}>
          <label htmlFor="verification-email">Email address</label>
          <input
            id="verification-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <button className="btn btn-block" disabled={submitting}>
            {submitting ? 'Requesting…' : 'Resend verification email'}
          </button>
        </form>
      )}
      <p className="message"><Link to="/auth">Return to sign in</Link></p>
    </div>
  );
}
