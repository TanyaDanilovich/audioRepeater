import {useState} from 'react';
import {detectSilenceAndBuildPhrases} from '../utils/detectSilenceAndBuildPhrases.ts';
import {useLocalStorage} from '../hooks/useLocalStorage';
import {createCombinedAudio} from '../utils/createCombinedAudio.ts';
import ValueSlider from './ui/ValueSlider.tsx';


export interface Phrase {
    start: number;
    end: number;
    duration: number;
}

export const AudioPhrasePlayer: React.FC = () => {

    const [isLoading, setIsLoading] = useState(false);
    const [phrases, setPhrases] = useState<Phrase[] | []>([]);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // User settings in localStorage
    const [userPhraseDuration, setUserPhraseDuration] = useLocalStorage<number>('userPhraseDuration', 5);
    const [userPauseDuration, setUserPauseDuration] = useLocalStorage<number>('userPauseDuration', 100);

    // Previous values — used to detect if settings changed
    const [prevPhraseDuration, setPrevPhraseDuration] = useState<number | null>(null);
    const [prevPauseDuration, setPrevPauseDuration] = useState<number | null>(null);

    // Final combined audio URL to be played
    const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !(file instanceof File)) {
            console.error('Invalid file');
            return;
        }

        setIsLoading(true);
        setUploadedFile(file);

        try {
            // Detect phrases and silences from the uploaded audio
            const {phrases, audioBuffer} = await detectSilenceAndBuildPhrases(
                file,
                0.01,
                0.3,
                userPhraseDuration
            );

            // Store current settings as last applied
            setPrevPhraseDuration(userPhraseDuration);
            setPrevPauseDuration(userPauseDuration);
            setPhrases(phrases);
            await regenerateCombinedAudioFile(phrases, audioBuffer);
        } catch (error) {
            console.error('Error analyzing audio file:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const recalculatePhrases = async () => {
        if (!uploadedFile) {
            console.error('No file available for recalculation');
            return;
        }

        setIsLoading(true);

        try {
            // Re-run silence detection and phrase building
            const {phrases, audioBuffer} = await detectSilenceAndBuildPhrases(
                uploadedFile,
                0.01,
                0.3,
                userPhraseDuration
            );

            // Update applied settings
            setPrevPhraseDuration(userPhraseDuration);
            setPrevPauseDuration(userPauseDuration);
            setPhrases(phrases);
            // Rebuild the audio with new settings
            await regenerateCombinedAudioFile(phrases, audioBuffer);
        } catch (error) {
            console.error('Error during phrase recalculation:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Combine phrases with pauses and create final audio file
    const regenerateCombinedAudioFile = async (
        phrasesToCombine: Phrase[],
        audioBuffer: AudioBuffer
    ): Promise<void> => {
        if (!phrasesToCombine.length || !audioBuffer) {
            console.error('No data to build final audio');
            return;
        }

        try {
            const wavBlob = await createCombinedAudio(
                audioBuffer,
                phrasesToCombine,
                userPauseDuration
            );

            const url = URL.createObjectURL(wavBlob);
            setFinalAudioUrl(url);
        } catch (error) {
            console.error('Error generating combined audio file:', error);
        }
    };


    const onChangePhraseSlider = (newValue: number) => {
        setPrevPhraseDuration(userPhraseDuration);
        setUserPhraseDuration(newValue);
    };

    const playPhrase = async (start: number, end: number) => {
        if (!uploadedFile) return;

        const arrayBuffer = await uploadedFile.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Определим длительность фразы
        const duration = end - start;

        // Создаём и подключаем к выходу
        source.connect(audioContext.destination);
        source.start(0, start, duration); // (воспроизводить сейчас, с позиции start, в течение duration)
    };


    const onChangePauseSlider = (newValue: number) => {
        setPrevPauseDuration(userPauseDuration);
        setUserPauseDuration(newValue);
    };

    // Button is disabled if nothing changed or no file is loaded
    const isRecalculateDisabled =
        isLoading ||
        !uploadedFile ||
        prevPhraseDuration === userPhraseDuration &&
        prevPauseDuration === userPauseDuration;

    return (
        <div className = "p-4 flex flex-col items-center space-y-4">
            <h2 className = "text-lg font-bold">Upload an audio file</h2>

            {/* Phrase duration slider */}
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

            {/* Pause duration slider */}
            <ValueSlider
                label = "Pause after phrase"
                unit = "%"
                value = {userPauseDuration}
                onChange = {onChangePauseSlider}
                max = {200}
                step = {10}
                disabled = {isLoading}
            />

            {/* File input + Recalculate button */}
            <div className = "flex space-x-2">
                <input
                    type = "file"
                    accept = "audio/*"
                    onChange = {handleFileChange}
                    disabled = {isLoading}
                    className = "mt-2"
                />

                <button
                    onClick = {recalculatePhrases}
                    disabled = {isRecalculateDisabled}
                    className = "px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                >
                    Recalculate Phrases
                </button>
            </div>

            {/* Loading indicator */}
            {isLoading && <p>Analyzing audio file...</p>}

            {/* Playback output */}
            {finalAudioUrl && (
                <div className = "mt-4 flex flex-col items-center space-y-2">
                    <audio controls src = {finalAudioUrl}></audio>
                </div>
            )}

            {/*//////////////////////////////////////////////////////////////////*/}
            {phrases.length > 0 && uploadedFile && (
                <div className = "w-full mt-6 space-y-2">
                    <h3 className = "text-md font-semibold mb-2">Прослушать фразы:</h3>
                    {phrases.map((phrase, idx) => (
                        <div key = {idx} className = "flex items-center space-x-2">
                            <button
                                onClick = {() => playPhrase(phrase.start, phrase.end)}
                                className = "px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                ▶️ Фраза {idx + 1} ({(phrase.duration).toFixed(2)}s)
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AudioPhrasePlayer;
