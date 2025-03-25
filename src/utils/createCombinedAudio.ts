import {bufferToWavBlob} from './bufferToWavBlob.ts';

export const createCombinedAudio = async (
    audioBuffer: AudioBuffer,
    phrases: { start: number; end: number }[],
    pausePercent: number
): Promise<Blob> => {
    const audioContext = new AudioContext();
    const sampleRate = audioBuffer.sampleRate;

    // Рассчитываем длительность итогового буфера
    let totalLength = 0;
    phrases.forEach(({ start, end }) => {
        const phraseDuration = end - start;
        const pauseDuration = phraseDuration * (pausePercent / 100);
        totalLength += phraseDuration + pauseDuration;
    });

    const totalSamples = Math.ceil(totalLength * sampleRate);
    const combinedBuffer = audioContext.createBuffer(
        1, // моно для примера, можно добавить стерео
        totalSamples,
        sampleRate
    );

    const outputData = combinedBuffer.getChannelData(0);

    let offset = 0;

    phrases.forEach(({ start, end }) => {
        const phraseDuration = end - start;
        const pauseDuration = phraseDuration * (pausePercent / 100);

        const phraseStartSample = Math.floor(start * sampleRate);
        const phraseEndSample = Math.floor(end * sampleRate);
        const phraseSamples = phraseEndSample - phraseStartSample;

        // Копируем фразу
        const sourceData = audioBuffer.getChannelData(0);
        for (let i = 0; i < phraseSamples; i++) {
            outputData[offset + i] = sourceData[phraseStartSample + i];
        }

        offset += phraseSamples;

        // Добавляем паузу (тишина)
        const pauseSamples = Math.floor(pauseDuration * sampleRate);
        for (let i = 0; i < pauseSamples; i++) {
            outputData[offset + i] = 0; // тишина
        }

        offset += pauseSamples;
    });

    // Конвертируем в WAV
    const wavBlob = bufferToWavBlob(combinedBuffer);

    return wavBlob;
};
