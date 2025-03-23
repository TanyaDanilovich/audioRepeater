import {useRef, useState} from 'react';
import {detectSilenceAndBuildPhrases} from '../detectSilenceAndBuildPhrases.ts';

import {useLocalStorage} from '../hooks/useLocalStorage';
import PhraseDurationSlider from './ui/PhraseDurationSlider.tsx';
import {createCombinedAudio} from '../createCombinedAudio.ts';
import PausePercentageSlider from './ui/PausePercentageSlider.tsx';

interface Phrase {
    start: number;
    end: number;
}

export const AudioPhrasePlayer: React.FC = () => {
    const [phrases, setPhrases] = useState<Phrase[]>([]);
    const [audioUrl, setAudioUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);


    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    const [minPhraseDuration, setMinPhraseDuration] = useLocalStorage<number>(
        'minPhraseDuration',
        5
    );

    const [lastCalculatedDuration, setLastCalculatedDuration] = useState<number | null>(null);
    const [pausePercentage, setPausePercentage] = useState<number>(20);
    const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !(file instanceof File)) {
            console.error('Неверный файл');
            return;
        }

        setIsLoading(true);
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
        setUploadedFile(file);

        try {
            const {phrases, audioBuffer} = await detectSilenceAndBuildPhrases(
                file,
                0.01,
                0.3,
                minPhraseDuration
            );
            console.log('Длительность аудио:', audioBuffer.duration);
            setPhrases(phrases);
            setLastCalculatedDuration(minPhraseDuration); // ✅ фиксируем актуальное значение после расчёта
            // ✅ Сразу генерируем итоговый файл
            await generateFinalAudio(phrases, audioBuffer);
        } catch (error) {
            console.error('Ошибка при анализе аудиофайла:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const recalculatePhrases = async () => {
        if (!uploadedFile) {
            console.error('Нет загруженного файла для перерасчёта');
            return;
        }

        setIsLoading(true);

        try {
            const {phrases, audioBuffer} = await detectSilenceAndBuildPhrases(
                uploadedFile,
                0.01,
                0.3,
                minPhraseDuration
            );
            console.log('Перерасчёт завершён. Длительность аудио:', audioBuffer.duration);
            setPhrases(phrases);
            setLastCalculatedDuration(minPhraseDuration); // ✅ обновляем после перерасчёта
        } catch (error) {
            console.error('Ошибка при перерасчёте фраз:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getAudio = () => {
        if (!audioUrl) {
            console.error('Нет аудиофайла');
            return null;
        }

        if (!audioRef.current) {
            audioRef.current = new Audio(audioUrl);
        }

        return audioRef.current;
    };

    const generateFinalAudio = async (
        phrasesToCombine: Phrase[],
        audioBuffer: AudioBuffer
    ): Promise<void> => {
        if (!phrasesToCombine.length || !audioBuffer) {
            console.error('Нет данных для генерации итогового файла');
            return;
        }

        try {
            const wavBlob = await createCombinedAudio(
                audioBuffer,
                phrasesToCombine,
                pausePercentage
            );

            const url = URL.createObjectURL(wavBlob);
            setFinalAudioUrl(url);

            console.log('Аудио собрано успешно!');
        } catch (error) {
            console.error('Ошибка при генерации итогового аудио:', error);
        }
    };


    const isRecalculateDisabled =
        isLoading ||
        !uploadedFile ||
        lastCalculatedDuration === minPhraseDuration;

    return (
        <div className="p-4 flex flex-col items-center space-y-4">
            <h2 className="text-lg font-bold">Загрузите аудиофайл</h2>

            {/* ✅ Phrase Duration Slider */}
            <PhraseDurationSlider
                value={minPhraseDuration}
                onChange={setMinPhraseDuration}
                min={1}
                max={30}
                step={1}
                disabled={isLoading}
            />

            {/* ✅ Pause Percentage Slider */}
            <PausePercentageSlider
                value={pausePercentage}
                onChange={setPausePercentage}
                min={0}
                max={100}
                step={1}
                disabled={isLoading}
            />

            <div className="flex space-x-2">
                <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    className="mt-2"
                />

                <button
                    onClick={recalculatePhrases}
                    disabled={isRecalculateDisabled}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                >
                    Пересчитать фразы
                </button>
            </div>

            {isLoading && <p>Анализ аудиофайла...</p>}

            {finalAudioUrl && (
                <div className="mt-4 flex flex-col items-center space-y-2">
                    <audio controls src={finalAudioUrl}></audio>
                    <a
                        href={finalAudioUrl}
                        download="combined_audio.wav"
                        className="text-blue-500 underline"
                    >
                        Скачать итоговый аудиофайл
                    </a>
                </div>
            )}
        </div>

    );
};

export default AudioPhrasePlayer;
