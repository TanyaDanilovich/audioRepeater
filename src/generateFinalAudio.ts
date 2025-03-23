export const generateFinalAudio = async () => {
    if (!uploadedFile || !phrases.length) {
        console.error('Нет загруженного файла или фраз');
        return;
    }

    setIsLoading(true);

    try {
        const { audioBuffer } = await detectSilenceAndBuildPhrases(
            uploadedFile,
            0.01,
            0.3,
            minPhraseDuration
        );

        const wavBlob = await createCombinedAudio(audioBuffer, phrases, pausePercentage);

        const url = URL.createObjectURL(wavBlob);
        setFinalAudioUrl(url);

        console.log('Аудио собрано успешно!');
    } catch (error) {
        console.error('Ошибка при генерации итогового аудио:', error);
    } finally {
        setIsLoading(false);
    }
};
