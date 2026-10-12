import { useEffect, useRef, useState } from "react";
import { GlassDivider, LiquidGlass } from "../components/LiquidGlass";
import { IconActivity, IconCube, IconGrid } from "../components/Icons";
import { FLOORS, type SensorReading } from "../data/building";

export type ViewMode = "model" | "plan" | "data";

interface Props {
  selectedFloor: string;
  onSelectFloor: (id: string) => void;
  readings: Record<string, SensorReading>;
  view: ViewMode;
  onView: (v: ViewMode) => void;
}

const statusTone = (s?: string) =>
  s === "alert" ? "var(--alert)" : s === "warn" ? "var(--warn)" : "var(--ok)";
const statusText = (s?: string) => (s === "alert" ? "报警" : s === "warn" ? "关注" : "正常");

/**
 * Viewport: isometric storey stack, floor plan, or the raw telemetry table.
 * No HUD furniture, no scan lines — only the drawing, its tabs and one status
 * readout. The per-storey list sits in normal DOM flow: text inside a rotated
 * `preserve-3d` ancestor renders skewed, so it cannot live in the 3D scene.
 */
export function ViewportPanel({ selectedFloor, onSelectFloor, readings, view, onView }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    // Screen-space bounding box of one floor plate, mirroring the CSS camera:
    //   width  = w*cos36 + d*sin36
    //   height = (d*cos36 + w*sin36) * cos62
    const CX = 0.809;
    const SX = 0.5878;
    const TILT = 0.4695;
    const fit = (stageW: number, stageH: number) => {
      const plateW = 560 * CX + 250 * SX;
      const plateH = (250 * CX + 560 * SX) * TILT;
      const stackH = 7 * 46 * Math.sin((62 * Math.PI) / 180);
      const byW = (stageW - 200) / plateW; // leave room for the storey list
      const byH = (stageH - 52) / (plateH + stackH);
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

  return (
    <LiquidGlass className="viewport" radius="lg" variant="chrome" refraction={1} elevation={1} fill>
      <div className="viewport__bar">
        <div className="viewport__tabs">
          <button className={`tab ${view === "model" ? "tab--on" : ""}`} onClick={() => onView("model")}>
            <IconCube size={12} /> 模型
          </button>
          <button className={`tab ${view === "plan" ? "tab--on" : ""}`} onClick={() => onView("plan")}>
            <IconGrid size={12} /> 平面
          </button>
          <button className={`tab ${view === "data" ? "tab--on" : ""}`} onClick={() => onView("data")}>
            <IconActivity size={12} /> 数据
          </button>
        </div>
        <span className="viewport__spacer" />
        <span className="tag">
          <i className="dot" style={{ color: statusTone(reading?.status) }} />
          {statusText(reading?.status)}
        </span>
        <span className="num" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
          {floor.code}
        </span>
      </div>
      <GlassDivider />

      <div ref={stageRef} className="viewport__stage">
        {view === "model" && (
          <>
            <div className="model">
              <div className="model__scene" style={{ ["--model-scale" as string]: scale.toFixed(3) }}>
                {FLOORS.map((f) => {
                  const i = FLOORS.indexOf(f);
                  const spawn = (i - (FLOORS.length - 1) / 2) * 46;
                  const status = readings[f.id]?.status;
                  return (
                    <button
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
                      aria-label={`${f.code} ${f.label} ${f.en}`}
                      aria-current={f.id === selectedFloor}
                    />
                  );
                })}
              </div>
            </div>

            <div className="floorlist">
              {FLOORS.map((f, i) => (
                <button
                  key={f.id}
                  className={`floorlist__item ${f.id === selectedFloor ? "floorlist__item--on" : ""}`}
                  onClick={() => onSelectFloor(f.id)}
                  aria-current={f.id === selectedFloor}
                  title={`${f.code} ${f.label} · ${f.en}`}
                >
                  <span className="floorlist__code">F{i + 1}</span>
                  <span className="floorlist__name">{f.function}</span>
                  <i className="floorlist__dot" style={{ color: statusTone(readings[f.id]?.status) }} />
                </button>
              ))}
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
                    className="plan__room"
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
                    className={[
                      "plan__node",
                      n.status === "warn" ? "plan__node--warn" : n.status === "alert" ? "plan__node--alert" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ left: `${n.x}%`, top: `${n.y}%` }}
                    title={n.id}
                  />
                )),
              )}
              <span className="plan__scale">1 : 200</span>
              <span className="plan__north">N ↑</span>
            </div>
          </div>
        )}

        {view === "data" && (
          <div className="datapanel scroll">
            <table className="dtable">
              <thead>
                <tr>
                  <th>点位</th>
                  <th>温度 °C</th>
                  <th>湿度 %</th>
                  <th>CO₂ ppm</th>
                  <th>PMV</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {floor.zones.flatMap((z) =>
                  z.nodes.map((n, idx) => {
                    const r = readings[floor.id];
                    const jitter = ((n.x + idx * 7) % 12) / 10 - 0.6;
                    return (
                      <tr key={n.id}>
                        <td>
                          <span className="dtable__point">
                            <i className="dot" style={{ color: statusTone(n.status), width: 5, height: 5 }} />
                            {z.cn}
                          </span>
                        </td>
                        <td className="num">{((r?.temp ?? 23) + jitter).toFixed(1)}</td>
                        <td className="num">{((r?.rh ?? 47) + jitter * 1.6).toFixed(0)}</td>
                        <td className="num">{Math.round((r?.co2 ?? 600) + jitter * 120)}</td>
                        <td className="num">{((r?.pmv ?? 0) + jitter * 0.05).toFixed(2)}</td>
                        <td>
                          <span
                            className={`tag ${
                              n.status === "alert" ? "tag--alert" : n.status === "warn" ? "tag--warn" : "tag--ok"
                            }`}
                          >
                            {statusText(n.status)}
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

        {/* viewfinder chrome + orientation gizmo: this is what makes the centre
            read as an editor viewport rather than an empty box. Four corner
            ticks and an axis triad — no scan lines, no glow. */}
        {view !== "data" && (
          <div className="viewport__hud" aria-hidden="true">
            <span className="hud__corner hud__corner--tl" />
            <span className="hud__corner hud__corner--tr" />
            <span className="hud__corner hud__corner--bl" />
            <span className="hud__corner hud__corner--br" />

            <div className="hud__readout">
              <span>
                FLOOR <b>{floor.code}</b> · {floor.label}
              </span>
              <span>
                T <b>{reading ? reading.temp.toFixed(1) : "—"}°C</b> · RH{" "}
                <b>{reading ? reading.rh.toFixed(0) : "—"}%</b> · CO₂ <b>{reading?.co2 ?? "—"} ppm</b>
              </span>
              <span>
                OCC <b>{reading?.people ?? "—"}</b> · LOAD <b>{reading ? reading.power.toFixed(1) : "—"} kW</b>
              </span>
            </div>

            <svg className="hud__axis" viewBox="0 0 60 60">
              <g stroke="currentColor" strokeWidth="1.1" fill="none" opacity="0.66">
                <path d="M14 46V18" />
                <path d="M14 46h30" />
                <path d="M14 46l-9 9" />
                <path d="M14 18l-3 4M14 18l3 4" />
                <path d="M44 46l-4-3M44 46l-4 3" />
                <path d="M5 55l-3-3M5 55l3-3" />
              </g>
              <g fill="currentColor" fontSize="7" fontFamily="var(--font-mono)" opacity="0.8">
                <text x="18" y="16">
                  Z
                </text>
                <text x="46" y="42">
                  Y
                </text>
                <text x="4" y="56">
                  X
                </text>
              </g>
            </svg>
          </div>
        )}
      </div>
    </LiquidGlass>
  );
}
