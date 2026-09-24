import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, User, ShieldAlert, ArrowRight } from 'lucide-react';

export const Login = () => {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFillCredentials = (type) => {
    if (type === 'admin') {
      setEmail('admin@voiceguard.ai');
      setPassword('Admin@VoiceGuard2026!');
    } else {
      setEmail('user@voiceguard.ai');
      setPassword('User@VoiceGuard2026!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">VoiceGuard AI</h1>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Clean Credentials Hint */}
        <div className="mb-4 bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-800">System Accounts:</span>
            <div className="text-[11px] text-slate-500 mt-0.5 space-x-2">
              <button 
                type="button" 
                onClick={() => handleFillCredentials('admin')}
                className="text-blue-600 hover:underline font-medium"
              >
                Admin (admin@voiceguard.ai)
              </button>
              <span>•</span>
              <button 
                type="button" 
                onClick={() => handleFillCredentials('user')}
                className="text-blue-600 hover:underline font-medium"
              >
                User (user@voiceguard.ai)
              </button>
            </div>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono">
            Admin@VoiceGuard2026!
          </span>
        </div>

        {/* Form Container */}
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-8">
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegisterMode(false); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                !isRegisterMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegisterMode(true); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                isRegisterMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition flex items-center justify-center space-x-2 mt-2"
            >
              <span>{loading ? 'Authenticating...' : (isRegisterMode ? 'Register Account' : 'Sign In')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
