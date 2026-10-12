import { LiquidGlass } from "../components/LiquidGlass";
import { FLOORS, type SensorReading } from "../data/building";
import type { SimState } from "../hooks/useSimulation";

interface Props {
  sim: SimState;
  selectedFloor: string;
  onSelectFloor: (id: string) => void;
}

type Level = "ok" | "warn" | "alert";

const over = (v: number, warn: number, alert: number): Level => (v > alert ? "alert" : v > warn ? "warn" : "ok");
const cls = (l: Level) => (l === "alert" ? "metric__v--alert" : l === "warn" ? "metric__v--warn" : "metric__v--ok");
const tone = (s?: string) => (s === "alert" ? "var(--alert)" : s === "warn" ? "var(--warn)" : "var(--ok)");

/**
 * Bottom status: one column per floor (the requested per-floor sensor state)
 * and a compact whole-building summary. Separators are hairlines; nothing here
 * carries a shadow, a glow or a gradient.
 */
export function StatusBar({ sim, selectedFloor, onSelectFloor }: Props) {
  const occupied = FLOORS.reduce((n, f) => n + (sim.readings[f.id]?.people ?? 0), 0);
  const capacity = Math.round(FLOORS.reduce((n, f) => n + f.area, 0) / 12);
  const onlineRate = (sim.online / Math.max(1, sim.devices)) * 100;
  const avgCo2 = FLOORS.reduce((n, f) => n + (sim.readings[f.id]?.co2 ?? 0), 0) / Math.max(1, FLOORS.length);

  return (
    <LiquidGlass className="statusbar" radius="lg" tone="thick" refraction={0.6} blur={20} elevation={1} fill>
      <div className="statusbar__tiles">
        {FLOORS.map((f) => {
          const r: SensorReading | undefined = sim.readings[f.id];
          const on = f.id === selectedFloor;
          return (
            <button
              key={f.id}
              className={`stile ${on ? "stile--on" : ""}`}
              onClick={() => onSelectFloor(f.id)}
              aria-current={on}
              title={`${f.code} ${f.label} · ${f.en} · ${f.function}`}
            >
              <span className="stile__top">
                <i className="dot" style={{ color: tone(r?.status), width: 5, height: 5 }} />
                <span className="stile__name">{f.label}</span>
                <span className="stile__idx">{f.code}</span>
              </span>
              <span className="stile__metrics">
                <span className="metric">
                  <span className="metric__k">温度</span>
                  <span className={`metric__v ${cls(over(r?.temp ?? 0, 25.6, 27.5))}`}>
                    {r ? r.temp.toFixed(1) : "—"}
                  </span>
                </span>
                <span className="metric">
                  <span className="metric__k">湿度</span>
                  <span className={`metric__v ${cls(over(r?.rh ?? 0, 60, 66))}`}>{r ? r.rh.toFixed(0) : "—"}</span>
                </span>
                <span className="metric">
                  <span className="metric__k">CO₂</span>
                  <span className={`metric__v ${cls(over(r?.co2 ?? 0, 880, 1050))}`}>{r?.co2 ?? "—"}</span>
                </span>
                <span className="metric">
                  <span className="metric__k">人数</span>
                  <span className="metric__v">{r?.people ?? "—"}</span>
                </span>
                <span className="metric">
                  <span className="metric__k">电耗</span>
                  <span className="metric__v">{r ? r.power.toFixed(0) : "—"}</span>
                </span>
                <span className="metric">
                  <span className="metric__k">PMV</span>
                  <span className={`metric__v ${Math.abs(r?.pmv ?? 0) > 0.72 ? "metric__v--warn" : "metric__v--ok"}`}>
                    {r ? r.pmv.toFixed(2) : "—"}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="statusbar__totals">
        <div className="total">
          <span className="total__k">全楼负荷</span>
          <span className="total__v">
            {sim.load.toFixed(1)}
            <i className="total__u">kW</i>
          </span>
        </div>
        <div className="total">
          <span className="total__k">在场人数</span>
          <span className="total__v">
            {occupied}
            <i className="total__u">/ {capacity}</i>
          </span>
        </div>
        <div className="total">
          <span className="total__k">点位在线</span>
          <span className="total__v">
            {onlineRate.toFixed(1)}
            <i className="total__u">%</i>
          </span>
          <span className="total__note">
            {sim.online}/{sim.devices}
          </span>
        </div>
        <div className="total">
          <span className="total__k">平均 CO₂</span>
          <span className="total__v">
            {Math.round(avgCo2)}
            <i className="total__u">ppm</i>
          </span>
        </div>
      </div>
    </LiquidGlass>
  );
}
