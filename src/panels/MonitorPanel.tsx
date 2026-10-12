import { useEffect, useMemo, useRef, useState } from "react";
import { GlassDivider, LiquidGlass } from "../components/LiquidGlass";
import { IconCamera, IconPause, IconPlay } from "../components/Icons";
import { CHANNELS, type ChannelId, type SensorReading } from "../data/building";

interface Props {
  floorCode: string;
  floorLabel: string;
  reading?: SensorReading;
  history: number[];
  paused: boolean;
  onPause: (v: boolean) => void;
}

type Ink = { fg: string; dim: string; warn: string };
type Draw = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  hist: number[],
  r: SensorReading | undefined,
  ink: Ink,
) => void;

/** Read the palette off the document so the canvas follows the CSS tokens. */
function readInk(): Ink {
  const cs = getComputedStyle(document.documentElement);
  return {
    fg: cs.getPropertyValue("--ink-0").trim() || "#f7f8fa",
    dim: cs.getPropertyValue("--ink-4").trim() || "#63696f",
    warn: cs.getPropertyValue("--warn").trim() || "#e0a951",
  };
}

const MONO = "'Cascadia Mono', Consolas, monospace";

const drawWave: Draw = (ctx, w, h, t, hist, _r, ink) => {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += Math.max(16, w / 10)) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += Math.max(14, h / 4)) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  const pts = hist.length > 1 ? hist : [22, 23, 24];
  const min = Math.min(...pts) - 0.5;
  const max = Math.max(...pts) + 0.5;
  const span = max - min || 1;
  const dx = w / (pts.length - 1);
  const py = (v: number, i: number) => h - ((v - min) / span) * (h * 0.66) - h * 0.17 + Math.sin(t / 900 + i) * 0.5;

  ctx.beginPath();
  pts.forEach((v, i) => (i === 0 ? ctx.moveTo(0, py(v, i)) : ctx.lineTo(i * dx, py(v, i))));
  ctx.strokeStyle = ink.fg;
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.fillStyle = ink.fg;
  ctx.beginPath();
  ctx.arc(w - 2.5, py(pts[pts.length - 1], pts.length - 1), 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = ink.dim;
  ctx.font = `9px ${MONO}`;
  ctx.fillText(max.toFixed(1), 5, 11);
  ctx.fillText(min.toFixed(1), 5, h - 5);
};

const drawThermal: Draw = (ctx, w, h, t, _hist, r, ink) => {
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
      const pulse = Math.sin(t / 1100 + x * 0.5 + y * 0.4) * 0.06;
      const v = Math.max(0, Math.min(1, base * 0.5 + blobs * 0.72 + pulse));
      // single-hue luminance ramp: no rainbow heat map
      const lum = 10 + v * 74;
      ctx.fillStyle = `hsl(${212 - v * 14} 14% ${lum}%)`;
      ctx.fillRect(x * cw, y * ch, cw + 0.5, ch + 0.5);
    }
  }
  const hx = w * 0.68;
  const hy = h * 0.62;
  ctx.strokeStyle = ink.warn;
  ctx.lineWidth = 1;
  ctx.strokeRect(hx - 10, hy - 8, 20, 16);
  ctx.fillStyle = ink.fg;
  ctx.font = `9px ${MONO}`;
  ctx.fillText(`${((r?.temp ?? 23) + 1.8).toFixed(1)}°C`, hx + 14, hy + 3);
};

