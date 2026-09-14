import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axiosClient, { getApiErrorMessage } from '../axiosClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await axiosClient.post<{ message: string }>('/forgot-password', { email });
      setSuccess(data.message);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'The reset request could not be completed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card animated fadeInDown">
      <header className="auth-card-header">
        <p className="auth-eyebrow">Account recovery</p>
        <h2>Reset your password</h2>
        <p>Enter your school email. For privacy, the response is the same whether or not an account exists.</p>
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}
      <form onSubmit={submit}>
        <label htmlFor="forgot-email">Email address</label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
        <button className="btn btn-block" disabled={submitting}>
          {submitting ? 'Requesting…' : 'Send reset link'}
        </button>
        <p className="message">Remember your password? <Link to="/auth">Sign in</Link></p>
      </form>
    </div>
  );
}
