import { useState } from 'react';
import { detectSilenceAndBuildPhrases } from '../utils/detectSilenceAndBuildPhrases';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { createCombinedAudio } from '../utils/createCombinedAudio';
import { analyzeAudioStats } from '../utils/analyzeAudioStats';
import ValueSlider from './ui/ValueSlider';

export interface Phrase {
    start: number;
    end: number;
    duration: number;
}

export const AudioPhrasePlayer: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [phrases, setPhrases] = useState<Phrase[]>([]);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // User-controlled settings stored in localStorage
    const [userPhraseDuration, setUserPhraseDuration] = useLocalStorage<number>(
        'userPhraseDuration',
        5
    );
    const [userPauseDuration, setUserPauseDuration] = useLocalStorage<number>(
        'userPauseDuration',
        100
    );

    const [prevPhraseDuration, setPrevPhraseDuration] = useState<number | null>(null);
    const [prevPauseDuration, setPrevPauseDuration] = useState<number | null>(null);
    const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);

    /**
     * Triggered when user uploads a file.
     * 1. Analyze audio statistics from first 3 mins
     * 2. Detect silence & build phrase segments
     * 3. Generate output file
     */

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !(file instanceof File)) return;

        setIsLoading(true);
        setUploadedFile(file);

        try {
            // Step 1: Analyze audio stats (max/min amplitude and pause durations)
            const stats = await analyzeAudioStats(file);

            // ✅ Use results to fine-tune parameters
            const silenceThreshold = stats.maxAmplitude * 0.1; // 10% of peak volume
            const minSilenceDuration = Math.max(stats.minSilenceDuration || 0.4, 0.4); // не меньше 0.4 сек
            const phraseMinDuration = userPhraseDuration;

            console.log('📐 Params used for phrase detection:');
            console.log('Threshold:', silenceThreshold.toFixed(4));
            console.log('Min silence:', minSilenceDuration.toFixed(2), 's');

            // Step 2: Detect phrases using dynamic parameters
            const { phrases, audioBuffer } = await detectSilenceAndBuildPhrases(
                file,
                silenceThreshold,
                minSilenceDuration,
                phraseMinDuration
            );

            setPrevPhraseDuration(userPhraseDuration);
            setPrevPauseDuration(userPauseDuration);
            setPhrases(phrases);
            await regenerateCombinedAudioFile(phrases, audioBuffer);

        } catch (error) {
            console.error('Error analyzing audio:', error);
        } finally {
            setIsLoading(false);
        }
    };


    /**
     * Manually triggered to re-run phrase segmentation
     * with the current settings
     */
    const recalculatePhrases = async () => {
        if (!uploadedFile) return;

        setIsLoading(true);
        try {
            const { phrases, audioBuffer } = await detectSilenceAndBuildPhrases(
                uploadedFile,
                0.01,
                0.3,
                userPhraseDuration
            );

            setPrevPhraseDuration(userPhraseDuration);
            setPrevPauseDuration(userPauseDuration);
            setPhrases(phrases);

            await regenerateCombinedAudioFile(phrases, audioBuffer);
        } catch (error) {
            console.error('Error recalculating:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Combines phrases and pauses into a single audio file
     */
    const regenerateCombinedAudioFile = async (
        phrasesToCombine: Phrase[],
        audioBuffer: AudioBuffer
    ) => {
        if (!phrasesToCombine.length || !audioBuffer) return;

        try {
            const wavBlob = await createCombinedAudio(audioBuffer, phrasesToCombine, userPauseDuration);
            setFinalAudioUrl(URL.createObjectURL(wavBlob));
        } catch (error) {
            console.error('Error generating audio:', error);
        }
    };

    /**
     * Plays a specific phrase from original file
     */
    const playPhrase = async (start: number, end: number) => {
        if (!uploadedFile) return;

        const arrayBuffer = await uploadedFile.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0, start, end - start);
    };

    const onChangePhraseSlider = (val: number) => {
        setPrevPhraseDuration(userPhraseDuration);
        setUserPhraseDuration(val);
    };

    const onChangePauseSlider = (val: number) => {
        setPrevPauseDuration(userPauseDuration);
        setUserPauseDuration(val);
    };

    const isRecalculateDisabled =
        isLoading ||
        !uploadedFile ||
        (prevPhraseDuration === userPhraseDuration &&
            prevPauseDuration === userPauseDuration);

    const buttonClasses =
        'min-w-[130px] text-center bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded shadow transition-colors disabled:opacity-50';

    return (
        <div className="max-w-md w-full mx-auto p-4 sm:p-6 space-y-6 bg-white rounded-lg text-sm sm:text-base">
            <h1 className="text-2xl font-bold mb-4 text-center">Phrase Audio Player</h1>

            <ValueSlider
                label="Phrase duration"
                unit="sec"
                value={userPhraseDuration}
                onChange={onChangePhraseSlider}
                min={1}
                max={30}
                step={1}
                disabled={isLoading}
            />

            <ValueSlider
                label="Pause after phrase"
                unit="%"
                value={userPauseDuration}
                onChange={onChangePauseSlider}
                max={200}
                step={10}
                disabled={isLoading}
            />

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <label className={`${buttonClasses} cursor-pointer`}>
                    Choose File
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileChange}
                        disabled={isLoading}
                        className="hidden"
                    />
                </label>

                <button
                    onClick={recalculatePhrases}
                    disabled={isRecalculateDisabled}
                    className={buttonClasses}
                >
                    Recalculate
                </button>
            </div>

            {isLoading && <p className="text-center text-gray-500 text-sm">Analyzing audio file...</p>}

            {finalAudioUrl && (
                <div className="flex flex-col items-center space-y-2">
                    <audio controls src={finalAudioUrl} loop={isLooping} className="w-full" />
                    <button
                        onClick={() => setIsLooping((loop) => !loop)}
                        className="min-w-[150px] px-4 py-2 text-white rounded shadow transition bg-gray-500"
                    >
                        {isLooping ? '⏹ Stop looping' : '🔁 Loop'}
                    </button>
                </div>
            )}

            {phrases.length > 0 && uploadedFile && (
                <div className="mt-6">
                    <h3 className="text-base font-semibold text-gray-700 mb-2">Listen to phrases:</h3>
                    <div className="flex flex-col gap-2">
                        {phrases.map((phrase, idx) => (
                            <button
                                key={idx}
                                onClick={() => playPhrase(phrase.start, phrase.end)}
                                className="w-full text-left bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow text-sm"
                            >
                                ▶️ Phrase {idx + 1} ({phrase.duration.toFixed(1)}s)
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioPhrasePlayer;
