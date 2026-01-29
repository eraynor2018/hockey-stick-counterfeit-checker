"use client";

interface ThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function ThresholdSlider({
  value,
  onChange,
  disabled = false,
}: ThresholdSliderProps) {
  const getSliderColor = (val: number) => {
    if (val >= 80) return "#ef4444"; // red
    if (val >= 60) return "#f97316"; // orange
    if (val >= 40) return "#eab308"; // yellow
    return "#22c55e"; // green
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label htmlFor="threshold" className="text-sm font-medium text-gray-300">
          Confidence Threshold
        </label>
        <span
          className="text-sm font-bold px-2 py-1 rounded"
          style={{
            color: getSliderColor(value),
            backgroundColor: `${getSliderColor(value)}20`,
          }}
        >
          {value}%
        </span>
      </div>
      <input
        id="threshold"
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          accentColor: getSliderColor(value),
        }}
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>Show All</span>
        <span>High Risk Only</span>
      </div>
    </div>
  );
}
