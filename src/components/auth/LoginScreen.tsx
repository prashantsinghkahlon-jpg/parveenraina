import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Sparkles, 
  Building2, 
  Users, 
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
  onOpenSetup?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { login, systemStatus, allUsers } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showQuickFill, setShowQuickFill] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Please enter your Email or Employee ID.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(identifier.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please verify and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelectUser = (user: any) => {
    setIdentifier(user.email || user.employeeId);
    setPassword('');
    setErrorMessage(null);
  };

  const companyName = systemStatus?.companyName || 'FieldTrack Pro Enterprise';
  const companyCode = systemStatus?.companyCode;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 antialiased selection:bg-blue-600 selection:text-white">
      {/* Dynamic Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/90 to-slate-950 z-0" />

      <div className="relative z-10 w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Branding Section */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-800 to-slate-850 border-b border-slate-700/80 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30 text-white mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {companyName}
          </h2>
          {companyCode && (
            <p className="text-xs font-mono font-bold text-blue-400 mt-0.5 uppercase tracking-wider">
              {companyCode} &bull; SECURE WORKFORCE PORTAL
            </p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            Sign in with your corporate credentials to access GPS Tracking, Attendance, &amp; Field Operations.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Email or Employee ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. admin@company.com or FE-101"
                  autoComplete="username"
                  required
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 accent-blue-500"
                />
                <span className="text-xs text-slate-400">Remember this session</span>
              </label>

              <span className="text-[11px] text-slate-500 font-mono">
                v1.2.0-prod
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to FieldTrack</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Accounts (for Deployment Testing) */}
          {allUsers && allUsers.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-700/80">
              <button
                type="button"
                onClick={() => setShowQuickFill(!showQuickFill)}
                className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 font-semibold transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Personnel Directory ({allUsers.length})</span>
                </span>
                <span className="text-[10px] text-blue-400 underline uppercase tracking-wider">
                  {showQuickFill ? 'Hide' : 'Select Identifier'}
                </span>
              </button>

              {showQuickFill && (
                <div className="mt-3 space-y-2 animate-in fade-in max-h-48 overflow-y-auto">
                  <p className="text-[11px] text-amber-300/90 font-medium px-1">
                    Selecting your profile populates your Login ID. You must enter your personal password to access your account.
                  </p>
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickSelectUser(u)}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 flex items-center justify-between group transition-all"
                    >
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {u.email || u.employeeId} &bull; <span className="uppercase text-[10px] font-bold text-slate-500">{u.role}</span>
                        </div>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-blue-300 rounded font-mono border border-slate-700">
                        Fill ID
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-6 text-center text-xs text-slate-500 relative z-10 flex items-center gap-4">
        <span>Protected by Authenticity Watermarking &bull; Anti-Spoof Lock</span>
      </div>
    </div>
  );
};
