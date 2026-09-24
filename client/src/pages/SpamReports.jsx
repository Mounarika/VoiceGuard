import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, UserX, Sliders, 
  PlusCircle, RefreshCw, CheckCircle, ChevronRight, AlertOctagon
} from 'lucide-react';

export const SpamReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [callers, setCallers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Score update modal
  const [selectedCaller, setSelectedCaller] = useState(null);
  const [newScoreInput, setNewScoreInput] = useState(50);
  const [scoreReasonInput, setScoreReasonInput] = useState('');
  const [updatingScore, setUpdatingScore] = useState(false);

  // Manual report modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualRisk, setManualRisk] = useState('high');
  const [submittingManual, setSubmittingManual] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vg_token');
      const [reportsRes, callersRes] = await Promise.all([
        fetch('/api/spam/reports', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/spam/callers', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const reportsData = await reportsRes.json();
      const callersData = await callersRes.json();

      if (reportsRes.ok) setReports(reportsData.reports || []);
      if (callersRes.ok) setCallers(callersData.callers || []);
    } catch (err) {
      console.error('Failed to fetch spam data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenScoreUpdate = (caller) => {
    setSelectedCaller(caller);
    setNewScoreInput(caller.spam_score);
    setScoreReasonInput('');
  };

  const handleSaveScoreUpdate = async (e) => {
    e.preventDefault();
    if (!selectedCaller) return;

    setUpdatingScore(true);
    try {
      const token = localStorage.getItem('vg_token');
      const res = await fetch('/api/spam/update-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          callerId: selectedCaller.id,
          newScore: newScoreInput,
          reason: scoreReasonInput.trim() || `Reputation score updated to ${newScoreInput}/100`
        })
      });

      if (res.ok) {
        setSelectedCaller(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update score.');
      }
    } catch (err) {
      alert('Update error: ' + err.message);
    } finally {
      setUpdatingScore(false);
    }
  };

  const handleManualReportSubmit = async (e) => {
    e.preventDefault();
    setSubmittingManual(true);
    try {
      const token = localStorage.getItem('vg_token');
      const res = await fetch('/api/spam/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          callerPhone: manualPhone.trim(),
          callerEmail: manualEmail.trim(),
          callerName: manualName.trim(),
          reasonSummary: manualReason.trim(),
          riskLevel: manualRisk,
          forensicDetails: {
            reportedBy: user?.email,
            flaggedAt: new Date().toISOString()
          }
        })
      });

      if (res.ok) {
        setShowManualModal(false);
        setManualPhone('');
        setManualEmail('');
        setManualName('');
        setManualReason('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit report');
      }
    } catch (err) {
      alert('Report error: ' + err.message);
    } finally {
      setSubmittingManual(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Clean Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Spam Reports & Caller Reputation
        </h1>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center space-x-1.5 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report Suspicious Caller</span>
          </button>
          <button
            onClick={fetchData}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center space-x-1 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Caller Spam Reputation Management Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Caller Spam Reputation</span>
          </h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 rounded-lg text-slate-700">
            {callers.length} Callers
          </span>
        </div>

        {callers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {callers.map((caller) => {
              const isHighSpam = caller.spam_score >= 70;
              const isMediumSpam = caller.spam_score >= 35 && caller.spam_score < 70;
              return (
                <div
                  key={caller.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                    isHighSpam
                      ? 'bg-rose-50/40 border-rose-200'
                      : (isMediumSpam ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50/60 border-slate-200')
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 truncate">{caller.name}</span>
                      <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                        isHighSpam
                          ? 'bg-rose-200 text-rose-900'
                          : (isMediumSpam ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900')
                      }`}>
                        {caller.spam_score}/100
                      </span>
                    </div>
                    {caller.phone_number && <div className="text-[11px] font-mono text-slate-600">{caller.phone_number}</div>}
                    {caller.email && <div className="text-[11px] font-mono text-slate-500 truncate">{caller.email}</div>}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase ${
                      isHighSpam ? 'text-rose-700' : (isMediumSpam ? 'text-amber-700' : 'text-emerald-700')
                    }`}>
                      {caller.status}
                    </span>
                    <button
                      onClick={() => handleOpenScoreUpdate(caller)}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition flex items-center space-x-1"
                    >
                      <span>Update Score</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs">
            No callers recorded yet. Callers will automatically appear as you analyze live calls.
          </div>
        )}
      </div>

      {/* Main: Spam Incident Reports Audit Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Spam Reports
            </h2>
          </div>
          <span className="text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-lg">
            {reports.length} Reports
          </span>
        </div>

        {reports.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {reports.map((report) => (
              <div key={report.id} className="p-5 hover:bg-slate-50/70 transition">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Caller Details */}
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                      <UserX className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-900">{report.caller_name}</h3>
                        {report.caller_phone && (
                          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {report.caller_phone}
                          </span>
                        )}
                        {report.caller_email && (
                          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {report.caller_email}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          report.risk_level === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {report.risk_level} Risk
                        </span>
                      </div>

                      {/* Reason for Suspicion */}
                      <div className="mt-2 p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl text-xs">
                        <div className="flex items-center space-x-1.5 font-bold text-rose-900 mb-0.5">
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                          <span>Reason for Suspicion:</span>
                        </div>
                        <p className="text-slate-800 font-medium">
                          {report.reason_summary}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-2">
                        <span>Reported: {new Date(report.created_at).toLocaleString()}</span>
                        {report.reported_by_email && <span>• By: {report.reported_by_email}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Spam Score */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Spam Score</div>
                    <div className="text-xl font-black font-mono text-rose-600">
                      {report.spam_score}<span className="text-xs font-normal text-slate-400">/100</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400 text-xs">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-70" />
            <p className="font-semibold text-slate-700">No Spam Reports</p>
            <p className="text-slate-500 mt-0.5">High-risk or suspicious calls will be documented here.</p>
          </div>
        )}
      </div>

      {/* Modal: Update Caller Spam Reputation Score */}
      {selectedCaller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Update Caller Spam Reputation</h3>
            <p className="text-xs text-slate-500 mb-3">{selectedCaller.name}</p>

            <form onSubmit={handleSaveScoreUpdate} className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Reputation Score:</span>
                  <span className={`font-mono text-xs font-bold ${
                    newScoreInput >= 70 ? 'text-rose-600' : (newScoreInput >= 35 ? 'text-amber-600' : 'text-emerald-600')
                  }`}>
                    {newScoreInput} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={newScoreInput}
                  onChange={(e) => setNewScoreInput(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Score Adjustment:
                </label>
                <textarea
                  required
                  rows={2}
                  value={scoreReasonInput}
                  onChange={(e) => setScoreReasonInput(e.target.value)}
                  placeholder="Enter reason for updating reputation..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                ></textarea>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCaller(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingScore}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  {updatingScore ? 'Saving...' : 'Apply Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manual Flag Suspicious Caller */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Report Suspicious Caller</h3>
            <p className="text-xs text-slate-500 mb-3">Record a caller incident into spam reports.</p>

            <form onSubmit={handleManualReportSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-0.5">Caller Name</label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">Phone Number</label>
                  <input
                    type="text"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="Enter phone"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">Email</label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="Enter email"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-0.5">Risk Level</label>
                <select
                  value={manualRisk}
                  onChange={(e) => setManualRisk(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                  Reason Why It Was Flagged Suspicious
                </label>
                <textarea
                  required
                  rows={2}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Detail the reason for suspicion..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                ></textarea>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  {submittingManual ? 'Saving...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpamReports;
