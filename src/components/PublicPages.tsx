import {useState, type FormEvent} from 'react';
import {Icon} from './Icons';
import {
  CalendarPlanIllustration,
  PiggyBankIllustration,
  WalletCoinsIllustration,
} from './Illustrations';
import type {RoutePath} from '../types';

export function LandingPage({
  onNavigate,
  onTryDemo,
}: {
  onNavigate: (path: RoutePath) => void;
  onTryDemo: () => void;
}) {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F3FAF7] py-8">
      <div className="mx-auto max-w-5xl px-4">
        <section className="bb-card-in rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-sm sm:p-9">
          <div className="grid items-center gap-8 md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="text-sm font-bold text-[#0E7C66]">
                Made for everyday salary and wage earners in Nigeria
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#12201B] sm:text-4xl">
                Plan your salary, track your spending, and know you&apos;re on track
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-[#43564F]">
                Spread yearly rent and termly school fees smoothly across every month, log daily
                spending in three taps, and see clearly how much is safe to spend today.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/register')}
                  className="bb-btn inline-flex min-h-[50px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#0E7C66] px-6 py-3 text-base font-bold text-white shadow-xs hover:bg-[#0A5A4A]">
                  <span>Create account</span>
                  <Icon name="arrow-right" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onTryDemo}
                  className="bb-btn inline-flex min-h-[50px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#F4A81D] px-5 py-3 text-base font-bold text-[#12201B] shadow-xs hover:bg-[#E0960E]">
                  <Icon name="sparkles" className="h-5 w-5" />
                  <span>Try the demo</span>
                </button>
                <a
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/login');
                  }}
                  className="bb-btn inline-flex min-h-[50px] items-center justify-center whitespace-nowrap rounded-2xl border border-[#C3D4CB] bg-white px-5 py-3 text-base font-bold text-[#12201B] hover:bg-[#F3FAF7]">
                  Log in
                </a>
              </div>
            </div>

            <div className="flex justify-center md:col-span-5">
              <WalletCoinsIllustration className="h-44 w-56 sm:h-52 sm:w-64" />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-3">
          <article className="bb-card-in rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E6F5EF] text-[#0E7C66]">
                <Icon name="wallet" className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold text-[#5A6B64]">Step 1</span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#12201B]">Tell us what you earn</h2>
            <p className="mt-2 text-base text-[#43564F]">
              Share your take-home pay, when payday arrives, and the things you must pay each month
              or year.
            </p>
          </article>

          <article className="bb-card-in rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]">
                <Icon name="piggy-bank" className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold text-[#5A6B64]">Step 2</span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#12201B]">Get one calm plan</h2>
            <p className="mt-2 text-base text-[#43564F]">
              Bills and big yearly costs are set aside first, followed by a cushion for surprises,
              savings, and what you can enjoy.
            </p>
          </article>

          <article className="bb-card-in rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#EBF3FF] text-[#1D4ED8]">
                <Icon name="calendar" className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold text-[#5A6B64]">Step 3</span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#12201B]">Log daily &amp; check in</h2>
            <p className="mt-2 text-base text-[#43564F]">
              See one clear daily figure update whenever you spend, and read encouraging weekly
              summaries.
            </p>
          </article>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="flex items-center gap-4 rounded-[20px] border border-[#DCEAE3] bg-white p-5 shadow-xs">
            <PiggyBankIllustration className="hidden h-24 w-28 shrink-0 sm:block" />
            <div>
              <h2 className="text-lg font-bold text-[#12201B]">No confusing jargon</h2>
              <p className="mt-1 text-base text-[#43564F]">
                Plain everyday words explain every step, with simple guides whenever you want a
                closer look.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-[20px] border border-[#DCEAE3] bg-white p-5 shadow-xs">
            <CalendarPlanIllustration className="hidden h-24 w-28 shrink-0 sm:block" />
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#12201B]">
                <Icon name="shield-check" className="h-5 w-5 text-[#0E7C66]" />
                <span>Private by design</span>
              </h2>
              <p className="mt-1 text-base text-[#43564F]">
                We never ask for bank account numbers, debit cards, BVN, or NIN. Guidance only, not
                professional financial advice.
              </p>
            </div>
          </div>
        </section>
      </div>
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
    <div className="min-h-[calc(100vh-64px)] bg-[#F3FAF7] py-8">
      <div className="mx-auto max-w-xl px-4">
        <div className="bb-card-in rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E6F5EF] text-[#0E7C66]">
              <Icon name="users" className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-[#12201B]">Create your account</h1>
              <p className="text-base text-[#43564F]">
                Enter an email or phone number to save your plan.
              </p>
            </div>
          </div>

          {errors.length > 0 && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-2xl border border-[#F4C2C2] bg-[#FFF5F5] p-4 text-base text-[#9B1C1C]">
              <Icon name="alert-triangle" className="mt-0.5 h-5 w-5 shrink-0" />
              <ul className="list-disc space-y-1 pl-4">
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="reg-name" className="mb-1.5 block text-base font-semibold text-[#12201B]">
                Display name
              </label>
              <input
                id="reg-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="For example: Tolu or Chinedu"
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-4 py-3 text-base text-[#12201B] focus:border-[#0E7C66] focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="reg-email"
                  className="mb-1.5 block text-base font-semibold text-[#12201B]">
                  Email address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-4 py-3 text-base text-[#12201B] focus:border-[#0E7C66] focus:outline-none"
                />
                <p className="mt-1 text-sm text-[#5A6B64]">Optional if you enter a phone number.</p>
              </div>

              <div>
                <label
                  htmlFor="reg-phone"
                  className="mb-1.5 block text-base font-semibold text-[#12201B]">
                  Phone number
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0803 123 4567"
                  className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-4 py-3 text-base text-[#12201B] focus:border-[#0E7C66] focus:outline-none"
                />
                <p className="mt-1 text-sm text-[#5A6B64]">Optional if you enter an email.</p>
              </div>
            </div>

            <div>
              <label htmlFor="reg-pass" className="mb-1.5 block text-base font-semibold text-[#12201B]">
                Password
              </label>
              <input
                id="reg-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-4 py-3 text-base text-[#12201B] focus:border-[#0E7C66] focus:outline-none"
              />
              <p className="mt-1 text-sm text-[#43564F]">
                Use at least 8 characters. Three easy words with a number is strong and simple to
                remember.
              </p>
            </div>

            <div>
              <label
                htmlFor="reg-confirm"
                className="mb-1.5 block text-base font-semibold text-[#12201B]">
                Confirm password
              </label>
              <input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Type your password again"
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-4 py-3 text-base text-[#12201B] focus:border-[#0E7C66] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="bb-btn inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0E7C66] px-5 py-3 text-base font-bold text-white shadow-xs hover:bg-[#0A5A4A]">
              <span>Create account</span>
              <Icon name="arrow-right" className="h-5 w-5" />
            </button>
          </form>

          <p className="mt-5 text-base text-[#43564F]">
            Already have an account?{' '}
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/login');
              }}
              className="font-bold text-[#0A5A4A] underline">
              Log in
            </a>
          </p>
        </div>
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
    <div className="min-h-[calc(100vh-64px)] bg-[#F3FAF7] py-8">
      <div className="mx-auto max-w-md px-4">
        <div className="bb-card-in rounded-[20px] border border-[#DCEAE3] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E6F5EF] text-[#0E7C66]">
              <Icon name="wallet" className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-[#12201B]">Welcome back</h1>
              <p className="text-base text-[#43564F]">Log in with your email or phone number.</p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-2xl border border-[#F4C2C2] bg-[#FFF5F5] p-4 text-base text-[#9B1C1C]">
              <Icon name="alert-triangle" className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-id" className="mb-1.5 block text-base font-semibold text-[#12201B]">
                Email or phone number
              </label>
              <input
                id="login-id"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or 0803 123 4567"
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-4 py-3 text-base text-[#12201B] focus:border-[#0E7C66] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="login-pw" className="mb-1.5 block text-base font-semibold text-[#12201B]">
                Password
              </label>
              <input
                id="login-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="min-h-[48px] w-full rounded-2xl border border-[#C3D4CB] px-4 py-3 text-base text-[#12201B] focus:border-[#0E7C66] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="bb-btn inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0E7C66] px-5 py-3 text-base font-bold text-white shadow-xs hover:bg-[#0A5A4A]">
              <span>Log in</span>
              <Icon name="arrow-right" className="h-5 w-5" />
            </button>
          </form>

          <p className="mt-5 text-base text-[#43564F]">
            New to Budget Buddy?{' '}
            <a
              href="/register"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/register');
              }}
              className="font-bold text-[#0A5A4A] underline">
              Create account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
