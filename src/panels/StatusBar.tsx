import { LiquidGlass } from "../components/LiquidGlass";
import { FLOORS, type SensorReading } from "../data/building";
import type { SimState } from "../hooks/useSimulation";

interface Props {
  sim: SimState;
  selectedFloor: string;
  onSelectFloor: (id: string) => void;
}

type Level = "ok" | "warn" | "alert";

const over_ = (v: number, warn: number, alert: number): Level => (v > alert ? "alert" : v > warn ? "warn" : "ok");
const cls = (l: Level) => (l === "alert" ? "metric__v--alert" : l === "warn" ? "metric__v--warn" : "metric__v--ok");
const tone = (s?: string) => (s === "alert" ? "var(--alert)" : s === "warn" ? "var(--warn)" : "var(--ok)");

/**
 * Bottom status: one glass tile per floor (the requested per-floor sensor state)
 * and a compact whole-building summary, every cell its own pane. The tiles are
 * `over` glass because they sit inside the bar's own material.
 */
export function StatusBar({ sim, selectedFloor, onSelectFloor }: Props) {
  const occupied = FLOORS.reduce((n, f) => n + (sim.readings[f.id]?.people ?? 0), 0);
  const capacity = Math.round(FLOORS.reduce((n, f) => n + f.area, 0) / 12);
  const onlineRate = (sim.online / Math.max(1, sim.devices)) * 100;
  const avgCo2 = FLOORS.reduce((n, f) => n + (sim.readings[f.id]?.co2 ?? 0), 0) / Math.max(1, FLOORS.length);

  return (
    <div className="statusbar" role="group" aria-label="各楼层传感器状态">
      {FLOORS.map((f) => {
        const r: SensorReading | undefined = sim.readings[f.id];
        const on = f.id === selectedFloor;
        return (
          <LiquidGlass
            key={f.id}
            className={`stile ${on ? "stile--on" : ""}`}
            radius="md"
            tone="regular"
            refraction={0}
            over
            elevation={0}
            fill
          >
            <button
              className="stile__hit"
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
                  <span className={`metric__v ${cls(over_(r?.temp ?? 0, 25.6, 27.5))}`}>
                    {r ? r.temp.toFixed(1) : "—"}
                  </span>
                </span>
                <span className="metric">
                  <span className="metric__k">湿度</span>
                  <span className={`metric__v ${cls(over_(r?.rh ?? 0, 60, 66))}`}>{r ? r.rh.toFixed(0) : "—"}</span>
                </span>
                <span className="metric">
                  <span className="metric__k">CO₂</span>
                  <span className={`metric__v ${cls(over_(r?.co2 ?? 0, 880, 1050))}`}>{r?.co2 ?? "—"}</span>
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
          </LiquidGlass>
        );
      })}

      {[
        {
          k: "全楼负荷",
          v: sim.load.toFixed(1),
          u: "kW",
          note: sim.load > 900 ? "峰值区间" : "平稳运行",
        },
        { k: "在场人数", v: String(occupied), u: `/ ${capacity}`, note: `${FLOORS.length} 层汇总` },
        {
          k: "点位在线",
          v: onlineRate.toFixed(1),
          u: "%",
          note: `${sim.online}/${sim.devices} 端点`,
        },
        {
          k: "平均 CO₂",
          v: String(Math.round(avgCo2)),
          u: "ppm",
          note: avgCo2 > 880 ? "需加强新风" : "新风充足",
        },
      ].map((t) => (
        <LiquidGlass key={t.k} className="total" radius="md" tone="thin" refraction={0} over elevation={0} fill>
          <span className="total__k">{t.k}</span>
          <span className="total__v">
            {t.v}
            <i className="total__u">{t.u}</i>
          </span>
          <span className="total__note">{t.note}</span>
        </LiquidGlass>
      ))}
    </div>
  );
}
