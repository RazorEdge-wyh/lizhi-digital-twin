import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlassDivider, LiquidGlass } from "../components/LiquidGlass";
import {
  IconActivity,
  IconBack,
  IconCamera,
  IconChip,
  IconExport,
  IconEye,
  IconFilePlus,
  IconFolder,
  IconGrid,
  IconInfo,
  IconLayers,
  IconRadar,
  IconSave,
  IconUndo,
} from "../components/Icons";
import { BUILDING, FLOORS } from "../data/building";
import { useBuildingSimulation, useInterval } from "../hooks/useSimulation";
import { HierarchyPanel } from "../panels/HierarchyPanel";
import { MonitorPanel } from "../panels/MonitorPanel";
import { StatusBar } from "../panels/StatusBar";
import { ViewportPanel, type ViewMode } from "../panels/ViewportPanel";

interface Props {
  onExit: () => void;
  /** false while the workspace is hidden behind the landing screen */
  active: boolean;
}

interface Toast {
  id: number;
  cn: string;
  en: string;
  tone: "ok" | "warn";
}

interface MenuItem {
  cn: string;
  en: string;
  key?: string;
  icon: React.ReactNode;
  run?: () => void;
  disabled?: boolean;
}

/** Modal for 项目 → 新建 / 打开. An opaque pane: it must be read against
 *  whatever it covers, so it does not rely on backdrop sampling. */
function ProjectModal({
  mode,
  onClose,
  onSubmit,
}: {
  mode: "new" | "open";
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(mode === "new" ? "lizhi-building-2024" : "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <LiquidGlass className="modal__card" radius="xl" variant="chrome" refraction={0} solid elevation={2} fill>
        <div className="modal__title">
          <span className="modal__title-cn">{mode === "new" ? "新建项目" : "打开项目"}</span>
          <span className="modal__title-en">{mode === "new" ? "New Project" : "Open Project"}</span>
        </div>
        <GlassDivider />
        <label className="field">
          <span className="field__label">
            <b>项目名称</b> · Project name
          </span>
          <input
            ref={inputRef}
            className="input"
            name="project-name"
            autoComplete="off"
            spellCheck={false}
            value={name}
            placeholder="lizhi-building-2024"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onSubmit(name.trim());
            }}
          />
        </label>
        <div className="modal__row">
          <label className="field">
            <span className="field__label">
              <b>楼层数</b> · Floors
            </span>
            <input className="input" value={`${BUILDING.floors} + B${BUILDING.basement}`} readOnly />
          </label>
          <label className="field">
            <span className="field__label">
              <b>点位规模</b> · Endpoints
            </span>
            <input className="input" value="1 004" readOnly />
          </label>
        </div>
        <div className="modal__actions">
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn--primary" disabled={!name.trim()} onClick={() => name.trim() && onSubmit(name.trim())}>
            {mode === "new" ? "创建" : "打开"}
          </button>
        </div>
      </LiquidGlass>
    </div>
  );
}

