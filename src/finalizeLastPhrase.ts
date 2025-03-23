import {splitLongPhrase} from './splitLongPhrase.ts';

export const finalizeLastPhrase = (
    lastPhraseStart: number,
    audioDuration: number,
    maxPhraseDuration: number
): { start: number; end: number }[] => {
    return splitLongPhrase(lastPhraseStart, audioDuration, maxPhraseDuration);
};
