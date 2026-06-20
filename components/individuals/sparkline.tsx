"use client";

type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
};

// Minimal dependency-free sparkline rendered as an SVG polyline.
export function Sparkline({
  values,
  width = 120,
  height = 32,
  className,
}: SparklineProps) {
  if (values.length === 0) {
    return <span className="text-muted-foreground text-xs">no data</span>;
  }
  if (values.length === 1) {
    return (
      <svg width={width} height={height} className={className}>
        <circle cx={width / 2} cy={height / 2} r={2.5} fill="currentColor" />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pad = 3;
  const usableH = height - pad * 2;

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = pad + usableH - ((v - min) / range) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const rising = values[values.length - 1] >= values[0];

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={rising ? "#16a34a" : "#dc2626"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
