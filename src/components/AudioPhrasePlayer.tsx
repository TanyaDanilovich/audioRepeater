import {useState} from 'react';
import {detectSilenceAndBuildPhrases} from '../utils/detectSilenceAndBuildPhrases';
import {useLocalStorage} from '../hooks/useLocalStorage';
import {createCombinedAudio} from '../utils/createCombinedAudio';
import {analyzeAudioStats} from '../utils/analyzeAudioStats';
import ValueSlider from './ui/ValueSlider';

export interface Phrase {
    start: number;
    end: number;
    duration: number;
}

export const AudioPhrasePlayer: React.FC = () => {
    // Loading state for UI feedback
    const [isLoading, setIsLoading] = useState(false);
    const [isLooping, setIsLooping] = useState(false);

    // Phrase data and audio output
    const [phrases, setPhrases] = useState<Phrase[]>([]);
    const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // User-controlled values stored persistently
    const [userPhraseDuration, setUserPhraseDuration] = useLocalStorage('userPhraseDuration', 5);
    const [userPauseDuration, setUserPauseDuration] = useLocalStorage('userPauseDuration', 100);

    // Previously applied values to disable recalculation if unchanged
    const [prevPhraseDuration, setPrevPhraseDuration] = useState<number | null>(null);
    const [prevPauseDuration, setPrevPauseDuration] = useState<number | null>(null);

    // Dynamically calculated audio parameters
    const [silenceThreshold, setSilenceThreshold] = useState<number | null>(null);
    const [minSilenceDuration, setMinSilenceDuration] = useState<number | null>(null);

    /**
     * Unified audio processing entry point
     * Can be used for both initial analysis and recalculation
     */
    const processAudio = async (file: File, useStats = true) => {
        setIsLoading(true);
        try {
            let threshold = 0.01;
            let silenceDuration = 0.3;

            // Analyze file to adjust silence threshold dynamically
            if (useStats) {
                const stats = await analyzeAudioStats(file);
                threshold = stats.maxAmplitude * 0.1;
                silenceDuration = Math.max(stats.minSilenceDuration || 0.4, 0.4);
                setSilenceThreshold(threshold);
                setMinSilenceDuration(silenceDuration);
            }

            const {phrases, audioBuffer} = await detectSilenceAndBuildPhrases(
                file,
                threshold,
                silenceDuration,
                userPhraseDuration
            );

            setPhrases(phrases);
            setPrevPhraseDuration(userPhraseDuration);
            setPrevPauseDuration(userPauseDuration);

            const wavBlob = await createCombinedAudio(audioBuffer, phrases, userPauseDuration);
            setFinalAudioUrl(URL.createObjectURL(wavBlob));
        } catch (err) {
            console.error('🔴 Audio processing error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    /** Triggered when user selects a file */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadedFile(file);
        processAudio(file, true); // With stats
    };

    /** Recalculates phrases using already known analysis results */
    const recalculatePhrases = () => {
        if (!uploadedFile || silenceThreshold === null || minSilenceDuration === null) return;
        processAudio(uploadedFile, false); // Skip stats
    };

    /** Plays a single phrase from original file */
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

    // Sliders
    const onChangePhraseSlider = (value: number) => {
        setPrevPhraseDuration(userPhraseDuration);
        setUserPhraseDuration(value);
    };

    const onChangePauseSlider = (value: number) => {
        setPrevPauseDuration(userPauseDuration);
        setUserPauseDuration(value);
    };

    // Disable recalculation unless values have changed
    const isRecalculateDisabled =
        isLoading ||
        !uploadedFile ||
        (prevPhraseDuration === userPhraseDuration &&
            prevPauseDuration === userPauseDuration);

    const buttonClasses =
        'min-w-[130px] text-center bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded shadow transition-colors disabled:opacity-50';

    return (
        <div className = "max-w-md w-full mx-auto p-4 sm:p-6 space-y-6 bg-white rounded-lg text-sm sm:text-base">
            <h1 className = "text-2xl font-bold mb-4 text-center">Phrase Audio Player</h1>

            <ValueSlider
                label = "Phrase duration"
                unit = "sec"
                value = {userPhraseDuration}
                onChange = {onChangePhraseSlider}
                min = {1}
                max = {30}
                step = {1}
                disabled = {isLoading}
            />

            <ValueSlider
                label = "Pause after phrase"
                unit = "%"
                value = {userPauseDuration}
                onChange = {onChangePauseSlider}
                max = {200}
                step = {10}
                disabled = {isLoading}
            />

            <div className = "flex flex-col sm:flex-row gap-4 items-center justify-center">
                <label className = {`${buttonClasses} cursor-pointer`}>
                    Choose File
                    <input
                        type = "file"
                        accept = "audio/*"
                        onChange = {handleFileChange}
                        disabled = {isLoading}
                        className = "hidden"
                    />
                </label>

                <button
                    onClick = {recalculatePhrases}
                    disabled = {isRecalculateDisabled}
                    className = {buttonClasses}
                >
                    Recalculate
                </button>
            </div>

            {isLoading && (
                <p className = "text-center text-gray-500 text-sm">Analyzing audio file...</p>
            )}

            {finalAudioUrl && (
                <div className = "flex flex-col items-center space-y-2">
                    <audio controls src = {finalAudioUrl} loop = {isLooping} className = "w-full"/>
                    <button
                        onClick = {() => setIsLooping((loop) => !loop)}
                        className = "min-w-[150px] px-4 py-2 text-white rounded shadow transition bg-gray-500"
                    >
                        {isLooping ? '⏹ Stop looping' : '🔁 Loop'}
                    </button>
                </div>
            )}

            {phrases.length > 0 && uploadedFile && (
                <div className = "mt-6">
                    <h3 className = "text-base font-semibold text-gray-700 mb-2">
                        Listen to phrases:
                    </h3>
                    <div className = "flex flex-col gap-2">
                        {phrases.map((phrase, idx) => (
                            <button
                                key = {idx}
                                onClick = {() => playPhrase(phrase.start, phrase.end)}
                                className = "w-full text-left bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow text-sm"
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
