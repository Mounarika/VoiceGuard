import React, { useState } from 'react';
import { ShieldAlert, PhoneCall, Mail, MessageSquare, CheckCircle, XCircle, RefreshCw, Send, Check } from 'lucide-react';

export const SecondaryVerificationModal = ({
  callData,
  onClose,
  onVerificationComplete
}) => {
  const [channel, setChannel] = useState('email'); // 'email' or 'phone' or 'callback'
  const [destinationInput, setDestinationInput] = useState(
    channel === 'email' ? (callData?.callerEmail || '') : (callData?.callerPhone || '')
  );
  const [otpInput, setOtpInput] = useState('');
  const [otpDispatched, setOtpDispatched] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [notificationToast, setNotificationToast] = useState(null);
  const [callbackInProgress, setCallbackInProgress] = useState(false);

  if (!callData) return null;

  // Switch channel and update destination
  const handleChannelChange = (newChannel) => {
    setChannel(newChannel);
    setResultMessage(null);
    setOtpDispatched(false);
    if (newChannel === 'email') {
      setDestinationInput(callData.callerEmail || '');
    } else if (newChannel === 'phone') {
      setDestinationInput(callData.callerPhone || '');
    }
  };

  // Send OTP to user email or phone
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!destinationInput.trim()) {
      setResultMessage({ type: 'error', text: `Please enter a valid ${channel === 'email' ? 'email address' : 'phone number'}.` });
      return;
    }

    setIsSendingOtp(true);
    setResultMessage(null);

    try {
      const token = localStorage.getItem('vg_token');
      const res = await fetch('/api/live-call/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          callId: callData.callId,
          channel: channel === 'email' ? 'email' : 'phone',
          destination: destinationInput.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOtpDispatched(true);
        setNotificationToast(`Passcode dispatched to ${destinationInput.trim()}`);
        setResultMessage({ type: 'success', text: `OTP passcode sent to ${destinationInput.trim()}. Please enter the 6-digit code below.` });
        if (data.otpCode) {
          // Provide subtle alert for quick testing
          setNotificationToast(`Passcode sent: ${data.otpCode}`);
        }
      } else {
        setResultMessage({ type: 'error', text: data.error || 'Failed to dispatch passcode.' });
      }
    } catch (err) {
      setResultMessage({ type: 'error', text: 'Service communication error.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length < 6) {
      setResultMessage({ type: 'error', text: 'Please enter the 6-digit OTP passcode.' });
      return;
    }

    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const token = localStorage.getItem('vg_token');
      const res = await fetch('/api/live-call/verify-secondary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          callId: callData.callId,
          method: channel === 'email' ? 'otp_email' : 'otp_phone',
          otpEntered: otpInput.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResultMessage({ type: 'success', text: data.message });
        if (onVerificationComplete) onVerificationComplete(data);
      } else {
        setResultMessage({ type: 'error', text: data.message || data.error || 'Invalid OTP passcode entered.' });
      }
    } catch (err) {
      setResultMessage({ type: 'error', text: 'Verification service error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Callback
  const handleCallbackTrigger = async (confirm = true) => {
    setCallbackInProgress(true);
    setResultMessage(null);

    setTimeout(async () => {
      try {
        const token = localStorage.getItem('vg_token');
        const res = await fetch('/api/live-call/verify-secondary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            callId: callData.callId,
            method: 'callback',
            confirmCallback: confirm
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setResultMessage({ type: 'success', text: data.message });
          if (onVerificationComplete) onVerificationComplete(data);
        } else {
          setResultMessage({ type: 'error', text: data.message || 'Callback unconfirmed.' });
        }
      } catch (err) {
        setResultMessage({ type: 'error', text: 'Callback dispatch failed.' });
      } finally {
        setCallbackInProgress(false);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-rose-200 max-w-lg w-full overflow-hidden">
        {/* Header Alert */}
        <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                High Risk Detected
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1">Secondary Verification Required</h3>
          </div>
        </div>

        {/* Target Caller Info */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs grid grid-cols-2 gap-3">
          <div>
            <span className="text-slate-500 block">Caller Name:</span>
            <span className="font-semibold text-slate-800">{callData.callerName || 'Unknown Caller'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Biometric Match:</span>
            <span className="font-bold text-rose-600">{callData.matchScore}%</span>
          </div>
          {callData.callerPhone ? (
            <div>
              <span className="text-slate-500 block">Phone:</span>
              <span className="font-mono text-slate-700">{callData.callerPhone}</span>
            </div>
          ) : null}
          {callData.callerEmail ? (
            <div>
              <span className="text-slate-500 block">Email:</span>
              <span className="font-mono text-slate-700">{callData.callerEmail}</span>
            </div>
          ) : null}
        </div>

        {/* Verification Channel Switcher */}
        <div className="p-5 space-y-4">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleChannelChange('email')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition ${
                channel === 'email' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email OTP</span>
            </button>
            <button
              type="button"
              onClick={() => handleChannelChange('phone')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition ${
                channel === 'phone' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS Phone OTP</span>
            </button>
            <button
              type="button"
              onClick={() => handleChannelChange('callback')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition ${
                channel === 'callback' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Callback</span>
            </button>
          </div>

          {/* Toast Notification */}
          {notificationToast && (
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
              <span>{notificationToast}</span>
              <button onClick={() => setNotificationToast(null)} className="text-blue-600 hover:text-blue-800 text-[11px] font-bold ml-2">✕</button>
            </div>
          )}

          {/* Result Alert */}
          {resultMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
              resultMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {resultMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{resultMessage.text}</span>
            </div>
          )}

          {/* Email or Phone OTP Form */}
          {(channel === 'email' || channel === 'phone') && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient {channel === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <div className="flex space-x-2">
                  <input
                    type={channel === 'email' ? 'email' : 'text'}
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    placeholder={channel === 'email' ? 'name@example.com' : 'Enter phone number'}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || !destinationInput.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition flex items-center space-x-1"
                  >
                    {isSendingOtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{otpDispatched ? 'Resend' : 'Send OTP'}</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter 6-Digit Passcode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center tracking-widest text-lg font-mono py-2 px-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || otpInput.length < 6}
                    className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-xs"
                  >
                    {isSubmitting ? 'Validating...' : 'Verify Passcode'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Callback Flow */}
          {channel === 'callback' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs">
                <div className="text-slate-600 mb-2">
                  Initiate direct callback to caller's verified line.
                </div>
                <div className="flex justify-center space-x-3">
                  <button
                    type="button"
                    onClick={() => handleCallbackTrigger(true)}
                    disabled={callbackInProgress}
                    className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                  >
                    {callbackInProgress ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Confirm Callback</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCallbackTrigger(false)}
                    disabled={callbackInProgress}
                    className="py-1.5 px-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition"
                  >
                    Report No Answer
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecondaryVerificationModal;
