import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import WaveformVisualizer from '../components/WaveformVisualizer';
import { 
  Upload, Mic, Square, Play, Pause, AlertOctagon, CheckCircle2, 
  Activity, BarChart3, Waves, Volume2, Clock, Sparkles, 
  BookmarkCheck, FileAudio, RefreshCw 
} from 'lucide-react';

export const VoiceDetector = ({ onVoiceEnrolled }) => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  // Enroll modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [callerNameInput, setCallerNameInput] = useState('');
  const [callerPhoneInput, setCallerPhoneInput] = useState('');
  const [callerEmailInput, setCallerEmailInput] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Recording duration timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
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

  // Handle File selection
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setAudioUrl(URL.createObjectURL(selected));
      setAnalysisResult(null);
      setError(null);
      setEnrollSuccess(false);
    }
  };

  // Start Mic Recording (runs indefinitely until user clicks Stop)
  const startRecording = async () => {
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
        const recordedFile = new File([audioBlob], `recorded_voice_${Date.now()}${ext}`, { type: mimeType });
        setFile(recordedFile);
        setAudioUrl(URL.createObjectURL(audioBlob));
      };

      // Request data in chunks every 500ms to preserve long recordings smoothly
      mediaRecorderRef.current.start(500);
      setIsRecording(true);
      setError(null);
      setAnalysisResult(null);
    } catch (err) {
      setError('Microphone access denied. Please grant microphone permissions in your browser.');
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Audio Playback toggle
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Submit audio to backend for forensic classification
  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload an audio file or record voice first.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const token = localStorage.getItem('vg_token');
      const res = await fetch('/api/voice/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze audio.');
      }

      setAnalysisResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // Enroll genuine voice into private vault
  const handleEnrollGenuine = async (e) => {
    e.preventDefault();
    if (!analysisResult || !callerNameInput.trim()) return;

    setIsEnrolling(true);
    try {
      const token = localStorage.getItem('vg_token');
      const res = await fetch('/api/voice/save-genuine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          callerName: callerNameInput.trim(),
          callerPhone: callerPhoneInput.trim(),
          callerEmail: callerEmailInput.trim(),
          sampleName: file?.name || 'genuine_voiceprint.wav',
          duration: analysisResult.duration,
          characteristics: analysisResult.characteristics,
          featureVector: analysisResult.featureVector
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enrollment failed');

      setEnrollSuccess(true);
      setShowEnrollModal(false);
      if (onVoiceEnrolled) onVoiceEnrolled(data);
    } catch (err) {
      alert('Enrollment error: ' + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Clean Top Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Voice Detector & Classifier
        </h1>
      </div>

      {/* Upload and Recorder Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Input Voice Sample</span>
            </h2>

            {/* Drag & Drop Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/60 hover:bg-blue-50/30 transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <FileAudio className="w-9 h-9 text-slate-400 group-hover:text-blue-600 mx-auto mb-2 transition" />
              <div className="text-xs font-semibold text-slate-700 group-hover:text-blue-700">
                {file ? file.name : 'Upload voice recording'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">WAV, MP3, WebM, M4A</p>
            </div>

            {/* Continuous Mic Record */}
            <div className="mt-4 p-3 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`}></div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">
                    {isRecording ? 'Recording Voice...' : 'Microphone Recording'}
                  </span>
                  {isRecording && (
                    <span className="text-[11px] font-mono text-red-600 font-bold">
                      Duration: {formatTimer(recordingSeconds)}
                    </span>
                  )}
                </div>
              </div>
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition"
                >
                  <Mic className="w-3.5 h-3.5 text-blue-600" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold shadow-sm hover:bg-red-700 transition"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Recording</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            {error && (
              <p className="text-xs text-rose-600 mb-3 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                {error}
              </p>
            )}
            <button
              onClick={handleAnalyze}
              disabled={!file || analyzing || isRecording}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition flex items-center justify-center space-x-2"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing Acoustic Characteristics...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Classify & Detect AI Voice</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Audio Spectrum & Playback */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Audio Spectrum</span>
              </h2>
              {file && (
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {file.name}
                </span>
              )}
            </div>

            <WaveformVisualizer
              isActive={isPlaying || analyzing || isRecording}
              isAi={analysisResult?.isAi}
              height={100}
            />

            {audioUrl && (
              <div className="mt-4 flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  className="hidden"
                />
                <button
                  onClick={togglePlayAudio}
                  className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-slate-800">
                    {file?.name || 'Voice Recording'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isPlaying ? 'Playing back audio' : 'Ready for analysis'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Results View */}
      {analysisResult && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Verdict Banner */}
          <div className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            analysisResult.isAi
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}>
            <div className="flex items-start space-x-3.5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                analysisResult.isAi ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {analysisResult.isAi ? (
                  <AlertOctagon className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    analysisResult.isAi ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                  }`}>
                    {analysisResult.isAi ? 'AI Voice Detected' : 'Genuine Voice Verified'}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    Confidence: <strong>{analysisResult.confidenceScore}%</strong>
                  </span>
                </div>
                <h2 className="text-xl font-bold mt-1">
                  {analysisResult.isAi ? 'AI-Cloned Voice' : 'Genuine Human Voice'}
                </h2>
              </div>
            </div>

            {!analysisResult.isAi ? (
              <div className="flex-shrink-0">
                {!enrollSuccess ? (
                  <button
                    onClick={() => setShowEnrollModal(true)}
                    className="flex items-center space-x-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Store in Genuine Voice Reports</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-200/80 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Stored in Reports</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Reasons Box if AI Voice */}
          {analysisResult.isAi && analysisResult.aiReasons?.length > 0 && (
            <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs">
              <div className="flex items-center space-x-2 text-rose-700 font-bold text-sm mb-3">
                <AlertOctagon className="w-4 h-4" />
                <span>Reasons for AI Voice Classification</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysisResult.aiReasons.map((reason, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/70 text-xs">
                    <div className="font-bold text-rose-900 mb-1">
                      {reason.dimension}
                    </div>
                    <div className="text-slate-800 font-medium mb-1">
                      {reason.evidence}
                    </div>
                    <div className="text-slate-600 leading-relaxed text-[11px]">
                      {reason.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5 Acoustic Characteristics Breakdown Cards */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Acoustic Characteristics</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Amplitude */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase text-slate-500">Amplitude</span>
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-xl font-bold text-slate-900">
                  {analysisResult.characteristics.amplitude.dynamicRangeDb} <span className="text-xs font-normal text-slate-500">dB</span>
                </div>
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>RMS Energy:</span>
                    <span className="font-mono font-semibold text-slate-800">{analysisResult.characteristics.amplitude.rmsEnergy}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Peak Amplitude:</span>
                    <span className="font-mono font-semibold text-slate-800">{analysisResult.characteristics.amplitude.peakAmplitude}</span>
                  </div>
                </div>
              </div>

              {/* Pitch */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase text-slate-500">Pitch (F0)</span>
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="text-xl font-bold text-slate-900">
                  {analysisResult.characteristics.pitch.f0MeanHz} <span className="text-xs font-normal text-slate-500">Hz</span>
                </div>
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Jitter:</span>
                    <span className={`font-mono font-semibold ${analysisResult.characteristics.pitch.jitterPercent < 0.45 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {analysisResult.characteristics.pitch.jitterPercent}%
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Stability:</span>
                    <span className="font-mono font-semibold text-slate-800">{analysisResult.characteristics.pitch.pitchStabilityScore}/100</span>
                  </div>
                </div>
              </div>

              {/* Frequency */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase text-slate-500">Frequency</span>
                  <Waves className="w-3.5 h-3.5 text-cyan-600" />
                </div>
                <div className="text-xl font-bold text-slate-900">
                  {analysisResult.characteristics.frequency.spectralCentroidHz} <span className="text-xs font-normal text-slate-500">Hz</span>
                </div>
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Rolloff (85%):</span>
                    <span className="font-mono font-semibold text-slate-800">{analysisResult.characteristics.frequency.spectralRolloff85Hz} Hz</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Flatness:</span>
                    <span className="font-mono font-semibold text-slate-800">{analysisResult.characteristics.frequency.spectralFlatness}</span>
                  </div>
                </div>
              </div>

              {/* Tone */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase text-slate-500">Tone (Timbre)</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-xl font-bold text-slate-900">
                  {analysisResult.characteristics.tone.hnrDb} <span className="text-xs font-normal text-slate-500">dB</span>
                </div>
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Shimmer:</span>
                    <span className={`font-mono font-semibold ${analysisResult.characteristics.tone.shimmerPercent < 1.15 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {analysisResult.characteristics.tone.shimmerPercent}%
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Warmth:</span>
                    <span className="font-mono font-semibold text-slate-800">{analysisResult.characteristics.tone.timbreWarmthScore}%</span>
                  </div>
                </div>
              </div>

              {/* Pace */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase text-slate-500">Pace</span>
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-xl font-bold text-slate-900">
                  {analysisResult.characteristics.pace.syllablesPerSec} <span className="text-xs font-normal text-slate-500">syl/s</span>
                </div>
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Tempo:</span>
                    <span className="font-mono font-semibold text-slate-800">{analysisResult.characteristics.pace.tempoBpm} BPM</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Pause Regularity:</span>
                    <span className="font-mono font-semibold text-slate-800">{analysisResult.characteristics.pace.pauseRegularityRatio}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store in Genuine Voice Reports Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">Store in Genuine Voice Reports</h3>
            <p className="text-xs text-slate-500 mb-4">Enter the caller contact information to store this reference voiceprint.</p>

            <form onSubmit={handleEnrollGenuine} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Caller / Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={callerNameInput}
                  onChange={(e) => setCallerNameInput(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={callerPhoneInput}
                  onChange={(e) => setCallerPhoneInput(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={callerEmailInput}
                  onChange={(e) => setCallerEmailInput(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEnrolling || !callerNameInput.trim()}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {isEnrolling ? 'Saving...' : 'Save to Reports'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceDetector;
