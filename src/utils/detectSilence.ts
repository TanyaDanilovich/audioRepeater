export const detectSilence =
    async (
        file: File,                      // 📂 Файл, который пользователь загружает
        silenceThreshold = 0.01,         // 🎚 Порог тишины (амплитуда ниже которого считается тишиной)
        minSilenceDuration = 0.1         // ⏱ Минимальная продолжительность тишины (секунды)
    ) => {
        const audioContext = new AudioContext(); // 🎧 Создаём аудиоконтекст для обработки звука
        const arrayBuffer = await file.arrayBuffer(); // 📦 Читаем файл как массив байтов (ArrayBuffer)

        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer); // 🔓 Декодируем аудиофайл в аудиобуфер
        // Превращаем данные в формат, с которым можно работать на уровне аудиосемплов.
        //     audioBuffer содержит аудиоданные и метаинформацию (sampleRate, duration и т.д.).

        const channelData = audioBuffer.getChannelData(0); // 🎚 Достаём данные первого аудиоканала (обычно левый канал)

        const sampleRate = audioBuffer.sampleRate; // ⏱ Частота дискретизации аудио (samples per second)
        // Сколько сэмплов в секунду (обычно 44100 или 48000).
        // Это нужно для перевода индексов в массиве в секунды времени.


        const silenceSamples = minSilenceDuration * sampleRate; // 🎯 Сколько сэмплов должно быть подряд, чтобы считалось паузой
        // Вычисляем количество сэмплов, соответствующее минимальной длительности тишины.
        // Например, 0.3 секунды * 44100 samples/second = 13230 samples.

        const silences = [];        // ⏹ Массив для хранения найденных пауз
        let isSilent = false;       // ✅ Флаг: мы сейчас в тишине или нет?
        let silenceStart = 0;       // ⏱ Время начала текущей паузы в сэмплах


        for (let i = 0; i < channelData.length; i++) {
            const amplitude = Math.abs(channelData[i]); // 📈 Амплитуда сигнала (по модулю)
            // Амплитуда сигнала в каждой точке во времени.
            //     Значения близкие к 0 — почти тишина.

            //Если амплитуда ниже порога тишины и ещё не в тишине:
            if (!isSilent && amplitude < silenceThreshold) {
                isSilent = true;        // 🟢 Мы входим в состояние тишины
                silenceStart = i;       // ⏱ Запоминаем начало тишины
            }

            //Если амплитуда стала больше порога (тишина закончилась):
            if (isSilent && amplitude >= silenceThreshold) {
                const silenceEnd = i;                         // 🛑 Запоминаем конец тишины
                const duration = silenceEnd - silenceStart;   // ⏱ Длительность тишины в сэмплах


                //Если тишина была достаточно длинной — сохраняем результат:
                if (duration >= silenceSamples) {
                    silences.push({
                        start: silenceStart / sampleRate,       // 🕒 Время начала в секундах
                        end: silenceEnd / sampleRate,           // 🕒 Время конца в секундах
                        duration: duration / sampleRate         // ⏱ Длительность в секундах
                    });
                }

                isSilent = false;
            }
        }

        console.log("Найденные паузы:", silences);
        return { silences, audioBuffer };
    };

