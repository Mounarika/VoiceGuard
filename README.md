# VoiceGuard AI - Forensic Voice Biometrics & AI-Cloned Voice Defense

An enterprise-grade full-stack platform engineered to detect synthetic AI-cloned voices versus genuine human speech using digital signal processing (DSP), maintain user-scoped private genuine voice vaults, monitor live calls in real-time with biometric comparison, execute secondary verification on high-risk threats, and track caller spam reputation intelligence with a comprehensive spam reports audit log—wrapped in a clean, modern light theme.

---

## 🔑 Pre-Configured System Credentials

As requested, both Admin and User credentials are provided up-front and prominently displayed on the Login page with **1-Click Auto-Fill** buttons:

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **System Administrator** | `admin@voiceguard.ai` | `Admin@VoiceGuard2026!` | Global Telemetry, System-wide Spam Reports, All Callers, Admin Console |
| **Security Analyst / User** | `user@voiceguard.ai` | `User@VoiceGuard2026!` | Private Enclave, Personal Genuine Vault, Scoped Live Calls & Spam Reports |

---

## 🚀 Live Application URLs

- **Frontend Client (Light Background Theme)**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API & DSP Engine**: [http://localhost:5000](http://localhost:5000)
- **Health Check Endpoint**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🎙️ Key Features & Technical Capabilities

### 1. AI-Cloned vs Genuine Voice Detection with Scientific Proof
- **Audio Upload & Live Recording**: Drag & drop audio files (WAV, MP3, WebM) or record directly from your microphone.
- **5 Acoustic Signal Dimensions Analyzed**:
  - **Amplitude**: Dynamic Range (dB), RMS Energy, Peak-to-Average Power Ratio (PAPR), silence ratio.
  - **Pitch (F0)**: Fundamental frequency mean/range, cycle-to-cycle micro-jitter (%), pitch stability index.
  - **Frequency Spectrum**: Spectral centroid, 85% spectral rolloff (detecting neural vocoder Nyquist cutoff bands), spectral flatness, formants (F1, F2).
  - **Tone & Timbre**: Harmonic-to-Noise Ratio (HNR in dB), cycle-to-cycle shimmer amplitude perturbation (%), warmth index.
  - **Pace & Cadence**: Syllables per second tempo, inter-syllable interval regularity (quantized vs human hesitations).
- **Forensic Proof of AI Synthesis**:
  When an AI voice is detected, the system displays quantifiable forensic proofs:
  - *Micro-jitter Deficit*: Demonstrates pitch jitter below human biological baseline (0.50% - 2.50%).
  - *Vocoder Spectral Cutoff*: Exposes brickwall high-frequency filtering typical of 16kHz / 22.05kHz text-to-speech models.
  - *Shimmer Deficiency*: Static glottal pulse amplitudes missing natural vocal fold micro-perturbations.
  - *Quantized Cadence*: Metronomic token scheduling lacking cognitive micro-inhalations and breathing pauses.
- **Genuine Voice Vault Enrollment**:
  When a genuine voice is verified, users can store the voiceprint in their **Private Genuine Voice Vault** for future live biometric reference.

### 2. Live Call Real-Time Voice Biometrics & Risk Classification
- **Live Stream Ingest**: Real-time canvas waveform and audio spectrum visualizer.
- **Biometric Comparison**: Computes 9-dimensional acoustic cosine similarity between the incoming call voice and the registered caller's genuine voiceprint.
- **Risk Classification**:
  - **Low Risk** (> 82% match, zero synthetic markers) — Verified Genuine Caller.
  - **Medium Risk** (58% - 82% match) — Inconclusive biometric variance / acoustic drift.
  - **High Risk** (< 58% match OR AI synthesis signatures detected) — Voice spoofing threat.
- **Secondary Verification Trigger**:
  If High Risk appears, an interactive challenge modal activates:
  - **Direct Security Callback**: Simulates automated outbound callback to confirmed line.
  - **SMS One-Time Passcode (OTP)**: Dispatches a 6-digit code for instant caller verification.

### 3. Caller Spam Reputation Intelligence & Spam Reports Section
- **Dynamic Spam Reputation Scores**: 0 (Trusted) to 100 (Blacklisted Spammer).
- Automatically escalates penalties when a caller triggers high-risk alerts or fails secondary verification.
- **Manual Score Adjuster**: Users and administrators can update reputation scores with a slider and rationale note.
- **Spam Incident Reports Audit Log**:
  Displays full caller information (Name, Phone, Timestamp, Risk Level, Spam Score) and the **explicit reason why it was flagged suspicious**.

### 4. Enterprise User Privacy & Multi-Tenant Security
- Strict multi-tenant isolation enforced via JWT bearer tokens and SQLite foreign keys.
- Genuine voiceprints, call recordings, and personal telemetry are **100% private to the logged-in user**.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, Vite, Tailwind CSS (Light Theme), Lucide Icons, Canvas Waveform Visualizers.
- **Backend**: Node.js, Express 5, Multer, JWT, Bcrypt.js.
- **Database**: SQLite (`better-sqlite3`) with WAL mode, relational schema with cascading constraints.
- **Signal Processing (DSP)**: Autocorrelation F0 tracker, discrete spectral centroid / rolloff calculation, cycle perturbation jitter/shimmer calculators, 9D Cosine biometric vector matcher.

---

## 🧪 Running Verification Tests

Run the automated end-to-end verification script anytime:
```bash
cd server
node test-e2e.js
```
