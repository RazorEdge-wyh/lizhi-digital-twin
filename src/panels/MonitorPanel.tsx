import { useEffect, useMemo, useRef, useState } from "react";
import { GlassDivider, LiquidGlass } from "../components/LiquidGlass";
import { IconCamera, IconPause, IconPlay, IconRadar, IconUsers } from "../components/Icons";
import { CHANNELS, type ChannelId, type SensorReading } from "../data/building";

interface Props {
  floorCode: string;
  floorLabel: string;
  reading?: SensorReading;
  history: number[];
  paused: boolean;
  onPause: (v: boolean) => void;
}

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, hist: number[], r?: SensorReading) => void;

const heat = (v: number) => {
  // 0..1 -> blue -> cyan -> amber -> red
  const stops: [number, [number, number, number]][] = [
    [0, [12, 30, 62]],
    [0.32, [30, 120, 170]],
    [0.55, [80, 210, 210]],
    [0.72, [255, 196, 96]],
    [0.88, [255, 122, 70]],
    [1, [255, 70, 90]],
  ];
  const c = Math.max(0, Math.min(1, v));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (c >= a && c <= b) {
      const k = (c - a) / (b - a);
      return `rgb(${ca.map((v0, j) => Math.round(v0 + (cb[j] - v0) * k)).join(",")})`;
    }
  }
  return "rgb(255,70,90)";
};

const drawWave: Draw = (ctx, w, h, t, hist) => {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(120,200,240,0.10)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += Math.max(14, w / 14)) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += Math.max(12, h / 6)) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const pts = hist.length > 1 ? hist : [22, 23, 24];
  const min = Math.min(...pts) - 0.6;
  const max = Math.max(...pts) + 0.6;
  const span = max - min || 1;
  const dx = w / (pts.length - 1);
  const py = (v: number, i: number) =>
    h - ((v - min) / span) * (h * 0.72) - h * 0.14 + Math.sin(t / 420 + i) * 0.8;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(111,224,245,0.42)");
  grad.addColorStop(1, "rgba(111,224,245,0)");
  ctx.beginPath();
  ctx.moveTo(0, h);
  pts.forEach((v, i) => ctx.lineTo(i * dx, py(v, i)));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  pts.forEach((v, i) => (i === 0 ? ctx.moveTo(0, py(v, i)) : ctx.lineTo(i * dx, py(v, i))));
  ctx.strokeStyle = "#9ceaff";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "rgba(111,224,245,0.9)";
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const last = pts[pts.length - 1];
  ctx.fillStyle = "#eafcff";
  ctx.beginPath();
  ctx.arc(w - 3, py(last, pts.length - 1), 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(180,214,240,0.72)";
  ctx.font = "9px var(--font-mono), monospace";
  ctx.fillText(`${max.toFixed(1)}`, 5, 11);
  ctx.fillText(`${min.toFixed(1)}`, 5, h - 5);
};

const drawThermal: Draw = (ctx, w, h, t, _hist, r) => {
  ctx.clearRect(0, 0, w, h);
  const cols = 20;
  const rows = 11;
  const cw = w / cols;
  const ch = h / rows;
  const base = ((r?.temp ?? 23) - 18) / 12;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const nx = x / cols;
      const ny = y / rows;
      const blobs =
        Math.exp(-(((nx - 0.32) ** 2 + (ny - 0.4) ** 2) / 0.028)) * 0.75 +
        Math.exp(-(((nx - 0.68) ** 2 + (ny - 0.62) ** 2) / 0.02)) * 0.95 +
        Math.exp(-(((nx - 0.52) ** 2 + (ny - 0.24) ** 2) / 0.05)) * 0.4;
      const pulse = Math.sin(t / 900 + x * 0.5 + y * 0.4) * 0.06;
      const v = Math.max(0, Math.min(1, base * 0.5 + blobs * 0.72 + pulse));
      ctx.fillStyle = heat(v);
      ctx.fillRect(x * cw, y * ch, cw + 0.6, ch + 0.6);
    }
  }
  ctx.fillStyle = "rgba(4,7,13,0.28)";
  ctx.fillRect(0, 0, w, h);
  // crosshair on the hottest cell
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  const hx = w * 0.68;
  const hy = h * 0.62;
  ctx.strokeRect(hx - 12, hy - 9, 24, 18);
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.font = "9px var(--font-mono), monospace";
  ctx.fillText(`${((r?.temp ?? 23) + 1.8).toFixed(1)}°C`, hx + 16, hy + 3);
};

