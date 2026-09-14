import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient, { getApiErrorMessage } from '../axiosClient';
import type { ApiErrors } from '../types/domain';

interface RegistrationForm {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

type RegistrationField = keyof RegistrationForm;

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState<ApiErrors>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrors({});
    setMessage('');

    try {
      const { data } = await axiosClient.post<{ message: string }>('/register', form);
      setMessage(data.message);
      window.setTimeout(() => navigate('/auth', { replace: true }), 1800);
    } catch (requestError: unknown) {
      const message = getApiErrorMessage(requestError, 'Registration could not be completed.');
      const response = requestError as { response?: { data?: { errors?: ApiErrors } } };
      setErrors(response.response?.data?.errors || { form: [message] });
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name: RegistrationField, label: string, type = 'text', autoComplete: string = name) => (
    <>
      <label htmlFor={`register-${name}`}>{label}</label>
      <input
        id={`register-${name}`}
        type={type}
        value={form[name]}
        onChange={(event) => setForm({ ...form, [name]: event.target.value })}
        autoComplete={autoComplete}
        aria-describedby={errors[name] ? `register-${name}-error` : undefined}
        required
      />
      {errors[name] && <p className="field-error" id={`register-${name}-error`}>{errors[name][0]}</p>}
    </>
  );

  return (
    <div className="auth-card animated fadeInDown">
      <header className="auth-card-header">
        <p className="auth-eyebrow">Student access</p>
        <h2>Create your account</h2>
        <p>We will send a time-limited verification link to your email.</p>
      </header>
      {message && <div className="alert alert-success" role="status">{message}</div>}
      {errors.form && <div className="alert" role="alert">{errors.form[0]}</div>}
      <form onSubmit={submit}>
        {field('name', 'Full name', 'text', 'name')}
        {field('email', 'Email address', 'email', 'email')}
        {field('password', 'Password', 'password', 'new-password')}
        {field('password_confirmation', 'Confirm password', 'password', 'new-password')}
        <button className="btn btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="message">Already registered? <Link to="/auth">Sign in</Link></p>
    </div>
  );
}
