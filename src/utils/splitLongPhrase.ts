
export const splitLongPhrase = (
    start: number,
    end: number,
    maxDuration: number
): { start: number; end: number }[] => {
    const splits: { start: number; end: number }[] = [];

    let splitStart = start;

    while (end - splitStart > maxDuration) {
        splits.push({
            start: splitStart,
            end: splitStart + maxDuration
        });
        splitStart += maxDuration;
    }

    if (end - splitStart > 0.1) {
        splits.push({
            start: splitStart,
            end: end
        });
    }

    return splits;
};
