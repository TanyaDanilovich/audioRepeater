import { useState, useRef } from 'react';
import { detectSilenceAndBuildPhrases } from '../detectSilenceAndBuildPhrases.ts';

export const AudioPhrasePlayer: React.FC = () => {
    const [phrases, setPhrases] = useState<{ start: number; end: number }[]>([]);
    const [audioUrl, setAudioUrl] = useState('');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            console.error('Нет файла');
            return;
        }

        // Проверка на правильный тип
        if (!(file instanceof File)) {
            console.error('Ожидался объект File, а получено:', typeof file);
            return;
        }

        const url = URL.createObjectURL(file);
        setAudioUrl(url);

        // Используем новую функцию, которая сразу вернёт готовые фразы и audioBuffer
        try {
            const { phrases, audioBuffer } = await detectSilenceAndBuildPhrases(file);
            console.log('Длительность аудио:', audioBuffer.duration);
            setPhrases(phrases);
        } catch (error) {
            console.error('Ошибка при анализе аудиофайла:', error);
        }
    };

    const playPhrase = (start: number, end: number) => {
        if (!audioUrl) {
            console.error('Нет аудиофайла для воспроизведения');
            return;
        }

        if (!audioRef.current) {
            audioRef.current = new Audio(audioUrl);
        }

        const audio = audioRef.current;
        if (!audio) {
            console.error('Аудио элемент не инициализирован');
            return;
        }

        audio.currentTime = start;

        // Воспроизведение и обработка ошибки при блокировке браузером
        audio.play().catch((err) => {
            console.error('Ошибка воспроизведения:', err);
        });

        const duration = (end - start) * 1000;

        setTimeout(() => {
            audio.pause();
        }, duration);
    };

    return (
        <div className="p-4 flex flex-col items-center space-y-4">
            <input type="file" accept="audio/*" onChange={handleFileChange} />

            {phrases.length > 0 && (
                <div className="w-full space-y-2">
                    <h3>Фразы:</h3>
                    {phrases.map((phrase, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                            <button
                                onClick={() => playPhrase(phrase.start, phrase.end)}
                                className="bg-blue-500 text-white px-4 py-2 rounded"
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
