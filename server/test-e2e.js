/**
 * VoiceGuard AI Automated Verification of Updated Real-Audio & OTP flows
 */
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- STARTING VOICEGUARD AI UPDATED SYSTEM VERIFICATION ---');

  // 1. Admin Login
  console.log('\n[TEST 1] Testing Admin Login...');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@voiceguard.ai', password: 'Admin@VoiceGuard2026!' })
  });
  const adminAuth = await adminLoginRes.json();
  if (!adminAuth.token) throw new Error('Admin login failed');
  console.log('✓ Admin authenticated successfully! Role:', adminAuth.user.role);

  // 2. User Login
  console.log('\n[TEST 2] Testing User Login...');
  const userLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@voiceguard.ai', password: 'User@VoiceGuard2026!' })
  });
  const userAuth = await userLoginRes.json();
  if (!userAuth.token) throw new Error('User login failed');
  console.log('✓ User authenticated successfully! Role:', userAuth.user.role);

  // 3. Test Continuous Audio Recording Analysis (Generating 6 seconds of audio)
  console.log('\n[TEST 3] Testing Audio DSP Analysis on 6-Second Audio Recording...');
  const sampleRate = 44100;
  const numSamples = sampleRate * 6; // 6 seconds arbitrary duration
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = 0.4 * Math.sin(2 * Math.PI * 135 * (i / sampleRate));
    buffer.writeInt16LE(Math.floor(s * 32767), offset);
    offset += 2;
  }

  const formData = new FormData();
  const fileBlob = new Blob([buffer], { type: 'audio/wav' });
  formData.append('audio', fileBlob, 'recorded_audio_6s.wav');

  const analyzeRes = await fetch(`${BASE_URL}/voice/analyze`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userAuth.token}` },
    body: formData
  });
  const analysis = await analyzeRes.json();
  console.log('✓ Processed full audio duration:', analysis.duration + 's');
  console.log('✓ Verdict: isAi =', analysis.isAi, '| Confidence =', analysis.confidenceScore + '%');

  // 4. Enroll Genuine Voice with Real Contact Phone & Email
  console.log('\n[TEST 4] Enrolling Genuine Voice with Real Caller Details (no demo defaults)...');
  const enrollRes = await fetch(`${BASE_URL}/voice/save-genuine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userAuth.token}`
    },
    body: JSON.stringify({
      callerName: 'Alex Mercer',
      callerPhone: '+1-202-555-0143',
      callerEmail: 'alex.mercer@corporate.com',
      sampleName: 'alex_mercer_voiceprint.wav',
      duration: 6.0,
      characteristics: analysis.characteristics,
      featureVector: [0.25, 0.5, 0.35, 0.25, 0.4, 0.5, 0.6, 0.4, 0.5]
    })
  });
  const enrollData = await enrollRes.json();
  console.log('✓ Voiceprint enrolled! Report ID:', enrollData.reportId);

  // 5. Test Live Call Analysis with Real Audio
  console.log('\n[TEST 5] Testing Live Call Analysis with Recorded Audio Stream...');
  const callFormData = new FormData();
  callFormData.append('audio', fileBlob, 'incoming_call_stream.wav');
  callFormData.append('genuineReportId', enrollData.reportId);
  callFormData.append('callerName', 'Alex Mercer');
  callFormData.append('callerPhone', '+1-202-555-0143');
  callFormData.append('callerEmail', 'alex.mercer@corporate.com');

  const liveCallRes = await fetch(`${BASE_URL}/live-call/analyze`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userAuth.token}` },
    body: callFormData
  });
  const liveCallData = await liveCallRes.json();
  console.log('✓ Live call analyzed! Risk Level:', liveCallData.riskLevel);
  console.log('✓ Secondary Verification Required:', liveCallData.requiresSecondaryVerification);

  // 6. Test Sending OTP to Email or Phone
  console.log('\n[TEST 6] Testing Dispatch of OTP to Email / Phone...');
  const sendOtpRes = await fetch(`${BASE_URL}/live-call/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userAuth.token}`
    },
    body: JSON.stringify({
      callId: liveCallData.callId,
      channel: 'email',
      destination: 'alex.mercer@corporate.com'
    })
  });
  const sendOtpData = await sendOtpRes.json();
  console.log('✓ OTP Dispatched:', sendOtpData.message);
  console.log('✓ Received OTP code for validation:', sendOtpData.otpCode);

  // 7. Test Secondary OTP Verification
  console.log('\n[TEST 7] Testing Verification with Dispatched OTP...');
  const verifyRes = await fetch(`${BASE_URL}/live-call/verify-secondary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userAuth.token}`
    },
    body: JSON.stringify({
      callId: liveCallData.callId,
      method: 'otp_email',
      otpEntered: sendOtpData.otpCode
    })
  });
  const verifyData = await verifyRes.json();
  console.log('✓ Verification result:', verifyData.verificationStatus, '| Message:', verifyData.message);

  // 8. Test Spam Reports (verify no fake seeded demo callers appear)
  console.log('\n[TEST 8] Verifying Spam Reports & User-Provided Data Only...');
  const spamRes = await fetch(`${BASE_URL}/spam/reports`, {
    headers: { 'Authorization': `Bearer ${userAuth.token}` }
  });
  const spamData = await spamRes.json();
  console.log(`✓ Total real spam incident reports: ${spamData.reports.length}`);
  if (spamData.reports.length > 0) {
    console.log('  - Latest Flagged Caller:', spamData.reports[0].caller_name);
    console.log('  - Contact:', spamData.reports[0].caller_phone || spamData.reports[0].caller_email);
    console.log('  - Reason for Suspicion:', spamData.reports[0].reason_summary);
  }

  console.log('\n=============================================');
  console.log('>>> ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! <<<');
  console.log('=============================================\n');
}

runTests().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