const drawRadio: Draw = (ctx, w, h, t, _hist, r) => {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const rad = Math.min(w, h) * 0.44;
  ctx.strokeStyle = "rgba(120,210,245,0.22)";
  ctx.lineWidth = 1;
  [0.33, 0.66, 1].forEach((k) => {
    ctx.beginPath();
    ctx.arc(cx, cy, rad * k, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(cx - rad, cy);
  ctx.lineTo(cx + rad, cy);
  ctx.moveTo(cx, cy - rad);
  ctx.lineTo(cx, cy + rad);
  ctx.strokeStyle = "rgba(120,210,245,0.14)";
  ctx.stroke();

  const angle = (t / 1400) % (Math.PI * 2);
  const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
  grad.addColorStop(0, "rgba(111,224,245,0.55)");
  grad.addColorStop(1, "rgba(111,224,245,0)");
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, rad, angle - 0.34, angle);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  const count = Math.min(14, Math.max(4, Math.round((r?.people ?? 40) / 12)));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + t / 5200;
    const rr = rad * (0.22 + ((i * 37) % 70) / 100);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const lit = Math.abs(((angle - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 2.6;
    ctx.fillStyle = lit ? "rgba(180,255,255,0.95)" : "rgba(111,224,245,0.35)";
    ctx.beginPath();
    ctx.arc(x, y, lit ? 2.6 : 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(111,224,245,0.85)";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
  ctx.stroke();
};

const drawCrowd: Draw = (ctx, w, h, t, _hist, r) => {
  ctx.clearRect(0, 0, w, h);
  const people = r?.people ?? 0;
  const bars = 14;
  const bw = w / bars;
  const cap = Math.max(30, people * 1.4);
  ctx.strokeStyle = "rgba(120,200,240,0.12)";
  for (let i = 0; i <= 4; i++) {
    const y = (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  let sum = 0;
  const values: number[] = [];
  for (let i = 0; i < bars; i++) values.push(0);
  const peak = Math.max(1, people);
  for (let i = 0; i < bars; i++) {
    const w1 = 0.5 + 0.5 * Math.sin(t / 1800 + i * 1.7);
    const w2 = 0.5 + 0.5 * Math.sin(t / 900 + i * 0.9 + 1.2);
    const v = (w1 * 0.6 + w2 * 0.4) * peak * (0.45 + ((i * 13) % 7) / 12);
    values[i] = v;
    sum += v;
  }
  const k = sum > 0 ? people / sum : 0;
  values.forEach((raw, i) => {
    const v = raw * k;
    const bh = Math.min(h - 4, (v / cap) * (h - 6));
    const x = i * bw + bw * 0.16;
    const grad = ctx.createLinearGradient(0, h - bh, 0, h);
    grad.addColorStop(0, "rgba(169,150,255,0.95)");
    grad.addColorStop(1, "rgba(111,224,245,0.35)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, h - bh - 2, bw * 0.68, bh);
  });
  ctx.fillStyle = "rgba(200,228,248,0.8)";
  ctx.font = "9px var(--font-mono), monospace";
  ctx.fillText(`Σ ${people} 人 · 峰值区 ${(values.indexOf(Math.max(...values)) + 1).toString().padStart(2, "0")}`, 6, 12);
};

const DRAWERS: Record<ChannelId, Draw> = {
  depth: drawWave,
  thermal: drawThermal,
  radio: drawRadio,
  crowd: drawCrowd,
};

function Feed({
  channel,
  id,
  label,
  reading,
  history,
  paused,
  onFull,
}: {
  channel: ChannelId;
  id: string;
  label: string;
  reading?: SensorReading;
  history: number[];
  paused: boolean;
  onFull: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const histRef = useRef(history);
  histRef.current = history;
  const readRef = useRef(reading);
  readRef.current = reading;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(80, rect.width);
      const h = Math.max(60, rect.height);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!paused) t = now;
      DRAWERS[channel](ctx, w, h, t, histRef.current, readRef.current);
      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [channel, paused]);

  return (
    <div className="feed" style={onFull ? { flex: "1 1 auto", minHeight: 0 } : undefined}>
      <div className="feed__view" style={onFull ? { aspectRatio: "auto", height: "100%" } : undefined}>
        <canvas ref={canvasRef} className="feed__canvas" />
        <div className="feed__noise" />
        {!onFull && <div className="feed__scan" />}
        <div className="feed__top">
          <IconCamera size={12} />
          <span className="feed__id">{id}</span>
          <span className="feed__rec">
            <i className="dot" />
            {paused ? "PAUSE" : "REC"}
          </span>
        </div>
        <div className="feed__bottom">
          <span>{label}</span>
          <span>{reading ? `${reading.online}/${reading.devices} pts` : "--"}</span>
        </div>
      </div>
    </div>
  );
}

export function MonitorPanel({ floorCode, floorLabel, reading, history, paused, onPause }: Props) {
  const [channel, setChannel] = useState<ChannelId>("depth");
  const [fullIndex, setFullIndex] = useState<number | null>(null);

  const feeds = useMemo(
    () => [
      { id: `CAM-${floorCode}-01`, label: `${floorLabel} 主厅 / Main Hall` },
      { id: `CAM-${floorCode}-02`, label: `${floorLabel} 走廊 / Corridor` },
      { id: `CAM-${floorCode}-04`, label: `${floorLabel} 设备间 / Plant` },
    ],
    [floorCode, floorLabel],
  );

  const visible = fullIndex === null ? feeds : [feeds[fullIndex]];

  return (
    <LiquidGlass className="panel monitor-panel" radius="lg" tone="ink" refraction={0.9} blur={18} elevation={2} static fill>
      <div className="panel__head">
        <IconRadar size={15} />
        <span className="panel__head-cn">监视器</span>
        <span className="panel__head-en">Monitor</span>
        <span className="panel__head-spacer" />
        <button
          className={`tbtn ${paused ? "tbtn--on" : ""}`}
          onClick={() => onPause(!paused)}
          title="暂停 / 继续"
          style={{ height: 22, padding: "0 7px" }}
        >
          {paused ? <IconPlay size={12} /> : <IconPause size={12} />}
        </button>
      </div>
      <GlassDivider />

      <div className="monitor__channels">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            className={`tab ${channel === c.id ? "tab--on" : ""}`}
            onClick={() => setChannel(c.id)}
            title={c.en}
          >
            {c.cn}
          </button>
        ))}
      </div>

      <div className="panel__body monitor__body scroll">
        {visible.map((f) => {
          const idx = feeds.indexOf(f);
          return (
            <div key={f.id} className="feedslot">
              <Feed
                channel={channel}
                id={f.id}
                label={f.label}
                reading={reading}
                history={history}
                paused={paused}
                onFull={fullIndex !== null}
              />
              <button
                className="feedslot__expand"
                onClick={() => setFullIndex(fullIndex === null ? idx : null)}
                title={fullIndex === null ? "放大 / Expand" : "还原 / Restore"}
              >
                {fullIndex === null ? "⤢" : "⤡"}
              </button>
            </div>
          );
        })}

        <div className="monitor__stats">
          <div className="mstat">
            <span className="mstat__k">
              <IconUsers size={12} /> 在场人数
            </span>
            <span className="mstat__v mono">{reading?.people ?? "--"}</span>
          </div>
          <div className="mstat">
            <span className="mstat__k">CO₂</span>
            <span className={`mstat__v mono ${(reading?.co2 ?? 0) > 1000 ? "warn" : ""}`}>
              {reading?.co2 ?? "--"}
            </span>
          </div>
          <div className="mstat">
            <span className="mstat__k">负荷</span>
            <span className="mstat__v mono">{reading ? `${reading.power.toFixed(1)} kW` : "--"}</span>
          </div>
          <div className="mstat">
            <span className="mstat__k">端点</span>
            <span className="mstat__v mono">
              {reading?.online ?? 0}/{reading?.devices ?? 0}
            </span>
          </div>
        </div>
      </div>
    </LiquidGlass>
  );
}
