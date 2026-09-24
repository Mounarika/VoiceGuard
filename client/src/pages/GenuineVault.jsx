import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Database, Lock, Trash2, Volume2, 
  Activity, Waves, Sparkles, Clock, RefreshCw, ChevronDown, ChevronUp, UserCheck
} from 'lucide-react';

export const GenuineVault = ({ onTestInLiveCall }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vg_token');
      const res = await fetch('/api/voice/genuine-reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to load genuine reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this genuine voice report?')) return;
    try {
      const token = localStorage.getItem('vg_token');
      const res = await fetch(`/api/voice/genuine-reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReports(reports.filter(r => r.id !== id));
      } else {
        alert('Failed to delete report.');
      }
    } catch (err) {
      alert('Delete error: ' + err.message);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Genuine Voice Reports
        </h1>

        <button
          onClick={fetchReports}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center space-x-1 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
          Loading reports...
        </div>
      ) : reports.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => {
            const isExpanded = expandedId === report.id;
            const c = report.characteristics || {};
            return (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-900">{report.caller_name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          Verified Genuine
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                        {report.phone_number && <span>Phone: <strong className="font-mono text-slate-700">{report.phone_number}</strong></span>}
                        {report.email && <span>Email: <strong className="font-mono text-slate-700">{report.email}</strong></span>}
                        <span>Duration: <strong>{report.duration}s</strong></span>
                        <span>Date: <strong>{new Date(report.created_at).toLocaleDateString()}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleExpand(report.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1 transition"
                    >
                      <span>{isExpanded ? 'Hide Acoustics' : 'View Acoustics'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      title="Delete report"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Acoustic Characteristics */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/70 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs animate-fade-in">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 flex items-center space-x-1">
                        <Volume2 className="w-3 h-3 text-blue-500" />
                        <span>Amplitude</span>
                      </div>
                      <div className="font-bold text-slate-900">{c.amplitude?.dynamicRangeDb || '—'} dB</div>
                      <div className="text-[11px] text-slate-500">RMS: {c.amplitude?.rmsEnergy || '—'}</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 flex items-center space-x-1">
                        <Activity className="w-3 h-3 text-indigo-500" />
                        <span>Pitch (F0)</span>
                      </div>
                      <div className="font-bold text-slate-900">{c.pitch?.f0MeanHz || '—'} Hz</div>
                      <div className="text-[11px] text-slate-500">Jitter: {c.pitch?.jitterPercent || '—'}%</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 flex items-center space-x-1">
                        <Waves className="w-3 h-3 text-cyan-500" />
                        <span>Frequency</span>
                      </div>
                      <div className="font-bold text-slate-900">{c.frequency?.spectralCentroidHz || '—'} Hz</div>
                      <div className="text-[11px] text-slate-500">Rolloff: {c.frequency?.spectralRolloff85Hz || '—'} Hz</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Tone</span>
                      </div>
                      <div className="font-bold text-slate-900">{c.tone?.hnrDb || '—'} dB</div>
                      <div className="text-[11px] text-slate-500">Shimmer: {c.tone?.shimmerPercent || '—'}%</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-emerald-500" />
                        <span>Pace</span>
                      </div>
                      <div className="font-bold text-slate-900">{c.pace?.syllablesPerSec || '—'} syl/s</div>
                      <div className="text-[11px] text-slate-500">Tempo: {c.pace?.tempoBpm || '—'} BPM</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Database className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Genuine Voice Reports Stored</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Analyze voice recordings in Voice Detector and store verified genuine voices here.
          </p>
        </div>
      )}
    </div>
  );
};

export default GenuineVault;
