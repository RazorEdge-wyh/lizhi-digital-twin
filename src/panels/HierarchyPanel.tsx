import { GlassDivider, LiquidGlass } from "../components/LiquidGlass";
import { IconBuilding, IconChevronRight, IconChip, IconLayers, IconPlus } from "../components/Icons";
import { DEVICE_TYPES, FLOORS, type SensorReading } from "../data/building";

interface Props {
  selectedFloor: string;
  onSelectFloor: (id: string) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  readings: Record<string, SensorReading>;
}

const statusTone = (s?: string) =>
  s === "alert" ? "var(--alert)" : s === "warn" ? "var(--warn)" : "var(--ok)";
/** feeds the `.tag--ok|warn|alert` modifiers */
const statusKind = (s?: string) => (s === "alert" ? "alert" : s === "warn" ? "warn" : "ok");

/**
 * Hierarchy tree: building → floor → functional zone → sensor group.
 * Selecting a floor is the only action; rows are real buttons so they are
 * keyboard reachable and announce their selected state.
 */
export function HierarchyPanel({ selectedFloor, onSelectFloor, expanded, onToggle, readings }: Props) {
  const reading = readings[selectedFloor];
  const floor = FLOORS.find((f) => f.id === selectedFloor) ?? FLOORS[0];

  return (
    <LiquidGlass className="panel" radius="lg" tone="thick" refraction={0.7} blur={20} elevation={1} fill>
      <div className="panel__head">
        <span className="panel__title">
          <span className="panel__cn">层级</span>
          <span className="panel__en">Hierarchy</span>
        </span>
        <span className="panel__spacer" />
        <button className="tbtn tbtn--quiet" aria-label="新建楼层" title="新建楼层">
          <IconPlus size={13} />
        </button>
      </div>
      <GlassDivider />

      <div className="panel__body panel__body--flush scroll">
        <div className="tree">
          <button
            className={`tree__row ${expanded.has("root") ? "tree__row--open" : ""}`}
            onClick={() => onToggle("root")}
            aria-expanded={expanded.has("root")}
          >
            <span className="tree__caret">
              <IconChevronRight size={12} />
            </span>
            <span className="tree__icon">
              <IconBuilding size={14} />
            </span>
            <span className="tree__text">
              <span className="tree__cn">立志楼</span>
              <span className="tree__en">8F + B1</span>
            </span>
            <span className="tree__meta" />
          </button>

          {expanded.has("root") && (
            <div className="tree__children">
              {FLOORS.map((f) => {
                const r = readings[f.id];
                const isOpen = expanded.has(f.id);
                const isOn = f.id === selectedFloor;
                return (
                  <div key={f.id}>
                    <button
                      className={["tree__row", isOn ? "tree__row--on" : "", isOpen ? "tree__row--open" : ""]
                        .filter(Boolean)
                        .join(" ")}
                      aria-current={isOn}
                      onClick={() => onSelectFloor(f.id)}
                    >
                      <span
                        className="tree__caret"
                        role="presentation"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggle(f.id);
                        }}
                      >
                        <IconChevronRight size={12} />
                      </span>
                      <span className="tree__icon">
                        <IconLayers size={13} />
                      </span>
                      <span className="tree__text">
                        <span className="tree__cn">
                          {f.code} · {f.label}
                        </span>
                        <span className="tree__en">{f.function}</span>
                      </span>
                      <span className="tree__meta">
                        <span className={`tag tag--${statusKind(r?.status)}`} style={{ height: 17, padding: "0 6px" }}>
                          {r ? `${r.temp.toFixed(0)}°` : "—"}
                        </span>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="tree__children">
                        {f.zones.map((z) => {
                          const worst = z.nodes.some((n) => n.status === "alert")
                            ? "alert"
                            : z.nodes.some((n) => n.status === "warn")
                              ? "warn"
                              : "ok";
                          return (
                            <button key={z.id} className="tree__row tree__row--leaf" onClick={() => onSelectFloor(f.id)}>
                              <span className="tree__caret" />
                              <span className="tree__icon">
                                <IconChip size={13} />
                              </span>
                              <span className="tree__text">
                                <span className="tree__cn">{z.cn}</span>
                                <span className="tree__en">{z.en}</span>
                              </span>
                              <span className="tree__meta">
                                <i className="dot" style={{ color: statusTone(worst), width: 5, height: 5 }} />
                              </span>
                            </button>
                          );
                        })}
                        <button className="tree__row tree__row--leaf" onClick={() => onSelectFloor(f.id)}>
                          <span className="tree__caret" />
                          <span className="tree__icon">
                            <IconChip size={13} />
                          </span>
                          <span className="tree__text">
                            <span className="tree__cn">传感器组</span>
                            <span className="tree__en">{f.zones.reduce((n, z) => n + z.nodes.length, 0)} pts</span>
                          </span>
                          <span className="tree__meta">
                            <span className="num" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
                              {r ? `${r.online}/${r.devices}` : "—"}
                            </span>
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* the selected floor's headline readings, one hairline from the tree */}
      <div className="panel__body" style={{ flex: "none", padding: "7px 10px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 10.5, color: "var(--ink-4)", letterSpacing: "0.08em" }}>
            {floor.code} · {floor.en}
          </span>
          <span className="num" style={{ fontSize: 11, color: "var(--ink-2)" }}>
            {reading?.online ?? 0}/{reading?.devices ?? 0} 在线
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 4, marginTop: 6 }}>
          {DEVICE_TYPES.slice(0, 3).map((d) => (
            <div key={d.id} style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 9.5, color: "var(--ink-4)" }}>{d.cn}</span>
              <span className="num" style={{ fontSize: 13, color: "var(--ink-0)" }}>
                {reading ? Number(reading[d.source]).toFixed(d.id === "people" ? 0 : 1) : "—"}
                <span style={{ fontSize: 9.5, color: "var(--ink-4)", marginLeft: 2 }}>{d.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </LiquidGlass>
  );
}
