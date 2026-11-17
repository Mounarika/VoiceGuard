import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { 
  ShieldCheck, Activity, AlertOctagon, 
  BarChart, RefreshCw, Database, CheckCircle, ShieldAlert
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/spam/admin-stats');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch admin stats.');
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Admin Console
        </h1>

        <button
          onClick={fetchAdminStats}
          className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center space-x-1 transition"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchAdminStats} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Admin User Info Tag */}
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          <span>Administrator: <strong className="font-semibold">{user?.full_name}</strong> ({user?.email})</span>
        </div>
        <span className="font-bold text-[11px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded">
          Admin Access
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">Total Analyses</div>
            <div className="text-xl font-bold text-slate-900">
              {loading ? '…' : (stats?.totalAnalyses ?? '—')}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">AI Spoofs Detected</div>
            <div className="text-xl font-bold text-rose-600">
              {loading ? '…' : (stats?.aiDetections ?? '—')}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">Genuine Reports</div>
            <div className="text-xl font-bold text-emerald-600">
              {loading ? '…' : (stats?.genuineVaultCount ?? '—')}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">Spam Reports</div>
            <div className="text-xl font-bold text-slate-900">
              {loading ? '…' : (stats?.totalSpamReports ?? '—')}
            </div>
          </div>
        </div>
      </div>

      {/* System Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
            <BarChart className="w-4 h-4 text-blue-600" />
            <span>Detection Performance</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1 text-slate-700">
                <span>AI detections among voice analyses:</span>
                <span className="text-blue-600 font-mono font-bold">
                  {loading ? '…' : `${stats?.aiDetectionRate ?? 0}%`}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${stats?.aiDetectionRate ?? 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1 text-slate-700">
                <span>High-risk live calls:</span>
                <span className="text-emerald-600 font-mono font-bold">
                  {loading ? '…' : `${stats?.highRiskCallRate ?? 0}%`}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${stats?.highRiskCallRate ?? 0}%` }}></div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Derived from {stats?.totalAnalyses ?? 0} voice analyses and {stats?.totalLiveCalls ?? 0} live calls.
          </p>
        </div>

        {/* Policies */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Security Policies</span>
          </h3>

          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Multi-tenant data isolation enforced by User ID</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Email & SMS OTP challenge on High Risk calls</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Automatic caller spam reputation penalty on high risk</span>
            </li>
          </ul>

          <div className="mt-4 pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
            VoiceGuard Engine • SQLite WAL
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
