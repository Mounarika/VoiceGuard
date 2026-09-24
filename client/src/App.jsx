import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import VoiceDetector from './pages/VoiceDetector';
import LiveCallAnalyzer from './pages/LiveCallAnalyzer';
import GenuineVault from './pages/GenuineVault';
import SpamReports from './pages/SpamReports';
import AdminDashboard from './pages/AdminDashboard';
import { Shield, RefreshCw } from 'lucide-react';

function AppContent() {
  const { user, isLoading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('detector');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25 animate-pulse">
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-slate-600">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Initializing VoiceGuard AI Enclave...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'detector' && (
          <VoiceDetector onVoiceEnrolled={() => setActiveTab('vault')} />
        )}
        {activeTab === 'live-call' && <LiveCallAnalyzer />}
        {activeTab === 'vault' && (
          <GenuineVault onTestInLiveCall={() => setActiveTab('live-call')} />
        )}
        {activeTab === 'spam' && <SpamReports />}
        {activeTab === 'admin' && isAdmin && <AdminDashboard />}
      </main>

      {/* Modern Light Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
              VG
            </div>
            <span className="font-semibold text-slate-700">VoiceGuard AI Forensic Biometrics</span>
            <span>•</span>
            <span>Private User-Scoped Enclave</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>DSP Feature Vector: 9-Dimensional</span>
            <span>•</span>
            <span>Classification: Spectral & Jitter Analysis</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">Protected Session</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
