/**
 * Analyzes a portion of an audio file to determine the amplitude range
 * and the shortest/longest silent segments.
 *
 * @param file - The audio file to analyze.
 * @param silenceThreshold - Amplitude below which the sound is considered silence (default: 0.03).
 * @param maxAnalysisDurationSec - Maximum length of the audio (in seconds) to analyze (default: 120s).
 * @returns An object with min/max amplitudes and silence durations in seconds.
 */
export const analyzeAudioStats = async (
    file: File,
    silenceThreshold = 0.03,
    maxAnalysisDurationSec = 120
): Promise<{
    minAmplitude: number;
    maxAmplitude: number;
    minSilenceDuration: number | null;
    maxSilenceDuration: number | null;
}> => {
    const audioContext = new AudioContext();

    // Convert uploaded file to raw audio data (array buffer)
    const arrayBuffer = await file.arrayBuffer();

    // Decode audio data into usable buffer format
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get audio samples from the first channel (mono or left channel)
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Limit the analysis to the first N seconds (for performance)
    const maxSamples = Math.min(sampleRate * maxAnalysisDurationSec, channelData.length);

    let minAmp = 1;  // Initialize to the highest possible normalized amplitude
    let maxAmp = 0;  // Initialize to the lowest possible normalized amplitude

    let currentSilence = 0;           // Counter for silence samples
    let minPause: number | null = null;
    let maxPause: number | null = null;

    // Iterate over audio samples
    for (let i = 0; i < maxSamples; i++) {
        const amp = Math.abs(channelData[i]); // Absolute value of the waveform (0 to 1)

        // Track minimum and maximum amplitudes
        if (amp < minAmp) minAmp = amp;
        if (amp > maxAmp) maxAmp = amp;

        // Track silent durations
        if (amp < silenceThreshold) {
            // Still in silence
            currentSilence++;
        } else if (currentSilence > 0) {
            // Exited a silence block, calculate its duration
            const duration = currentSilence / sampleRate;

            // Update min and max pause durations
            if (minPause === null || duration < minPause) minPause = duration;
            if (maxPause === null || duration > maxPause) maxPause = duration;

            // Reset silence counter
            currentSilence = 0;
        }
    }

    // If audio ended with silence, count it too
    if (currentSilence > 0) {
        const duration = currentSilence / sampleRate;
        if (minPause === null || duration < minPause) minPause = duration;
        if (maxPause === null || duration > maxPause) maxPause = duration;
    }

    // Output results to console for debugging
    console.log('📊 Audio analysis complete:');
    console.log('🔊 Max amplitude:', maxAmp.toFixed(4));
    console.log('🔉 Min amplitude:', minAmp.toFixed(4));
    console.log('⏸ Max pause:', maxPause?.toFixed(2) || 'N/A', 's');
    console.log('⏸ Min pause:', minPause?.toFixed(2) || 'N/A', 's');

    return {
        minAmplitude: minAmp,
        maxAmplitude: maxAmp,
        minSilenceDuration: minPause,
        maxSilenceDuration: maxPause
    };
};
