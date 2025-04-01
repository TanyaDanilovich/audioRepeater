import { Phrase } from '../components/AudioPhrasePlayer.tsx';

/**
 * Detects silences in an audio file and splits it into phrases.
 * Returns an array of phrase segments and the decoded AudioBuffer.
 */
export const detectSilenceAndBuildPhrases = async (
    file: File,
    silenceThreshold:number,      // Amplitude threshold below which a sample is considered "silence"
    minSilenceDuration:number,     // Minimum duration (in seconds) for silence to be valid
    minPhraseDuration: number     // Minimum duration (in seconds) for a valid phrase
) => {
    const audioContext = new AudioContext();

    // Decode the file into an AudioBuffer
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get PCM data from the first channel (mono analysis)
    const channelData = audioBuffer.getChannelData(0);

    const sampleRate = audioBuffer.sampleRate;
    const silenceSamples = minSilenceDuration * sampleRate;

    const phrases: Phrase[] = [];

    // State tracking
    let isSilent = false;
    let silenceStart = 0;
    let lastPhraseStart = 0;

    // === Debug logs ===
    console.log('🔍 Starting audio analysis...');
    console.log('🎚 Silence threshold:', silenceThreshold);
    console.log('⏱ Min silence duration (sec):', minSilenceDuration);
    console.log('⏱ Min phrase duration (sec):', minPhraseDuration);
    console.log('🎧 Sample rate:', sampleRate);

    // Iterate over the audio samples
    for (let i = 0; i < channelData.length; i++) {
        const amplitude = Math.abs(channelData[i]);


        // Entering silence
        if (!isSilent && amplitude < silenceThreshold) {
            isSilent = true;
            silenceStart = i;
        }

        // Exiting silence
        if (isSilent && amplitude >= silenceThreshold) {
            const silenceEnd = i;
            const silenceDurationSamples = silenceEnd - silenceStart;

            // If the silence is long enough, mark the end of a phrase
            if (silenceDurationSamples >= silenceSamples) {
                const phraseEnd = silenceStart / sampleRate;
                const phraseDuration = phraseEnd - lastPhraseStart;

                // Only keep phrases longer than the minimum duration
                if (phraseDuration >= minPhraseDuration) {
                    phrases.push({
                        start: lastPhraseStart,
                        end: phraseEnd,
                        duration: phraseDuration
                    });

                    console.log(`🗣 Phrase added: ${lastPhraseStart.toFixed(2)}s → ${phraseDuration}s`);

                    // Update the starting point for the next phrase
                    lastPhraseStart = silenceEnd / sampleRate;
                }
            }

            isSilent = false;
        }
    }

    // Handle final phrase if it wasn't captured in the loop
    const audioDuration = audioBuffer.duration;
    const remaining = audioDuration - lastPhraseStart;

    if (remaining >= minPhraseDuration) {
        phrases.push({
            start: lastPhraseStart,
            end: audioDuration,
            duration: remaining
        });

        console.log(`🗣 Final phrase: ${lastPhraseStart.toFixed(2)}s → ${audioDuration.toFixed(2)}s`);
    }

    // Summary
    console.log('📊 Total phrases found:', phrases.length);
    console.log('⏱ Audio duration:', audioDuration.toFixed(2), 'seconds');

    if (phrases.length === 0) {
        console.warn('⚠️ No phrases detected.');
        console.warn('Try increasing silenceThreshold or lowering minPhraseDuration.');
    }

    return { phrases, audioBuffer };
};
