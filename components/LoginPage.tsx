import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('admin_token', data.token);
        navigate('/');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040404] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none -z-10 opacity-30"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ff4d00]/5 blur-[150px] pointer-events-none -z-10 rounded-full"></div>

      <div className="w-full max-w-md animate-in slide-in-from-bottom-8 duration-700 fade-in">
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff4d00] to-orange-400"></div>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#ff4d00]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#ff4d00]/20">
              <Lock className="w-8 h-8 text-[#ff4d00]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Admin Portal</h1>
            <p className="text-zinc-500 text-sm text-center">Enter your credentials to access the command center.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 items-center">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#040404] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#ff4d00]/50 transition-colors placeholder:text-zinc-600"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#040404] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#ff4d00]/50 transition-colors placeholder:text-zinc-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#ff4d00] hover:bg-[#ff4d00]/90 text-white rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center flex items-center justify-center gap-2 text-zinc-600 text-xs font-medium tracking-wide">
          <Activity className="w-3 h-3" />
          SECURE CONNECTION
        </div>
      </div>
    </div>
  );
};
