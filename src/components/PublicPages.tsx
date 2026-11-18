import {useState, type FormEvent} from 'react';
import {ShieldCheck} from 'lucide-react';
import type {RoutePath} from '../types';

export function LandingPage({
  onNavigate,
  onTryDemo,
}: {
  onNavigate: (path: RoutePath) => void;
  onTryDemo: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <section className="rounded-[14px] border border-[#E1E8E4] bg-white p-7 shadow-xs">
        <span className="inline-block rounded-lg bg-[#E8F5F1] px-3 py-1 text-xs font-bold text-[#0A5A4A]">
          Built for Nigeria &bull; Naira-first
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#12201B] md:text-4xl">
          Plan your salary, track your spending, and know you&apos;re on track
        </h1>
        <p className="mt-3 max-w-2xl text-base text-[#5A6B64]">
          A calm personal money planner for salary and wage earners in Nigeria — spread annual rent
          and termly school fees evenly, log daily spending in seconds, and read honest weekly
          check-ins.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/register')}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0E7C66] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0A5A4A]">
            Create account
          </button>
          <button
            type="button"
            onClick={onTryDemo}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#F4A81D] px-5 py-3 text-sm font-bold text-[#12201B] transition-colors hover:bg-[#DF950F]">
            Try the demo
          </button>
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/login');
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#C9D5CF] bg-white px-5 py-3 text-sm font-bold text-[#12201B] hover:bg-[#F5F7F4]">
            Log in
          </a>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E7C66] text-sm font-extrabold text-white">
            1
          </div>
          <h2 className="text-lg font-bold text-[#12201B]">Tell us your real numbers</h2>
          <p className="mt-1.5 text-sm text-[#5A6B64]">
            Add your take-home pay, payday schedule, recurring bills, and savings goals in five
            short steps.
          </p>
        </article>

        <article className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E7C66] text-sm font-extrabold text-white">
            2
          </div>
          <h2 className="text-lg font-bold text-[#12201B]">Get your monthly &amp; yearly plan</h2>
          <p className="mt-1.5 text-sm text-[#5A6B64]">
            Essentials and annual bills are set aside first, followed by a buffer, safety net, goals,
            and flexible daily spending.
          </p>
        </article>

        <article className="rounded-[14px] border border-[#E1E8E4] bg-white p-5 shadow-xs">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E7C66] text-sm font-extrabold text-white">
            3
          </div>
          <h2 className="text-lg font-bold text-[#12201B]">Log daily &amp; review weekly</h2>
          <p className="mt-1.5 text-sm text-[#5A6B64]">
            Watch your safe-to-spend-today figure update in real time and read calm feedback every
            week.
          </p>
        </article>
      </section>

      <section className="mt-6 flex items-start gap-3 rounded-[14px] border border-[#E1E8E4] bg-white/80 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0E7C66]" aria-hidden="true" />
        <div>
          <h2 className="text-base font-bold text-[#12201B]">Your privacy stays protected</h2>
          <p className="mt-1 text-sm text-[#5A6B64]">
            Budget Buddy never asks for bank account numbers, debit cards, BVN, or NIN. Budgeting
            guidance, not professional financial advice.
          </p>
        </div>
      </section>
    </div>
  );
}

