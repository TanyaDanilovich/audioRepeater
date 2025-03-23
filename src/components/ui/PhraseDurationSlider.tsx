

interface PhraseDurationSliderProps {
    value: number;
    onChange: (newValue: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
}

const PhraseDurationSlider: React.FC<PhraseDurationSliderProps> = ({
                                                                       value,
                                                                       onChange,
                                                                       min = 1,
                                                                       max = 30,
                                                                       step = 1,
                                                                       disabled = false
                                                                   }) => {
    const increment = () => {
        const nextValue = Math.min(value + step, max);
        onChange(nextValue);
    };

    const decrement = () => {
        const nextValue = Math.max(value - step, min);
        onChange(nextValue);
    };

    return (
        <div className="flex flex-col items-center space-y-2">
            <label className="text-sm font-medium">
                Длина фразы: {value} секунд
            </label>
            <div className="flex items-center space-x-2">
                <button
                    onClick={decrement}
                    className="px-2 py-1 bg-gray-300 hover:bg-gray-400 rounded"
                    disabled={disabled || value <= min}
                >
                    ➖
                </button>

                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    disabled={disabled}
                    className="w-64"
                />

                <button
                    onClick={increment}
                    className="px-2 py-1 bg-gray-300 hover:bg-gray-400 rounded"
                    disabled={disabled || value >= max}
                >
                    ➕
                </button>
            </div>
        </div>
    );
};

export default PhraseDurationSlider;
