/**
 * Small SVG chart primitives used by the status bar. All of them are
 * pure-SVG with no animation loop of their own.
 */

interface SparkProps {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  /** draw the most recent value as a dot */
  marker?: boolean;
}

export function Sparkline({
  points,
  width = 86,
  height = 22,
  stroke = "var(--cyan)",
  fill = "rgba(111,224,245,0.16)",
  marker = true,
}: SparkProps) {
  if (points.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 5);

  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="spark">
      <path d={area} fill={fill} stroke="none" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
      {marker && <circle cx={width} cy={y(last)} r="1.9" fill={stroke} />}
    </svg>
  );
}

interface GaugeProps {
  /** 0..1 */
  value: number;
  size?: number;
  label?: string;
  tone?: string;
}

export function RadialGauge({ value, size = 44, label, tone = "var(--cyan)" }: GaugeProps) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? "gauge"}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(150,190,225,0.14)" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${(clamped * c).toFixed(2)} ${c.toFixed(2)}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 6px ${tone})` }}
      />
      <text
        x="50%"
        y="53%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#eaf6ff"
        fontSize={size * 0.3}
        fontFamily="var(--font-mono)"
      >
        {Math.round(clamped * 100)}
      </text>
    </svg>
  );
}

interface NodeMapProps {
  nodes: { id: string; x: number; y: number; status: string }[];
  width?: number;
  height?: number;
}

/** Tiny overhead map of a floor's sensing endpoints. */
export function NodeMap({ nodes, width = 96, height = 58 }: NodeMapProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 100 60" aria-hidden="true" className="nodemap">
      <rect x="1" y="1" width="98" height="58" rx="3" fill="rgba(80,150,200,0.08)" stroke="rgba(150,200,235,0.2)" />
      <line x1="50" y1="1" x2="50" y2="59" stroke="rgba(150,200,235,0.12)" strokeDasharray="3 3" />
      <line x1="1" y1="30" x2="99" y2="30" stroke="rgba(150,200,235,0.12)" strokeDasharray="3 3" />
      {nodes.map((n) => (
        <circle
          key={n.id}
          cx={n.x}
          cy={n.y * 0.6}
          r={n.status === "alert" ? 3.2 : 2.4}
          fill={n.status === "alert" ? "var(--rose)" : n.status === "warn" ? "var(--amber)" : "var(--cyan)"}
          style={{
            filter: `drop-shadow(0 0 4px ${
              n.status === "alert" ? "var(--rose)" : n.status === "warn" ? "var(--amber)" : "var(--cyan)"
            })`,
          }}
        />
      ))}
    </svg>
  );
}
