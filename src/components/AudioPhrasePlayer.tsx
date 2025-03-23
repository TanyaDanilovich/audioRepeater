import { useRef, useState } from 'react';
import { detectSilenceAndBuildPhrases } from '../detectSilenceAndBuildPhrases.ts';

import { useLocalStorage } from '../hooks/useLocalStorage';
import PhraseDurationSlider from './ui/PhraseDurationSlider.tsx';

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
            const { phrases, audioBuffer } = await detectSilenceAndBuildPhrases(
                file,
                0.01,
                0.3,
                minPhraseDuration
            );
            console.log('Длительность аудио:', audioBuffer.duration);
            setPhrases(phrases);
            setLastCalculatedDuration(minPhraseDuration); // ✅ фиксируем актуальное значение после расчёта
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
            const { phrases, audioBuffer } = await detectSilenceAndBuildPhrases(
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

    const playPhrase = (start: number, end: number) => {
        const audio = getAudio();
        if (!audio) return;

        audio.currentTime = start;

        audio.play().catch((err) => {
            console.error('Ошибка воспроизведения:', err);
        });

        const duration = (end - start) * 1000;

        setTimeout(() => {
            audio.pause();
        }, duration);
    };

    const isRecalculateDisabled =
        isLoading ||
        !uploadedFile ||
        lastCalculatedDuration === minPhraseDuration;

    return (
        <div className="p-4 flex flex-col items-center space-y-4">
            <h2 className="text-lg font-bold">Загрузите аудиофайл</h2>

            {/* ✅ Слайдер длины фразы */}
            <PhraseDurationSlider
                value={minPhraseDuration}
                onChange={setMinPhraseDuration}
                min={1}
                max={30}
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

                {/* ✅ Кнопка перерасчёта */}
                <button
                    onClick={recalculatePhrases}
                    disabled={isRecalculateDisabled}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                >
                    Пересчитать фразы
                </button>
            </div>

            {isLoading && <p>Анализ аудиофайла...</p>}

            {!isLoading && phrases.length > 0 && (
                <div className="w-full space-y-2 mt-4">
                    <h3 className="font-bold text-lg">Фразы:</h3>
                    {phrases.map((phrase, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                            <button
                                onClick={() => playPhrase(phrase.start, phrase.end)}
                                className="bg-blue-500 hover:bg-blue-600 transition-colors text-white px-4 py-2 rounded"
                            >
                                ▶️ Фраза {idx + 1} (
                                {phrase.start.toFixed(2)}s - {phrase.end.toFixed(2)}s,
                                длина: {(phrase.end - phrase.start).toFixed(2)}s
                                )
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AudioPhrasePlayer;
