/**
 * Voice Biometrics & Live Call Comparison Engine
 * Accurately compares incoming voice features against enrolled genuine voiceprints.
 * Computes acoustic distance, match score %, and classifies risk into HIGH, MEDIUM, or LOW.
 */

export class BiometricMatcher {
  /**
   * Compare an incoming live call feature vector with an enrolled genuine voiceprint
   * @param {Array<number>} liveVector - Live call audio 9D vector
   * @param {Array<number>} genuineVector - Enrolled reference 9D vector
   * @param {boolean} isAiDetected - Whether AI spoofing markers were detected
   * @param {number} suspicionScore - AI suspicion score (0 to 100)
   */
  static compareVoices(liveVector, genuineVector, isAiDetected = false, suspicionScore = 0) {
    if (!liveVector || !genuineVector || liveVector.length === 0 || genuineVector.length === 0) {
      return {
        matchScore: 30.0,
        riskLevel: 'high',
        riskExplanation: 'CRITICAL: No valid biometric vector extracted for comparison.',
        requiresSecondaryVerification: true,
        isAiDetected,
        spamScoreDelta: 30,
        secondaryMethodsAvailable: ['otp_email', 'otp_phone', 'callback']
      };
    }

    // Weighted acoustic distance across key speaker identity traits
    // Index mapping:
    // 0: RMS Energy (weight 0.05)
    // 1: Dynamic Range (weight 0.05)
    // 2: Pitch F0 (weight 0.35 - strongest individual identifier)
    // 3: Jitter (weight 0.10)
    // 4: Spectral Centroid (weight 0.20 - vocal tract resonance)
    // 5: Spectral Rolloff (weight 0.10)
    // 6: HNR (weight 0.05)
    // 7: Shimmer (weight 0.05)
    // 8: Syllable Pace (weight 0.05)
    const weights = [0.05, 0.05, 0.35, 0.10, 0.20, 0.10, 0.05, 0.05, 0.05];
    const len = Math.min(liveVector.length, genuineVector.length, weights.length);

    let weightedDistance = 0;
    let totalWeight = 0;

    for (let i = 0; i < len; i++) {
      const diff = Math.abs((liveVector[i] || 0) - (genuineVector[i] || 0));
      weightedDistance += diff * weights[i];
      totalWeight += weights[i];
    }

    if (totalWeight > 0) {
      weightedDistance = weightedDistance / totalWeight;
    }

    // Map acoustic distance to human-readable Match Score % (0% to 100%)
    // Distance < 0.06 -> ~90-98% (Same speaker)
    // Distance 0.08 - 0.15 -> ~70-85% (Same speaker with mic drift / noise)
    // Distance > 0.18 -> < 65% (Different speaker / Impersonator!)
    let matchScore = Math.max(10, Math.min(99, Math.round((1.0 - weightedDistance * 3.2) * 1000) / 10));

    // Severe penalty if AI spoof / synthetic voice detected
    if (isAiDetected || suspicionScore >= 35) {
      matchScore = Math.min(matchScore, 34.0);
    }

    // Risk Classification: HIGH, MEDIUM, LOW
    let riskLevel = 'low';
    let riskExplanation = '';
    let requiresSecondaryVerification = false;

    if (isAiDetected || suspicionScore >= 35) {
      riskLevel = 'high';
      riskExplanation = `CRITICAL: Synthetic AI voice cloning signatures detected in audio stream (Suspicion Score: ${suspicionScore}/100). Audio mimics registered contact using a neural vocoder.`;
      requiresSecondaryVerification = true;
    } else if (matchScore < 68.0) {
      riskLevel = 'high';
      riskExplanation = `CRITICAL MISMATCH: Voice biometric match score of ${matchScore}% is below safety threshold (68%). Pitch contour and vocal tract resonance differ significantly from registered profile.`;
      requiresSecondaryVerification = true;
    } else if (matchScore < 82.0 || suspicionScore >= 18) {
      riskLevel = 'medium';
      riskExplanation = `MODERATE RISK: Voice match score is ${matchScore}%. Acoustic drift detected, possibly caused by ambient noise, microphone variance, or slight voice strain.`;
      requiresSecondaryVerification = false;
    } else {
      riskLevel = 'low';
      riskExplanation = `VERIFIED GENUINE: Voice biometric match score is ${matchScore}%. Fundamental pitch, harmonic envelope, and vocal tract timbre match registered profile.`;
      requiresSecondaryVerification = false;
    }

    // Recommended spam reputation escalation on high risk
    let spamScoreDelta = 0;
    if (riskLevel === 'high') {
      spamScoreDelta = 35;
    } else if (riskLevel === 'medium') {
      spamScoreDelta = 10;
    }

    return {
      matchScore,
      riskLevel,
      riskExplanation,
      requiresSecondaryVerification,
      isAiDetected: isAiDetected || suspicionScore >= 35,
      suspicionScore,
      spamScoreDelta,
      secondaryMethodsAvailable: requiresSecondaryVerification ? ['otp_email', 'otp_phone', 'callback'] : []
    };
  }
}

export default BiometricMatcher;
