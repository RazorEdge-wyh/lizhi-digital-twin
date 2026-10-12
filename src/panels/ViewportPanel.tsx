import { useEffect, useRef, useState } from "react";
import { GlassDivider, LiquidGlass } from "../components/LiquidGlass";
import {
  IconCube,
  IconGrid,
  IconActivity,
  IconEye,
  IconClose,
  IconBack,
} from "../components/Icons";
import { CHANNELS, FLOORS, type ChannelId, type SensorReading } from "../data/building";
import { Sparkline } from "../components/Charts";

export type ViewMode = "model" | "plan" | "data";

interface Props {
  selectedFloor: string;
  onSelectFloor: (id: string) => void;
  readings: Record<string, SensorReading>;
  history: Record<string, number[]>;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  showAll: boolean;
  onToggleAll: () => void;
  focusMode: boolean;
  onFocusMode: (v: boolean) => void;
}

const statusTone = (s?: string) =>
  s === "alert"
    ? { color: "var(--rose)", label: "报警 ALERT" }
    : s === "warn"
      ? { color: "var(--amber)", label: "关注 WATCH" }
      : { color: "var(--mint)", label: "正常 NOMINAL" };

export function ViewportPanel({
  selectedFloor,
  onSelectFloor,
  readings,
  history,
  view,
  onView,
  showAll,
  onToggleAll,
  focusMode,
  onFocusMode,
}: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    // Screen-space bounding box of one floor plate (same camera maths as the
    // CSS): at rotateX(62) rotateZ(-36) a w x d plate projects to
    //   width  = w*cos36 + d*sin36
    //   height = (d*cos36 + w*sin36) * cos62
    const CX = 0.809; // cos 36
    const SX = 0.5878; // sin 36
    const TILT = 0.4695; // cos 62
    const fit = (stageW: number, stageH: number) => {
      const plateW = 560 * CX + 250 * SX;
      const plateH = (250 * CX + 560 * SX) * TILT;
      // 8 storeys spaced 46 scene units apart along Z
      const stackH = 7 * 46 * Math.sin((62 * Math.PI) / 180);
      const byW = (stageW - 44) / plateW;
      const byH = (stageH - 58) / (plateH + stackH);
      return Math.max(0.22, Math.min(1.7, Math.min(byW, byH)));
    };
    const measure = () => setScale(fit(node.clientWidth, node.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const floor = FLOORS.find((f) => f.id === selectedFloor) ?? FLOORS[0];
  const reading = readings[selectedFloor];
  const tone = statusTone(reading?.status);
  const visibleFloors = showAll ? FLOORS : [floor];

  return (
    <LiquidGlass className="viewport" radius="lg" tone="ink" refraction={0.9} blur={16} elevation={2} static fill>
      <div className="viewport__bar">
        <div className="viewport__tabs">
          <button className={`tab ${view === "model" ? "tab--on" : ""}`} onClick={() => onView("model")}>
            <IconCube size={12} /> 三维模型
          </button>
          <button className={`tab ${view === "plan" ? "tab--on" : ""}`} onClick={() => onView("plan")}>
            <IconGrid size={12} /> 平面图
          </button>
          <button className={`tab ${view === "data" ? "tab--on" : ""}`} onClick={() => onView("data")}>
            <IconActivity size={12} /> 数据面板
          </button>
        </div>
        <span className="viewport__spacer" />
        <span className="tag" style={{ color: tone.color, borderColor: "var(--stroke-1)" }}>
          <i className="dot" />
          {tone.label}
        </span>
        <button className={`tbtn ${showAll ? "tbtn--on" : ""}`} onClick={onToggleAll} title="显示全部楼层 / Show all floors">
          <IconEye size={13} /> 全楼
        </button>
        <button className={`tbtn ${focusMode ? "tbtn--on" : ""}`} onClick={() => onFocusMode(!focusMode)} title="聚焦漫游 / Focus">
          {focusMode ? <IconClose size={13} /> : <IconBack size={13} />}
          聚焦
        </button>
      </div>
      <GlassDivider />

      <div
        ref={stageRef}
        className={[
          "viewport__stage",
          view === "plan" ? "viewport__stage--2d" : "",
          view === "data" ? "viewport__stage--telemetry" : "",
          focusMode ? "viewport__stage--focus" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {view === "model" && (
          <>
            <div className="model">
              <div className="model__scene" style={{ ["--model-scale" as string]: scale.toFixed(3) }}>
                <div className="model__plate" />
                {visibleFloors.map((f) => {
                const i = FLOORS.indexOf(f);
                const total = FLOORS.length;
                // storey plates sit 46 scene units apart so the whole building
                // reads as one extruded mass with the selected floor lit
                const spawn = (i - (total - 1) / 2) * 46;
                const status = readings[f.id]?.status;
                return (
                  <div
                    key={f.id}
                    className={[
                      "model__floor",
                      f.id === selectedFloor ? "model__floor--active" : "",
                      status === "alert" ? "model__floor--alert" : status === "warn" ? "model__floor--warn" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ transform: `translate(-50%, -50%) translateZ(${spawn.toFixed(1)}px)` }}
                    onClick={() => onSelectFloor(f.id)}
                    title={`${f.code} ${f.label} · ${f.function}`}
                    aria-label={`${f.code} ${f.label} ${f.en}`}
                  />
                );
                })}
                <div className="model__shell" />
                {showAll && <div className="model__scan" />}
              </div>
            </div>

            {/* screen-space floor legend, stacked to mirror the 3D order */}
            <div className="modellegend">
              {FLOORS.map((f, i) => {
                const st = readings[f.id]?.status;
                return (
                  <button
                    key={f.id}
                    className={`modellegend__item ${f.id === selectedFloor ? "modellegend__item--on" : ""}`}
                    onClick={() => onSelectFloor(f.id)}
                    title={`${f.code} ${f.label} · ${f.en} · ${f.function}`}
                  >
                    <span className="modellegend__code">F{i + 1}</span>
                    <span className="modellegend__name">{f.function}</span>
                    <i
                      className="modellegend__dot"
                      style={{
                        color: st === "alert" ? "var(--rose)" : st === "warn" ? "var(--amber)" : "var(--mint)",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view === "plan" && (
          <div className="plan">
            <div className="plan__frame">
              {floor.zones.flatMap((z) =>
                z.rooms.map((r) => (
                  <div
                    key={`${z.id}-${r.cn}`}
                    className={`plan__room ${z.nodes.some((n) => n.status !== "ok") ? "" : ""}`}
                    style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
                  >
                    {r.cn}
                  </div>
                )),
              )}
              {floor.zones.flatMap((z) =>
                z.nodes.map((n) => (
                  <span
                    key={n.id}
                    className={`plan__node ${n.status === "warn" ? "plan__node--warn" : n.status === "alert" ? "plan__node--alert" : ""}`}
                    style={{ left: `${n.x}%`, top: `${n.y}%` }}
                    title={n.id}
                  />
                )),
              )}
              <span className="plan__scale mono">1 : 200</span>
              <span className="plan__north mono">N ↑</span>
            </div>
          </div>
        )}

        {view === "data" && (
          <div className="datapanel scroll">
            <div className="datapanel__head mono">
              {floor.code} {floor.label} · {floor.en} · 建筑面积 {floor.area} m² · 功能区 {floor.zones.length}
            </div>
            <table className="dtable">
              <thead>
                <tr>
                  <th>点位 Point</th>
                  <th>温度 °C</th>
                  <th>湿度 %RH</th>
                  <th>CO₂ ppm</th>
                  <th>热舒适 PMV</th>
                  <th>趋势 24h</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {floor.zones.flatMap((z) =>
                  z.nodes.map((n, idx) => {
                    const r = readings[floor.id];
                    const jitter = ((n.x + idx * 7) % 12) / 10 - 0.6;
                    const temp = (r?.temp ?? 23) + jitter;
                    const rh = (r?.rh ?? 47) + jitter * 1.6;
                    const co2 = Math.round((r?.co2 ?? 600) + jitter * 120);
                    const pmv = (r?.pmv ?? 0) + jitter * 0.05;
                    return (
                      <tr key={n.id} className={n.status !== "ok" ? `drow--${n.status}` : undefined}>
                        <td className="mono">
                          <i className={`dot ${n.status === "alert" ? "" : ""}`} style={{ color: n.status === "alert" ? "var(--rose)" : n.status === "warn" ? "var(--amber)" : "var(--mint)" }} />{" "}
                          {n.id.toUpperCase()} · {z.cn}
                        </td>
                        <td className="mono">{temp.toFixed(1)}</td>
                        <td className="mono">{rh.toFixed(0)}</td>
                        <td className="mono">{co2}</td>
                        <td className="mono">{pmv.toFixed(2)}</td>
                        <td>
                          <Sparkline points={(history[floor.id] ?? []).slice(-24)} width={70} height={16} />
                        </td>
                        <td>
                          <span className={`tag ${n.status === "alert" ? "tag--alert" : n.status === "warn" ? "tag--warn" : "tag--ok"}`} style={{ height: 17 }}>
                            {n.status === "alert" ? "报警" : n.status === "warn" ? "关注" : "正常"}
                          </span>
                        </td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="viewport__hud">
          <span className="hud__corner hud__corner--tl" />
          <span className="hud__corner hud__corner--tr" />
          <span className="hud__corner hud__corner--bl" />
          <span className="hud__corner hud__corner--br" />
          <div className="hud__readout">
            <span>
              FLOOR <b>{floor.code}</b> · {floor.label}
            </span>
            <span>
              T <b>{reading ? reading.temp.toFixed(1) : "--"}°C</b> · RH <b>{reading ? reading.rh.toFixed(0) : "--"}%</b> · CO₂{" "}
              <b>{reading ? reading.co2 : "--"} ppm</b>
            </span>
            <span>
              OCC <b>{reading?.people ?? "--"}</b> · LOAD <b>{reading ? reading.power.toFixed(1) : "--"} kW</b> · PMV{" "}
              <b>{reading ? reading.pmv.toFixed(2) : "--"}</b>
            </span>
            <span>
              VIEW <b>{view === "model" ? "ISOMETRIC" : view === "plan" ? "ORTHO / PLAN" : "TELEMETRY"}</b> · ZOOM{" "}
              <b>{Math.round(scale * 100)}%</b>
            </span>
          </div>
          <div className="hud__legend">
            <span className="tag tag--ok" style={{ height: 18 }}>
              <i className="dot" /> 正常
            </span>
            <span className="tag tag--warn" style={{ height: 18 }}>
              <i className="dot" /> 关注
            </span>
            <span className="tag tag--alert" style={{ height: 18 }}>
              <i className="dot" /> 报警
            </span>
          </div>
          <svg className="hud__axis" viewBox="0 0 60 60" aria-hidden="true">
            <g stroke="rgba(150,205,240,0.55)" strokeWidth="1.1" fill="none">
              <path d="M14 46V18" />
              <path d="M14 46h30" />
              <path d="M14 46l-9 9" />
              <path d="M14 18l-3 4M14 18l3 4" />
              <path d="M44 46l-4-3M44 46l-4 3" />
              <path d="M5 55l-3-3M5 55l3-3" />
            </g>
            <g fill="rgba(190,225,250,0.8)" fontSize="7" fontFamily="var(--font-mono)">
              <text x="18" y="16">
                Z
              </text>
              <text x="46" y="42">
                Y
              </text>
              <text x="6" y="56">
                X
              </text>
            </g>
          </svg>
        </div>
      </div>
    </LiquidGlass>
  );
}

export const CHANNEL_LIST = CHANNELS;
export type { ChannelId };
