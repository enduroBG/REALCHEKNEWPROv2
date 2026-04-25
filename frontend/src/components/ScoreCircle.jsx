import { useEffect, useState } from "react";

export default function ScoreCircle({ score = 0, size = 180, stroke = 10 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 80);
    return () => clearTimeout(t);
  }, [score]);

  const offset = circumference - (animated / 100) * circumference;

  const color =
    score >= 75 ? "#3fb950" : score >= 50 ? "#d29922" : "#f85149";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      data-testid="score-circle"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#21262d"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)",
            filter: `drop-shadow(0 0 10px ${color}55)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-mono font-bold text-white leading-none"
          style={{ fontSize: size * 0.28 }}
          data-testid="reality-score-value"
        >
          {Math.round(animated)}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8b949e] mt-1">
          / 100
        </div>
      </div>
    </div>
  );
}