export function Workspace({ onExit, active }: Props) {
  const [paused, setPaused] = useState(false);
  const [view, setView] = useState<ViewMode>("model");
  const [selectedFloor, setSelectedFloor] = useState("f5");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["root", "f5"]));
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | "open" | null>(null);
  const [projectName, setProjectName] = useState("lizhi-building-2024");
  const [savedAt, setSavedAt] = useState<string>("─");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [panels, setPanels] = useState({ hierarchy: true, monitor: true, status: true });
  const [entered, setEntered] = useState(false);

  const sim = useBuildingSimulation(paused || !active);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const toast = useCallback((cn: string, en: string, tone: "ok" | "warn" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, cn, en, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  useInterval(() => setToasts((t) => (t.length ? t.slice(1) : t)), 3200, toasts.length > 0);

  const toggleFloor = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectFloor = useCallback((id: string) => {
    setSelectedFloor(id);
    setExpanded((prev) => new Set(prev).add(id).add("root"));
  }, []);

  const saveProject = useCallback(() => {
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setSavedAt(stamp);
    toast("项目已保存", "Project saved", "ok");
  }, [toast]);

  const exportSnapshot = useCallback(() => {
    const payload = {
      project: projectName,
      generatedAt: new Date().toISOString(),
      building: BUILDING,
      floor: selectedFloor,
      readings: sim.readings,
      totals: { load: +sim.load.toFixed(2), people: sim.people, devices: sim.devices, online: sim.online },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}-snapshot.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("已导出运行快照", "Snapshot exported", "ok");
  }, [projectName, selectedFloor, sim, toast]);

  const importScene = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.ifc,.gltf,.glb";
    input.onchange = () => toast("模型导入队列已接收", "Import queued", "warn");
    input.click();
  }, [toast]);

  const menus = useMemo<Record<string, MenuItem[]>>(
    () => ({
      项目: [
        { cn: "新建场景", en: "New", key: "⌘N", icon: <IconFilePlus size={14} />, run: () => setModal("new") },
        { cn: "打开项目", en: "Open", key: "⌘O", icon: <IconFolder size={14} />, run: () => setModal("open") },
        { cn: "保存场景", en: "Save", key: "⌘S", icon: <IconSave size={14} />, run: saveProject },
        { cn: "导入模型", en: "Import", icon: <IconExport size={14} />, run: importScene },
        { cn: "导出运行快照", en: "Export", icon: <IconExport size={14} />, run: exportSnapshot },
        { cn: "返回入口页", en: "Landing", icon: <IconBack size={14} />, run: onExit },
      ],
      视图: [
        { cn: "三维模型", en: "Isometric", key: "M", icon: <IconGrid size={14} />, run: () => setView("model") },
        { cn: "平面图", en: "Plan", key: "P", icon: <IconLayers size={14} />, run: () => setView("plan") },
        { cn: "数据面板", en: "Telemetry", key: "D", icon: <IconActivity size={14} />, run: () => setView("data") },
        {
          cn: "层级面板",
          en: "Hierarchy",
          icon: <IconEye size={14} />,
          run: () => setPanels((p) => ({ ...p, hierarchy: !p.hierarchy })),
        },
        {
          cn: "监视器",
          en: "Monitor",
          icon: <IconCamera size={14} />,
          run: () => setPanels((p) => ({ ...p, monitor: !p.monitor })),
        },
        {
          cn: "状态栏",
          en: "Status bar",
          icon: <IconActivity size={14} />,
          run: () => setPanels((p) => ({ ...p, status: !p.status })),
        },
      ],
      监测: [
        {
          cn: paused ? "继续数据流" : "暂停数据流",
          en: paused ? "Resume" : "Pause",
          key: "Space",
          icon: <IconActivity size={14} />,
          run: () => setPaused((v) => !v),
        },
        {
          cn: "刷新读数",
          en: "Refresh",
          key: "R",
          icon: <IconUndo size={14} />,
          run: () => toast("已请求全量读数", "Polling endpoints", "ok"),
        },
        {
          cn: "点位自检",
          en: "Self-test",
          icon: <IconChip size={14} />,
          run: () => toast(`自检完成 · ${sim.online}/${sim.devices} 在线`, "Diagnostics complete", "ok"),
        },
        {
          cn: "告警订阅",
          en: "Alerts",
          icon: <IconRadar size={14} />,
          run: () => toast(`${sim.alerts} 报警 · ${sim.warns} 关注`, "Alert summary", sim.alerts ? "warn" : "ok"),
        },
      ],
      帮助: [
        {
          cn: "快捷键",
          en: "Shortcuts",
          icon: <IconInfo size={14} />,
          run: () => toast("1-8 楼层 · M/P/D 视图 · 空格 暂停 · Esc 返回", "Shortcuts", "ok"),
        },
        {
          cn: "关于本面板",
          en: "About",
          icon: <IconInfo size={14} />,
          run: () => toast("立志楼数字孪生 v1.0 · 数据为仿真", "Demo data", "warn"),
        },
      ],
    }),
    [exportSnapshot, importScene, onExit, paused, saveProject, sim.alerts, sim.devices, sim.online, sim.warns, toast],
  );

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "Escape") {
        if (modal) setModal(null);
        else if (openMenu) setOpenMenu(null);
        else onExit();
        return;
      }
      const k = e.key.toLowerCase();
      if (e.code === "Space") {
        e.preventDefault();
        setPaused((v) => !v);
        return;
      }
      if (k >= "1" && k <= "8") {
        const f = FLOORS[Number(k) - 1];
        if (f) selectFloor(f.id);
      } else if (k === "m") setView("model");
      else if (k === "p") setView("plan");
      else if (k === "d") setView("data");
      else if (k === "r") toast("已请求全量读数", "Polling endpoints", "ok");
      else if (k === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveProject();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, onExit, openMenu, saveProject, selectFloor, toast]);

  // dismiss menus on outside click
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  const floor = FLOORS.find((f) => f.id === selectedFloor) ?? FLOORS[0];
  const reading = sim.readings[selectedFloor];

  return (
    <div className={`ws ${entered ? "ws--in" : ""}`} aria-label="立志楼细节控制台">
      <div className="ws__bg" aria-hidden="true" />

      {/* ---- menu bar ---------------------------------------------------- */}
      <LiquidGlass className="menubar" radius="lg" variant="chrome" refraction={1} elevation={1}>
        <span className="menubar__left">
          <span className="menubar__name">
            <span className="menubar__name-cn">立志楼</span>
            <span className="menubar__name-en">Digital Twin</span>
          </span>
          <GlassDivider vertical />
          <div className="menubar__menus" ref={menuWrapRef}>
            {Object.entries(menus).map(([label, items]) => (
              <div className="menubar__menu" key={label}>
                <button
                  className={`tbtn ${openMenu === label ? "tbtn--on" : ""}`}
                  onClick={() => setOpenMenu((m) => (m === label ? null : label))}
                  aria-haspopup="menu"
                  aria-expanded={openMenu === label}
                >
                  {label}
                </button>
                {openMenu === label && (
                  <LiquidGlass className="menu" radius="md" variant="chrome" refraction={0} solid elevation={2}>
                    <div className="menu__list" role="menu">
                      {items.map((item, i) => (
                        <button
                          key={`${label}-${i}`}
                          className="menu__item"
                          role="menuitem"
                          disabled={item.disabled}
                          onClick={() => {
                            item.run?.();
                            setOpenMenu(null);
                          }}
                        >
                          {item.icon}
                          <span className="menu__label">
                            <span className="menu__cn">{item.cn}</span>
                            <span className="menu__en">{item.en}</span>
                          </span>
                          {item.key && <span className="menu__key">{item.key}</span>}
                        </button>
                      ))}
                    </div>
                  </LiquidGlass>
                )}
              </div>
            ))}
          </div>
        </span>

        <span className="menubar__center">
          <LiquidGlass className="menubar__pill" radius="sm" variant="chrome" refraction={0} over elevation={0}>
            <span className="menubar__doc">
              <span className="menubar__doc-name">{projectName}</span>
              <span className="menubar__doc-path" translate="no">
                /scenes/lizhi/{floor.id}.scene
              </span>
            </span>
          </LiquidGlass>

          <LiquidGlass className="menubar__pill" radius="sm" variant="chrome" refraction={0} over elevation={0}>
            <span className="tag" title="上次保存时间">
              保存 {savedAt}
            </span>
            {sim.alerts > 0 && (
              <span className="tag tag--alert">
                <i className="dot" /> {sim.alerts} 报警
              </span>
            )}
          </LiquidGlass>
        </span>

        <span className="menubar__right">
          <LiquidGlass className="menubar__actions" radius="sm" variant="chrome" refraction={0} over elevation={0}>
            <button
              className={`tbtn ${paused ? "tbtn--on" : ""}`}
              onClick={() => setPaused((v) => !v)}
              aria-pressed={paused}
            >
              {paused ? "已暂停" : "实时"}
            </button>
            <button className="tbtn" onClick={saveProject}>
              保存
            </button>
            <button className="tbtn" onClick={onExit} title="返回入口页 (Esc)">
              退出
            </button>
          </LiquidGlass>
        </span>
      </LiquidGlass>

      {/* ---- middle row --------------------------------------------------- */}
      <div className="ws__middle">
        <div className="ws__left" style={{ display: panels.hierarchy ? undefined : "none" }}>
          <HierarchyPanel
            selectedFloor={selectedFloor}
            onSelectFloor={selectFloor}
            expanded={expanded}
            onToggle={toggleFloor}
            readings={sim.readings}
          />
        </div>

        <div className="ws__center">
          <ViewportPanel
            selectedFloor={selectedFloor}
            onSelectFloor={selectFloor}
            readings={sim.readings}
            view={view}
            onView={setView}
          />
        </div>

        <div className="ws__right" style={{ display: panels.monitor ? undefined : "none" }}>
          <MonitorPanel
            floorCode={floor.code}
            floorLabel={floor.label}
            reading={reading}
            history={sim.history[selectedFloor] ?? []}
            paused={paused || !active}
            onPause={setPaused}
          />
        </div>
      </div>

      {/* ---- bottom ------------------------------------------------------ */}
      {panels.status && <StatusBar sim={sim} selectedFloor={selectedFloor} onSelectFloor={selectFloor} />}

      {/* ---- toasts ------------------------------------------------------ */}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <LiquidGlass key={t.id} className="toast" radius="md" variant="chrome" refraction={0} solid elevation={1}>
            <i className="dot" style={{ color: t.tone === "warn" ? "var(--warn)" : "var(--ok)" }} />
            <span className="toast__cn">{t.cn}</span>
            <span className="toast__en">{t.en}</span>
          </LiquidGlass>
        ))}
      </div>

      {modal && (
        <ProjectModal
          mode={modal}
          onClose={() => setModal(null)}
          onSubmit={(name) => {
            setProjectName(name);
            setModal(null);
            toast(modal === "new" ? `已创建 ${name}` : `已打开 ${name}`, modal === "new" ? "Created" : "Opened", "ok");
          }}
        />
      )}
    </div>
  );
}
