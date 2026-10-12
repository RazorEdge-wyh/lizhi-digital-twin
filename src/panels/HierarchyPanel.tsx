import { GlassDivider, LiquidGlass } from "../components/LiquidGlass";
import { IconBuilding, IconChevronRight, IconChip, IconLayers, IconPlus, IconEye } from "../components/Icons";
import { BUILDING, DEVICE_TYPES, FLOORS, type SensorReading } from "../data/building";

interface Props {
  selectedFloor: string;
  onSelectFloor: (id: string) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  readings: Record<string, SensorReading>;
  onFocusFloor: (id: string) => void;
}

const statusClass = (s: string) => (s === "alert" ? "tag--alert" : s === "warn" ? "tag--warn" : "tag--ok");

export function HierarchyPanel({ selectedFloor, onSelectFloor, expanded, onToggle, readings, onFocusFloor }: Props) {
  const focus = readings[selectedFloor];
  const floor = FLOORS.find((f) => f.id === selectedFloor) ?? FLOORS[0];

  return (
    <LiquidGlass className="panel" radius="lg" tone="ink" refraction={0.9} blur={18} elevation={2} static fill>
      <div className="panel__head">
        <IconLayers size={15} />
        <span className="panel__head-cn">层级</span>
        <span className="panel__head-en">Hierarchy</span>
        <span className="panel__head-spacer" />
        <button className="tbtn tbtn--ghost" title="新建楼层 / New floor" style={{ height: 22, padding: "0 6px" }}>
          <IconPlus size={13} />
        </button>
      </div>
      <GlassDivider />

      <div className="panel__body panel__body--flush scroll">
        <div className="tree">
          <div
            className={["tree__row", expanded.has("root") ? "tree__row--open" : ""].filter(Boolean).join(" ")}
            role="treeitem"
            aria-expanded={expanded.has("root")}
            tabIndex={0}
            onClick={() => onToggle("root")}
            onKeyDown={(e) => e.key === "Enter" && onToggle("root")}
          >
            <span className="tree__caret">
              <IconChevronRight size={12} />
            </span>
            <span className="tree__icon">
              <IconBuilding size={14} />
            </span>
            <span className="tree__text">
              <span className="tree__cn">立志楼</span>
              <span className="tree__en">Lizhi Building · {BUILDING.en.split("·").pop()?.trim()}</span>
            </span>
            <span className="tree__meta">
              <i className={`dot ${readings[selectedFloor]?.status === "alert" ? "" : "dot--pulse"}`} />
            </span>
          </div>

          {expanded.has("root") && (
            <div className="tree__children" role="group">
              {FLOORS.map((f) => {
                const r = readings[f.id];
                const isOpen = expanded.has(f.id);
                const isOn = f.id === selectedFloor;
                return (
                  <div key={f.id}>
                    <div
                      className={["tree__row", isOn ? "tree__row--on" : "", isOpen ? "tree__row--open" : ""]
                        .filter(Boolean)
                        .join(" ")}
                      role="treeitem"
                      aria-selected={isOn}
                      aria-expanded={isOpen}
                      tabIndex={0}
                      onClick={() => onSelectFloor(f.id)}
                      onDoubleClick={() => onFocusFloor(f.id)}
                      onKeyDown={(e) => e.key === "Enter" && onSelectFloor(f.id)}
                    >
                      <span
                        className="tree__caret"
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
                        <span className={`tag ${statusClass(r?.status ?? "ok")}`} style={{ height: 17 }}>
                          {r ? `${Math.round(r.temp)}°` : "--"}
                        </span>
                      </span>
                    </div>

                    {isOpen && (
                      <div className="tree__children" role="group">
                        {f.zones.map((z) => {
                          const zoneNodes = z.nodes.length;
                          const worst = z.nodes.some((n) => n.status === "alert")
                            ? "alert"
                            : z.nodes.some((n) => n.status === "warn")
                              ? "warn"
                              : "ok";
                          return (
                            <div
                              key={z.id}
                              className="tree__row tree__row--leaf"
                              role="treeitem"
                              tabIndex={0}
                              onClick={() => onSelectFloor(f.id)}
                            >
                              <span className="tree__caret" />
                              <span className="tree__icon">
                                <IconChip size={13} />
                              </span>
                              <span className="tree__text">
                                <span className="tree__cn">{z.cn}</span>
                                <span className="tree__en">{z.en}</span>
                              </span>
                              <span className="tree__meta">
                                <span className={`dot ${worst === "ok" ? "" : ""}`} style={{ color: worst === "alert" ? "var(--rose)" : worst === "warn" ? "var(--amber)" : "var(--mint)" }} />
                                <span>{zoneNodes}</span>
                              </span>
                            </div>
                          );
                        })}
                        <div className="tree__row tree__row--leaf" role="treeitem" tabIndex={0}>
                          <span className="tree__caret" />
                          <span className="tree__icon">
                            <IconChip size={13} />
                          </span>
                          <span className="tree__text">
                            <span className="tree__cn">传感器组</span>
                            <span className="tree__en">Sensor Array · {f.zones.reduce((n, z) => n + z.nodes.length, 0)} pts</span>
                          </span>
                          <span className="tree__meta">
                            <span>{r?.online ?? 0}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="tree__actions">
        <button className="tbtn" onClick={() => onFocusFloor(selectedFloor)}>
          <IconEye size={13} />
          聚焦
        </button>
        <span style={{ flex: 1 }} />
        <span className="tag" title="所选楼层的监测点位">
          {floor.code} · {focus?.online ?? 0}/{focus?.devices ?? 0}
        </span>
      </div>
    </LiquidGlass>
  );
}

/** Endpoint list shown under the hierarchy when a floor is expanded in the inspector. */
export function DeviceLegend({ reading, floorId }: { reading?: SensorReading; floorId: string }) {
  return (
    <div className="devices">
      {DEVICE_TYPES.slice(0, 5).map((d) => (
        <div className="device" key={d.id}>
          <span className="device__cn">{d.cn}</span>
          <span className="device__v mono">
            {reading ? Number(reading[d.source]).toFixed(d.id === "people" ? 0 : 1) : "--"}
            <i>{d.unit}</i>
          </span>
        </div>
      ))}
      <span className="device__id mono">{floorId.toUpperCase()}-SENSOR-BUS/A1</span>
    </div>
  );
}
