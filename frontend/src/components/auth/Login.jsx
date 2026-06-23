import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Btn, Banner, inputCls } from '../ui.jsx';
import { IconMail, IconLock } from '../Icon.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      {/* Brand panel (desktop) */}
      <div className="hidden lg:flex ink-panel text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="gold-rule" />
            <span className="text-2xs font-bold uppercase tracking-[0.18em] text-gold-light">
              Centre Point Hospitality
            </span>
          </div>
          <h1 className="font-serif text-[36px] leading-[1.1]">
            Asset Handover<br />Register
          </h1>
          <p className="text-white/60 mt-4 max-w-sm text-[14px]">
            Hariganga → CPH · Centre Point Amravati. Secure access for the handover team.
          </p>
        </div>
        <div className="text-white/40 text-2xs uppercase tracking-wider">Authorised personnel only</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 paper-bg">
        <form onSubmit={submit} className="w-full max-w-[380px]">
          <div className="lg:hidden mb-7">
            <div className="flex items-center gap-2 mb-2">
              <span className="gold-rule !w-5" />
              <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gold">
                Centre Point Hospitality
              </span>
            </div>
            <h1 className="font-serif text-[22px] text-navy leading-tight">Asset Handover Register</h1>
          </div>

          <h2 className="font-serif text-[26px] text-navy">Sign in</h2>
          <p className="text-muted text-[13.5px] mt-1 mb-6">Use your handover account to continue.</p>

          {error && <Banner tone="error" role="alert">{error}</Banner>}

          <label className="block text-[12.5px] font-semibold text-navy mb-1">Email</label>
          <div className="relative mb-3">
            <IconMail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="email"
              autoComplete="email"
              className={`${inputCls} !pl-9`}
              placeholder="you@centrepoint.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <label className="block text-[12.5px] font-semibold text-navy mb-1">Password</label>
          <div className="relative">
            <IconLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              className={`${inputCls} !pl-9 !pr-16`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-navy hover:text-gold px-1.5 py-1
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light rounded"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>

          <Btn type="submit" variant="primary" block loading={busy} className="mt-6">
            {busy ? 'Signing in…' : 'Sign in'}
          </Btn>
        </form>
      </div>
    </div>
  );
}