export function RegisterPage({
  onRegister,
  onNavigate,
}: {
  onRegister: (data: {
    displayName: string;
    email: string;
    phone: string;
    password: string;
  }) => string | null;
  onNavigate: (path: RoutePath) => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: string[] = [];
    const cleanName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      nextErrors.push('Please enter your display name.');
    }
    if (!cleanEmail && !cleanPhone) {
      nextErrors.push('Please enter an email address or a phone number.');
    }
    if (cleanEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      nextErrors.push('Please enter a valid email address.');
    }
    if (cleanPhone && cleanPhone.replace(/\D/g, '').length < 7) {
      nextErrors.push('Please enter a valid phone number (for example 0803 123 4567).');
    }
    if (password.length < 8) {
      nextErrors.push('Password must be at least 8 characters long.');
    }
    if (password !== confirmPassword) {
      nextErrors.push('Passwords do not match.');
    }

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    const serverErr = onRegister({
      displayName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password,
    });
    if (serverErr) {
      setErrors([serverErr]);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="rounded-[14px] border border-[#E1E8E4] bg-white p-6 shadow-xs">
        <h1 className="text-2xl font-extrabold text-[#12201B]">Create your account</h1>
        <p className="mt-1 text-sm text-[#5A6B64]">
          Enter an email address or a phone number. No bank details needed.
        </p>

        {errors.length > 0 && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-[#F4C2C2] bg-[#FDECEC] p-3.5 text-sm text-[#9B1C1C]">
            <ul className="list-disc pl-5">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          <div>
            <label htmlFor="reg-name" className="mb-1 block text-sm font-semibold text-[#12201B]">
              Display name
            </label>
            <input
              id="reg-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="For example: Tolu or Chinedu"
              className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm focus:border-[#0E7C66] focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="reg-email"
                className="mb-1 block text-sm font-semibold text-[#12201B]">
                Email (optional if phone given)
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm focus:border-[#0E7C66] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="reg-phone"
                className="mb-1 block text-sm font-semibold text-[#12201B]">
                Phone number (optional if email given)
              </label>
              <input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0803 123 4567"
                className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm focus:border-[#0E7C66] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-pass" className="mb-1 block text-sm font-semibold text-[#12201B]">
              Password
            </label>
            <input
              id="reg-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm focus:border-[#0E7C66] focus:outline-none"
            />
            <p className="mt-1 text-xs text-[#5A6B64]">
              Minimum 8 characters. Three random words with a number is strong and easy to remember.
            </p>
          </div>

          <div>
            <label
              htmlFor="reg-confirm"
              className="mb-1 block text-sm font-semibold text-[#12201B]">
              Confirm password
            </label>
            <input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm focus:border-[#0E7C66] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="min-h-12 w-full rounded-xl bg-[#0E7C66] px-4 py-3 text-sm font-bold text-white hover:bg-[#0A5A4A]">
            Create account
          </button>
        </form>

        <p className="mt-4 text-sm text-[#5A6B64]">
          Already registered?{' '}
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/login');
            }}
            className="font-semibold text-[#0A5A4A] underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}

export function LoginPage({
  onLogin,
  onNavigate,
}: {
  onLogin: (identifier: string, password: string) => boolean;
  onNavigate: (path: RoutePath) => void;
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("That didn't match. Please check and try again.");
      return;
    }
    const ok = onLogin(identifier.trim(), password);
    if (!ok) {
      setError("That didn't match. Please check and try again.");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded-[14px] border border-[#E1E8E4] bg-white p-6 shadow-xs">
        <h1 className="text-2xl font-extrabold text-[#12201B]">Log in</h1>
        <p className="mt-1 text-sm text-[#5A6B64]">
          Use the email address or phone number you registered with.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-[#F4C2C2] bg-[#FDECEC] p-3.5 text-sm text-[#9B1C1C]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          <div>
            <label htmlFor="login-id" className="mb-1 block text-sm font-semibold text-[#12201B]">
              Email or phone number
            </label>
            <input
              id="login-id"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or 0803 123 4567"
              className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm focus:border-[#0E7C66] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="login-pw" className="mb-1 block text-sm font-semibold text-[#12201B]">
              Password
            </label>
            <input
              id="login-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-[#C9D5CF] px-3 py-2.5 text-sm focus:border-[#0E7C66] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="min-h-12 w-full rounded-xl bg-[#0E7C66] px-4 py-3 text-sm font-bold text-white hover:bg-[#0A5A4A]">
            Log in
          </button>
        </form>

        <p className="mt-4 text-sm text-[#5A6B64]">
          Don&apos;t have an account yet?{' '}
          <a
            href="/register"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/register');
            }}
            className="font-semibold text-[#0A5A4A] underline">
            Create account
          </a>
        </p>
      </div>
    </div>
  );
}
