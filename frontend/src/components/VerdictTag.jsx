const VERDICTS = {
  verified: {
    label: "Потвърдено",
    color: "#3fb950",
    bg: "rgba(63,185,80,0.1)",
    border: "rgba(63,185,80,0.25)",
  },
  suspicious: {
    label: "Съмнително",
    color: "#d29922",
    bg: "rgba(210,153,34,0.1)",
    border: "rgba(210,153,34,0.25)",
  },
  unconfirmed: {
    label: "Непотвърдено",
    color: "#f85149",
    bg: "rgba(248,81,73,0.1)",
    border: "rgba(248,81,73,0.25)",
  },
};

export default function VerdictTag({ verdict, size = "sm" }) {
  const v = VERDICTS[verdict] || VERDICTS.unconfirmed;
  const sizes = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };
  return (
    <span
      data-testid={`verdict-${verdict}`}
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded border ${sizes[size]}`}
      style={{
        color: v.color,
        background: v.bg,
        borderColor: v.border,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full rc-pulse"
        style={{ background: v.color }}
      />
      {v.label}
    </span>
  );
}

export const verdictMeta = VERDICTS;