const drawRadio: Draw = (ctx, w, h, t, _hist, r, ink) => {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const rad = Math.min(w, h) * 0.42;
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 1;
  [0.34, 0.67, 1].forEach((k) => {
    ctx.beginPath();
    ctx.arc(cx, cy, rad * k, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(cx - rad, cy + 0.5);
  ctx.lineTo(cx + rad, cy + 0.5);
  ctx.moveTo(cx + 0.5, cy - rad);
  ctx.lineTo(cx + 0.5, cy + rad);
  ctx.stroke();

  const angle = (t / 1600) % (Math.PI * 2);
  ctx.strokeStyle = ink.fg;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
  ctx.stroke();

  const count = Math.min(12, Math.max(4, Math.round((r?.people ?? 40) / 14)));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + t / 6000;
    const rr = rad * (0.24 + ((i * 37) % 68) / 100);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const lit = Math.abs(((angle - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 2.7;
    ctx.fillStyle = lit ? ink.fg : "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.arc(x, y, lit ? 2.2 : 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawCrowd: Draw = (ctx, w, h, t, _hist, r, ink) => {
  ctx.clearRect(0, 0, w, h);
  const people = r?.people ?? 0;
  const bars = 14;
  const bw = w / bars;
  const cap = Math.max(30, people * 1.4);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const y = (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  const values: number[] = [];
  let sum = 0;
  for (let i = 0; i < bars; i++) {
    const w1 = 0.5 + 0.5 * Math.sin(t / 1900 + i * 1.7);
    const w2 = 0.5 + 0.5 * Math.sin(t / 950 + i * 0.9 + 1.2);
    const v = (w1 * 0.6 + w2 * 0.4) * people * (0.45 + ((i * 13) % 7) / 12);
    values.push(v);
    sum += v;
  }
  const k = sum > 0 ? people / sum : 0;
  values.forEach((raw, i) => {
    const bh = Math.min(h - 6, ((raw * k) / cap) * (h - 8));
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(i * bw + bw * 0.2, h - bh - 3, bw * 0.6, Math.max(0, bh));
  });

  ctx.fillStyle = ink.dim;
  ctx.font = `9px ${MONO}`;
  ctx.fillText(`Σ ${people}`, 5, 11);
};

const DRAWERS: Record<ChannelId, Draw> = { depth: drawWave, thermal: drawThermal, radio: drawRadio, crowd: drawCrowd };

function Feed({
  channel,
  id,
  label,
  reading,
  history,
  paused,
}: {
  channel: ChannelId;
  id: string;
  label: string;
  reading?: SensorReading;
  history: number[];
  paused: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const histRef = useRef(history);
  histRef.current = history;
  const readRef = useRef(reading);
  readRef.current = reading;
  const inkRef = useRef<Ink | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!inkRef.current) inkRef.current = readInk();
    let raf = 0;
    let t = 0;
    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(60, rect.width);
      const h = Math.max(40, rect.height);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!paused) t = now;
      DRAWERS[channel](ctx, w, h, t, histRef.current, readRef.current, inkRef.current!);
      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [channel, paused]);

  return (
    <div className="feed">
      <div className="feed__view">
        <canvas ref={canvasRef} className="feed__canvas" aria-hidden="true" />
      </div>
      <div className="feed__top">
        <IconCamera size={11} />
        <span translate="no">{id}</span>
        <span className="feed__rec">
          <i className="dot" style={{ width: 5, height: 5, color: paused ? "var(--ink-4)" : "var(--ok)" }} />
          {paused ? "暂停" : "记录"}
        </span>
      </div>
      <div className="feed__bottom">
        <span className="feed__label">{label}</span>
        <span className="num">{reading ? `${reading.online}/${reading.devices}` : "—"}</span>
      </div>
    </div>
  );
}

export function MonitorPanel({ floorCode, floorLabel, reading, history, paused, onPause }: Props) {
  const [channel, setChannel] = useState<ChannelId>("depth");

  const feeds = useMemo(
    () => [
      { id: `CAM-${floorCode}-01`, label: `${floorLabel} 主厅` },
      { id: `CAM-${floorCode}-02`, label: `${floorLabel} 走廊` },
      { id: `CAM-${floorCode}-04`, label: `${floorLabel} 设备间` },
    ],
    [floorCode, floorLabel],
  );

  return (
    <LiquidGlass className="panel" radius="lg" variant="chrome" refraction={1} elevation={1} fill>
      <div className="panel__head">
        <span className="panel__title">
          <span className="panel__cn">监视器</span>
          <span className="panel__en">Monitor</span>
        </span>
        <span className="panel__spacer" />
        <button
          className={`tbtn tbtn--quiet ${paused ? "tbtn--on" : ""}`}
          onClick={() => onPause(!paused)}
          aria-label={paused ? "继续数据流" : "暂停数据流"}
          aria-pressed={paused}
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
            aria-pressed={channel === c.id}
          >
            {c.cn}
          </button>
        ))}
      </div>

      <div className="panel__body panel__body--flush monitor__body scroll">
        {feeds.map((f) => (
          <div key={f.id} className="feedslot">
            <Feed channel={channel} id={f.id} label={f.label} reading={reading} history={history} paused={paused} />
          </div>
        ))}
      </div>

      <div className="monitor__stats">
        {[
          { k: "在场人数", v: String(reading?.people ?? "—"), warn: false },
          { k: "CO₂", v: String(reading?.co2 ?? "—"), warn: (reading?.co2 ?? 0) > 1000 },
          { k: "负荷", v: reading ? reading.power.toFixed(1) : "—", warn: false },
          { k: "在线点位", v: `${reading?.online ?? 0}/${reading?.devices ?? 0}`, warn: false },
        ].map((s) => (
          <LiquidGlass key={s.k} className="mstat" radius="sm" variant="chrome" refraction={0} over elevation={0} fill>
            <span className="mstat__k">{s.k}</span>
            <span className={`mstat__v ${s.warn ? "mstat__v--warn" : ""}`}>{s.v}</span>
          </LiquidGlass>
        ))}
      </div>
    </LiquidGlass>
  );
}
