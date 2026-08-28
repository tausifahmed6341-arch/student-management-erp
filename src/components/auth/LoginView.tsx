import React, { useState } from 'react';
import { Building, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onClose, isModal = false }) => {
  const { login, quickSwitchUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotMsg, setShowForgotMsg] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const success = await login(email, password);
      if (success) {
        if (onClose) onClose();
      } else {
        setErrorMessage('Invalid credentials. Please verify your email and password.');
      }
    } catch {
      setErrorMessage('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'superAdmin' | 'admin' | 'teacher' | 'student') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let targetEmail = 'admin@apextech.edu';
      if (role === 'superAdmin') targetEmail = 'superadmin@nexus.edu';
      if (role === 'admin') targetEmail = 'admin@apextech.edu';
      if (role === 'teacher') targetEmail = 'alan.turing@apextech.edu';
      if (role === 'student') targetEmail = 'alex.rivera@apextech.edu';

      setEmail(targetEmail);
      setPassword('Password@123');

      const success = await login(targetEmail, 'Password@123', 'org_apex');
      if (success && onClose) {
        onClose();
      }
    } catch {
      setErrorMessage('Failed to log in with demo account.');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200/80 dark:border-slate-800 relative">
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Left Column: ERP Nexus Blueprint Banner (Exact UI from screenshot) */}
      <div className="lg:col-span-6 bg-nexus-grid-fine p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Brand Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-xs">
            <Building className="w-4 h-4 text-white" />
            <span>ERP Nexus</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
              Unified Student Management Platform
            </h1>
            <p className="text-indigo-100/90 text-sm leading-relaxed max-w-md">
              Streamline academics, fees, attendance, and performance across your institution with role-based intelligence.
            </p>
          </div>

          {/* 2x2 Translucent Metric Cards (Exact from screenshot) */}
          <div className="grid grid-cols-2 gap-3.5 pt-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-white shadow-xs">
              <div className="text-2xl lg:text-3xl font-bold tracking-tight">50K+</div>
              <div className="text-xs text-indigo-100/90 font-medium mt-1">Students Managed</div>
            </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-white shadow-xs">
              <div className="text-2xl lg:text-3xl font-bold tracking-tight">500+</div>
              <div className="text-xs text-indigo-100/90 font-medium mt-1">Institutions</div>
            </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-white shadow-xs">
              <div className="text-2xl lg:text-3xl font-bold tracking-tight">99.9%</div>
              <div className="text-xs text-indigo-100/90 font-medium mt-1">Uptime SLA</div>
            </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-white shadow-xs">
              <div className="text-2xl lg:text-3xl font-bold tracking-tight">24/7</div>
              <div className="text-xs text-indigo-100/90 font-medium mt-1">Support Available</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-8 text-xs text-indigo-200/80 font-medium tracking-wide">
          Secure • Scalable • Compliant
        </div>
      </div>

      {/* Right Column: Sign In & Demo Role Switcher (Exact UI from screenshot) */}
      <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col justify-center bg-white dark:bg-slate-900">
        <div className="max-w-md w-full mx-auto space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Sign in to access your dashboard
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {showForgotMsg && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Demo accounts use <code className="font-mono font-bold">Password@123</code>. Change these credentials before deployment.</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@institution.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotMsg(!showForgotMsg)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-[#4338CA] hover:bg-[#3730A3] text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-500 font-medium shrink-0">
              Or continue with demo account
            </span>
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          </div>

          {/* 2x2 Demo Buttons (Exact colors from screenshot) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleDemoLogin('superAdmin')}
              className="py-2.5 px-3 rounded-lg bg-[#FAF5FF] hover:bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] font-semibold text-xs flex items-center justify-center transition cursor-pointer shadow-xs"
            >
              Demo Super-Admin
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="py-2.5 px-3 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] font-semibold text-xs flex items-center justify-center transition cursor-pointer shadow-xs"
            >
              Demo Admin
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('teacher')}
              className="py-2.5 px-3 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#047857] border border-[#A7F3D0] font-semibold text-xs flex items-center justify-center transition cursor-pointer shadow-xs"
            >
              Demo Teacher
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('student')}
              className="py-2.5 px-3 rounded-lg bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-semibold text-xs flex items-center justify-center transition cursor-pointer shadow-xs"
            >
              Demo Student
            </button>
          </div>

          {/* Default password note */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400">
            Default password for all demo accounts:{' '}
            <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">
              Password@123
            </code>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 md:p-8">
      {content}
    </div>
  );
};
