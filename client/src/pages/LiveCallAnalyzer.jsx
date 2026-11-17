import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import WaveformVisualizer from '../components/WaveformVisualizer';
import SecondaryVerificationModal from '../components/SecondaryVerificationModal';
import { apiFetch } from '../utils/api';
import { 
  Radio, PhoneIncoming, ShieldCheck, ShieldAlert, AlertTriangle, 
  Mic, Square, Upload, RefreshCw, Zap, Clock, FileAudio
} from 'lucide-react';

export const LiveCallAnalyzer = () => {
  const { user } = useAuth();
  const [genuineProfiles, setGenuineProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Manual caller info when no vault profile selected
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [callerEmail, setCallerEmail] = useState('');

  // Audio recording state (arbitrary duration)
  const [callAudioFile, setCallAudioFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [activeCallResult, setActiveCallResult] = useState(null);
  const [showSecondaryModal, setShowSecondaryModal] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch genuine voice profiles
  const fetchProfiles = async () => {
    try {
      const res = await apiFetch('/api/voice/genuine-reports');
      const data = await res.json();
      if (res.ok) {
        setGenuineProfiles(data.reports || []);
        if (data.reports?.length > 0 && !selectedProfileId) {
          setSelectedProfileId(data.reports[0].id);
          setCallerName(data.reports[0].caller_name || '');
          setCallerPhone(data.reports[0].phone_number || '');
          setCallerEmail(data.reports[0].email || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch genuine profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchCallHistory = async () => {
    try {
      const res = await apiFetch('/api/live-call/history');
      const data = await res.json();
      if (res.ok) setCallHistory(data.calls || []);
    } catch (err) {
      console.error('Failed to fetch call history:', err);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchCallHistory();
  }, []);

  // Update caller inputs when profile changes
  const handleProfileSelect = (id) => {
    setSelectedProfileId(id);
    const prof = genuineProfiles.find(p => p.id === parseInt(id, 10));
    if (prof) {
      setCallerName(prof.caller_name || '');
      setCallerPhone(prof.phone_number || '');
      setCallerEmail(prof.email || '');
    }
  };

  // Duration timer for continuous recording
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Mic Recording for live call
  const startCallRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('wav') ? '.wav' : '.webm';
        const recordedFile = new File([audioBlob], `live_call_${Date.now()}${ext}`, { type: mimeType });
        setCallAudioFile(recordedFile);
      };

      mediaRecorderRef.current.start(500);
      setIsRecording(true);
      setError(null);
      setActiveCallResult(null);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permissions.');
    }
  };

  // Stop Mic Recording
  const stopCallRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Handle call audio file selection
  const handleAudioFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCallAudioFile(file);
      setError(null);
      setActiveCallResult(null);
    }
  };

  // Submit actual audio for live call analysis
  const handleAnalyzeLiveCall = async () => {
    if (!callAudioFile) {
      setError('Please record or upload audio of the call to analyze.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('audio', callAudioFile);
    if (selectedProfileId) formData.append('genuineReportId', selectedProfileId);
    formData.append('callerName', callerName || 'Caller');
    if (callerPhone) formData.append('callerPhone', callerPhone);
    if (callerEmail) formData.append('callerEmail', callerEmail);

    try {
      const res = await apiFetch('/api/live-call/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setActiveCallResult(data);
        fetchCallHistory();

        if (data.riskLevel === 'high') {
          setTimeout(() => {
            setShowSecondaryModal(true);
          }, 600);
        }
      } else {
        setError(data.error || 'Live call evaluation failed');
      }
    } catch (err) {
      setError('Error communicating with server: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVerificationDone = (updatedData) => {
    if (activeCallResult) {
      setActiveCallResult(prev => ({
        ...prev,
        verificationStatus: updatedData.verificationStatus
      }));
    }
    fetchCallHistory();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Clean Top Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Live Call Analyzer & Biometric Verification
        </h1>
      </div>

      {/* Control Setup & Stream Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Caller Info & Audio Input */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <PhoneIncoming className="w-4 h-4 text-blue-600" />
            <span>Caller & Reference Profile</span>
          </h2>

          {/* Genuine Profile Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enrolled Voice Reference:
            </label>
            {genuineProfiles.length > 0 ? (
              <select
                value={selectedProfileId}
                onChange={(e) => handleProfileSelect(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {genuineProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.caller_name} {p.phone_number ? `(${p.phone_number})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                No profiles enrolled yet. You can still analyze incoming voice directly.
              </div>
            )}
          </div>

          {/* Caller Details Input */}
          <div className="space-y-2 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Caller Name</label>
              <input
                type="text"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                placeholder="Enter caller name"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Phone Number</label>
                <input
                  type="text"
                  value={callerPhone}
                  onChange={(e) => setCallerPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Email ID (for OTP)</label>
                <input
                  type="email"
                  value={callerEmail}
                  onChange={(e) => setCallerEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Live Call Audio Ingest: Mic Record (Continuous) or Upload */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Live Call Audio Stream:
            </label>

            {/* Mic Record Toggle */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`}></div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    {isRecording ? 'Recording Live Call...' : 'Record Call Audio'}
                  </span>
                  {isRecording && (
                    <span className="text-[11px] font-mono text-red-600 font-bold">
                      {formatTimer(recordingSeconds)}
                    </span>
                  )}
                </div>
              </div>
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startCallRecording}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition"
                >
                  <Mic className="w-3.5 h-3.5 text-blue-600" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCallRecording}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold shadow-xs hover:bg-red-700 transition"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Recording</span>
                </button>
              )}
            </div>

            {/* Or File Upload */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white text-xs">
              <div className="flex items-center space-x-2 truncate">
                <FileAudio className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-700 truncate">
                  {callAudioFile ? callAudioFile.name : 'Or upload call recording file'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                Browse
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioFileUpload}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 font-medium">
              {error}
            </p>
          )}

          {/* Trigger Button */}
          <button
            onClick={handleAnalyzeLiveCall}
            disabled={analyzing || isRecording || !callAudioFile}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 transition flex items-center justify-center space-x-2"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating Audio Biometrics...</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5" />
                <span>Analyze Live Call Audio</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Waveform & Real-time Evaluation */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Radio className="w-4 h-4 text-blue-600" />
                <span>Audio Waveform Stream</span>
              </h2>
              {callAudioFile && (
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {callAudioFile.name}
                </span>
              )}
            </div>

            <WaveformVisualizer
              isActive={analyzing || isRecording}
              isAi={activeCallResult?.isAiDetected}
              height={110}
              color={activeCallResult?.riskLevel === 'high' ? '#e11d48' : (activeCallResult?.riskLevel === 'low' ? '#059669' : null)}
            />

            {/* Evaluation Results */}
            {activeCallResult ? (
              <div className="mt-5 space-y-4 animate-fade-in">
                {/* Risk Level Badge */}
                <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
                  activeCallResult.riskLevel === 'high'
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : (activeCallResult.riskLevel === 'medium'
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950')
                }`}>
                  {activeCallResult.riskLevel === 'high' && <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />}
                  {activeCallResult.riskLevel === 'medium' && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                  {activeCallResult.riskLevel === 'low' && <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                        activeCallResult.riskLevel === 'high'
                          ? 'bg-rose-200 text-rose-900'
                          : (activeCallResult.riskLevel === 'medium'
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-emerald-200 text-emerald-900')
                      }`}>
                        {activeCallResult.riskLevel.toUpperCase()} RISK
                      </span>
                      <span className="text-xs font-semibold">
                        Biometric Match: <strong>{activeCallResult.matchScore}%</strong>
                      </span>
                    </div>
                    <p className="text-xs mt-1 font-medium leading-relaxed">
                      {activeCallResult.riskExplanation}
                    </p>
                  </div>
                </div>

                {/* Match Meter */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Voiceprint Similarity:</span>
                    <span className={`font-mono font-bold ${
                      activeCallResult.matchScore >= 82 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {activeCallResult.matchScore}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-700 ${
                        activeCallResult.matchScore >= 82
                          ? 'bg-emerald-500'
                          : (activeCallResult.matchScore >= 58 ? 'bg-amber-500' : 'bg-rose-500')
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, activeCallResult.matchScore))}%` }}
                    ></div>
                  </div>
                </div>

                {/* Secondary Verification Button if High Risk */}
                {activeCallResult.riskLevel === 'high' && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-rose-900">
                        Secondary Verification Required
                      </div>
                      <div className="text-[11px] text-rose-700">
                        Status: <strong className="uppercase">{activeCallResult.verificationStatus}</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSecondaryModal(true)}
                      className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs flex items-center space-x-1.5 transition"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Verify via Email / Phone OTP</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-8 text-center py-8 text-slate-400 text-xs">
                Record or upload call audio to compare against the enrolled genuine voiceprint.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Call History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Call History</h3>
          <button
            onClick={fetchCallHistory}
            className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Caller</th>
                <th className="px-4 py-2.5 text-left font-semibold">Contact (Phone / Email)</th>
                <th className="px-4 py-2.5 text-left font-semibold">Biometric Match</th>
                <th className="px-4 py-2.5 text-left font-semibold">Risk Level</th>
                <th className="px-4 py-2.5 text-left font-semibold">Verification</th>
                <th className="px-4 py-2.5 text-left font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {callHistory.length > 0 ? (
                callHistory.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{call.caller_name}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">{call.caller_phone || call.caller_email || '—'}</td>
                    <td className="px-4 py-2.5 font-mono font-bold">
                      <span className={call.match_score >= 82 ? 'text-emerald-600' : 'text-rose-600'}>
                        {call.match_score}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        call.risk_level === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : (call.risk_level === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                      }`}>
                        {call.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      {call.verification_status}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                      {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No calls recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secondary Verification Modal */}
      {showSecondaryModal && activeCallResult && (
        <SecondaryVerificationModal
          callData={activeCallResult}
          onClose={() => setShowSecondaryModal(false)}
          onVerificationComplete={handleVerificationDone}
        />
      )}
    </div>
  );
};

export default LiveCallAnalyzer;
