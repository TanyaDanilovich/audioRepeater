
interface ValueSliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    disabled?: boolean;
}

const ValueSlider: React.FC<ValueSliderProps> = ({
                                                     label,
                                                     value,
                                                     onChange,
                                                     min = 0,
                                                     max = 100,
                                                     step = 1,
                                                     unit = '',
                                                     disabled = false,
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
        <div className="flex flex-col items-center space-y-1 mb-8 ">
            <label className="text-sm font-medium">
                {`${label}: ${value} ${unit}`}
            </label>
            <div className="flex items-center space-x-2">
                <button
                    onClick={decrement}
                    disabled={disabled || value <= min}
                    className="px-2 py-1 bg-gray-300 hover:bg-gray-400 rounded"
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
                    className="w-[150px] sm:w-64"
                />

                <button
                    onClick={increment}
                    disabled={disabled || value >= max}
                    className="px-2 py-1 bg-gray-300 hover:bg-gray-400 rounded"
                >
                    ➕
                </button>
            </div>
        </div>
    );
};

export default ValueSlider;
