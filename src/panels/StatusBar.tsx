import { LiquidGlass } from "../components/LiquidGlass";
import { IconActivity, IconDroplet, IconPower, IconSun, IconThermo, IconUsers, IconWifi } from "../components/Icons";
import { FLOORS, type SensorReading } from "../data/building";
import { Sparkline } from "../components/Charts";
import type { SimState } from "../hooks/useSimulation";

interface Props {
  sim: SimState;
  selectedFloor: string;
  onSelectFloor: (id: string) => void;
}

const level = (v: number, warn: number, alert: number, invert = false) => {
  if (invert) {
    if (v < alert) return "alert";
    if (v < warn) return "warn";
    return "ok";
  }
  if (v > alert) return "alert";
  if (v > warn) return "warn";
  return "ok";
};

const cls = (s: string) => (s === "alert" ? "metric__v--alert" : s === "warn" ? "metric__v--warn" : "metric__v--ok");

export function StatusBar({ sim, selectedFloor, onSelectFloor }: Props) {
  const occupied = FLOORS.reduce((n, f) => n + (sim.readings[f.id]?.people ?? 0), 0);
  const onlineRate = (sim.online / Math.max(1, sim.devices)) * 100;
  const avgCo2 =
    FLOORS.reduce((n, f) => n + (sim.readings[f.id]?.co2 ?? 0), 0) / Math.max(1, FLOORS.length);

  return (
    <LiquidGlass className="statusbar" radius="lg" tone="ink" refraction={0.7} blur={18} elevation={2} static fill>
      <div className="statusbar__tiles">
        {FLOORS.map((f) => {
          const r: SensorReading | undefined = sim.readings[f.id];
          const on = f.id === selectedFloor;
          const tempLevel = level(r?.temp ?? 0, 25.6, 27.5);
          const co2Level = level(r?.co2 ?? 0, 880, 1050);
          const rhLevel = level(r?.rh ?? 0, 60, 66);
          return (
            <button
              key={f.id}
              className={`stile ${on ? "stile--on" : ""}`}
              onClick={() => onSelectFloor(f.id)}
              title={`${f.code} ${f.label} · ${f.en} · ${f.function}`}
            >
              <span className="stile__top">
                <span className={`dot ${r?.status === "ok" ? "dot--pulse" : ""}`} style={{ color: r?.status === "alert" ? "var(--rose)" : r?.status === "warn" ? "var(--amber)" : "var(--mint)" }} />
                <span className="stile__name">
                  {f.code} {f.label}
                </span>
                <span className="stile__idx">{r ? `${r.online}/${r.devices}` : "--"}</span>
              </span>
              <span className="stile__metrics">
                <span className="metric">
                  <span className="metric__k">温度</span>
                  <span className={`metric__v ${cls(tempLevel)}`}>{r ? r.temp.toFixed(1) : "--"}°C</span>
                </span>
                <span className="metric">
                  <span className="metric__k">湿度</span>
                  <span className={`metric__v ${cls(rhLevel)}`}>{r ? r.rh.toFixed(0) : "--"}%</span>
                </span>
                <span className="metric">
                  <span className="metric__k">CO₂</span>
                  <span className={`metric__v ${cls(co2Level)}`}>{r?.co2 ?? "--"}</span>
                </span>
                <span className="metric">
                  <span className="metric__k">人数</span>
                  <span className="metric__v">{r?.people ?? "--"}</span>
                </span>
                <span className="metric">
                  <span className="metric__k">电耗</span>
                  <span className="metric__v">{r ? r.power.toFixed(1) : "--"}kW</span>
                </span>
                <span className="metric">
                  <span className="metric__k">PMV</span>
                  <span className={`metric__v ${Math.abs(r?.pmv ?? 0) > 0.72 ? "metric__v--warn" : "metric__v--ok"}`}>
                    {r ? r.pmv.toFixed(2) : "--"}
                  </span>
                </span>
              </span>
              <span className="stile__spark">
                <Sparkline
                  points={(sim.history[f.id] ?? []).slice(-30)}
                  width={92}
                  height={18}
                  stroke={r?.status === "alert" ? "var(--rose)" : r?.status === "warn" ? "var(--amber)" : "var(--cyan)"}
                  fill="transparent"
                  marker={false}
                />
              </span>
            </button>
          );
        })}
      </div>

      <div className="statusbar__totals">
        <div className="total" title="整栋建筑实时电负荷 / Whole-building electrical load">
          <span className="total__k">
            <IconPower size={11} /> 全楼负荷
          </span>
          <span className="total__v">
            {sim.load.toFixed(1)}
            <i className="total__u">kW</i>
          </span>
          <span className="total__delta">
            <IconActivity size={10} /> {sim.load > 900 ? "峰值区间" : "平稳运行"}
          </span>
        </div>
        <div className="total" title="在场总人数 / Total occupancy">
          <span className="total__k">
            <IconUsers size={11} /> 在场人数
          </span>
          <span className="total__v">
            {occupied}
            <i className="total__u">人</i>
          </span>
          <span className="total__delta">
            / 容量 {Math.round(FLOORS.reduce((n, f) => n + f.area, 0) / 12)}
          </span>
        </div>
        <div className="total" title="点位在线率 / Endpoint availability">
          <span className="total__k">
            <IconWifi size={11} /> 在线率
          </span>
          <span className="total__v">
            {onlineRate.toFixed(1)}
            <i className="total__u">%</i>
          </span>
          <span className={`total__delta ${sim.online < sim.devices ? "total__delta--down" : ""}`}>
            {sim.online}/{sim.devices} 端点
          </span>
        </div>
        <div className="total" title="平均二氧化碳浓度 / Mean CO₂">
          <span className="total__k">
            <IconDroplet size={11} /> 平均 CO₂
          </span>
          <span className="total__v">
            {Math.round(avgCo2)}
            <i className="total__u">ppm</i>
          </span>
          <span className={`total__delta ${avgCo2 > 880 ? "total__delta--down" : ""}`}>
            <IconThermo size={10} /> {avgCo2 > 880 ? "需加强新风" : "新风充足"}
          </span>
        </div>
        <div className="total" title="屋面光伏出力 / Rooftop PV generation">
          <span className="total__k">
            <IconSun size={11} /> 光伏出力
          </span>
          <span className="total__v">
            {sim.pv.toFixed(1)}
            <i className="total__u">kW</i>
          </span>
          <span className="total__delta">阵列待接入</span>
        </div>
      </div>
    </LiquidGlass>
  );
}
