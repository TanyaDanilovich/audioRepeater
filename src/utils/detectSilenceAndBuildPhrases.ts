export const detectSilenceAndBuildPhrases = async (
    file: File,
    silenceThreshold = 0.01,
    minSilenceDuration = 0.3, // минимальная пауза, чтобы считалась паузой
    minPhraseDuration  // минимальная длина фразы
) => {
    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    const sampleRate = audioBuffer.sampleRate;
    const silenceSamples = minSilenceDuration * sampleRate;

    const phrases: { start: number; end: number }[] = [];

    let isSilent = false;
    let silenceStart = 0;
    let lastPhraseStart = 0;

    for (let i = 0; i < channelData.length; i++) {
        const amplitude = Math.abs(channelData[i]);

        // Обнаружение входа в тишину
        if (!isSilent && amplitude < silenceThreshold) {
            isSilent = true;
            silenceStart = i;
        }

        // Обнаружение выхода из тишины
        if (isSilent && amplitude >= silenceThreshold) {
            const silenceEnd = i;
            const silenceDuration = silenceEnd - silenceStart;

            // Если пауза достаточно длинная, проверяем длину текущей фразы
            if (silenceDuration >= silenceSamples) {
                const phraseEnd = silenceStart / sampleRate;
                const phraseDuration = phraseEnd - lastPhraseStart;

                if (phraseDuration >= minPhraseDuration) {
                    // Фраза достаточно длинная, добавляем её
                    phrases.push({
                        start: lastPhraseStart,
                        end: phraseEnd
                    });

                    // Следующая фраза начнётся после этой паузы
                    lastPhraseStart = silenceEnd / sampleRate;
                }
            }

            isSilent = false;
        }
    }

    // Добавляем последнюю фразу, если осталась
    const audioDuration = audioBuffer.duration;
    const remainingDuration = audioDuration - lastPhraseStart;

    if (remainingDuration >= minPhraseDuration) {
        phrases.push({
            start: lastPhraseStart,
            end: audioDuration
        });
    }

    console.log('Найденные фразы:', phrases);

    return { phrases, audioBuffer };
};
