import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Radio, Mic, Database, AlertTriangle, ShieldCheck, LogOut, UserCheck } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { id: 'detector', label: 'Voice Detector', icon: Mic },
    { id: 'live-call', label: 'Live Call Analyzer', icon: Radio },
    { id: 'vault', label: 'Genuine Voice Vault', icon: Database },
    { id: 'spam', label: 'Spam Reputation & Reports', icon: AlertTriangle },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Console', icon: ShieldCheck });
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/90 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('detector')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">VoiceGuard</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">AI</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Acoustic Forensic & Biometrics</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-100/90 border border-slate-200 text-xs">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-800 leading-tight truncate max-w-[130px]">
                  {user?.full_name}
                </div>
                <div className="flex items-center space-x-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-purple-500' : 'bg-emerald-500'}`}></span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex overflow-x-auto py-2 border-t border-slate-100 space-x-1 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
