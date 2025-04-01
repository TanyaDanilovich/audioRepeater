import { useState } from 'react';
import { detectSilenceAndBuildPhrases } from '../utils/detectSilenceAndBuildPhrases';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { createCombinedAudio } from '../utils/createCombinedAudio';
import { analyzeAudioStats } from '../utils/analyzeAudioStats';
import ValueSlider from './ui/ValueSlider';
import spinner from '../assets/spinner.svg';

export interface Phrase {
    start: number;
    end: number;
    duration: number;
}

export const AudioPhrasePlayer: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState<string | null>(null);
    const [isLooping, setIsLooping] = useState(false);
    const [phrases, setPhrases] = useState<Phrase[]>([]);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);

    const [userPhraseDuration, setUserPhraseDuration] = useLocalStorage<number>('userPhraseDuration', 5);
    const [userPauseDuration, setUserPauseDuration] = useLocalStorage<number>('userPauseDuration', 100);
    const [prevPhraseDuration, setPrevPhraseDuration] = useState<number | null>(null);
    const [prevPauseDuration, setPrevPauseDuration] = useState<number | null>(null);

    const [silenceThreshold, setSilenceThreshold] = useState<number | null>(null);
    const [minSilenceDuration, setMinSilenceDuration] = useState<number | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setStatusText('🔍 Analyzing file...');
        setUploadedFile(file);

        try {
            const stats = await analyzeAudioStats(file);
            const threshold = stats.maxAmplitude * 0.1;
            const silenceDur = Math.max(stats.minSilenceDuration || 0.4, 0.4);

            setSilenceThreshold(threshold);
            setMinSilenceDuration(silenceDur);

            setStatusText('🧠 Detecting phrases...');
            const { phrases, audioBuffer } = await detectSilenceAndBuildPhrases(
                file,
                threshold,
                silenceDur,
                userPhraseDuration
            );

            setPrevPhraseDuration(userPhraseDuration);
            setPrevPauseDuration(userPauseDuration);
            setPhrases(phrases);

            setStatusText('🎧 Generating final audio...');
            await regenerateCombinedAudioFile(phrases, audioBuffer);
        } catch (err) {
            console.error('Error analyzing file:', err);
        } finally {
            setIsLoading(false);
            setStatusText(null);
        }
    };

    const recalculatePhrases = async () => {
        if (!uploadedFile || silenceThreshold === null || minSilenceDuration === null) return;

        setIsLoading(true);
        setStatusText('🔁 Recalculating phrases...');

        try {
            const { phrases, audioBuffer } = await detectSilenceAndBuildPhrases(
                uploadedFile,
                silenceThreshold,
                minSilenceDuration,
                userPhraseDuration
            );

            setPrevPhraseDuration(userPhraseDuration);
            setPrevPauseDuration(userPauseDuration);
            setPhrases(phrases);

            setStatusText('🎧 Regenerating audio...');
            await regenerateCombinedAudioFile(phrases, audioBuffer);
        } catch (err) {
            console.error('Error during recalculation:', err);
        } finally {
            setIsLoading(false);
            setStatusText(null);
        }
    };

    const regenerateCombinedAudioFile = async (phrases: Phrase[], audioBuffer: AudioBuffer) => {
        if (!phrases.length) return;

        try {
            const wavBlob = await createCombinedAudio(audioBuffer, phrases, userPauseDuration);
            setFinalAudioUrl(URL.createObjectURL(wavBlob));
        } catch (error) {
            console.error('Error generating audio:', error);
        }
    };

    const playPhrase = async (start: number, end: number) => {
        if (!uploadedFile) return;
        const audioContext = new AudioContext();
        const buffer = await uploadedFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0, start, end - start);
    };

    const onChangePhraseSlider = (value: number) => {
        setPrevPhraseDuration(userPhraseDuration);
        setUserPhraseDuration(value);
    };

    const onChangePauseSlider = (value: number) => {
        setPrevPauseDuration(userPauseDuration);
        setUserPauseDuration(value);
    };

    const isRecalculateDisabled =
        !uploadedFile ||
        (prevPhraseDuration === userPhraseDuration &&
            prevPauseDuration === userPauseDuration);

    const buttonClasses =
        'min-w-[130px] text-center bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded shadow transition-colors';

    return (
        <div className="relative max-w-md w-full mx-auto p-4 sm:p-6 space-y-6 bg-white rounded-lg text-sm sm:text-base">
            <h1 className="text-2xl font-bold mb-4 text-center">Phrase Audio Player</h1>

            <ValueSlider
                label="Phrase duration"
                unit="sec"
                value={userPhraseDuration}
                onChange={onChangePhraseSlider}
                min={1}
                max={30}
                step={1}
                disabled={false}
            />

            <ValueSlider
                label="Pause after phrase"
                unit="%"
                value={userPauseDuration}
                onChange={onChangePauseSlider}
                max={200}
                step={10}
                disabled={false}
            />

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <label className={`${buttonClasses} cursor-pointer`}>
                    Choose File
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileChange}
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

            {/* 🔄 Overlay with spinner */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center space-y-4 bg-white/70 backdrop-blur-sm transition-opacity duration-300 animate-fade-in">
                    <img
                        src={spinner}
                        alt="Loading..."
                        className="w-12 h-12 animate-spin"
                    />
                    {statusText && (
                        <p className="text-sm text-gray-700 animate-fade-in-text">
                            {statusText}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AudioPhrasePlayer;
