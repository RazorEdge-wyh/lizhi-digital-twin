import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlassDivider, LiquidGlass } from "../components/LiquidGlass";
import {
  IconActivity,
  IconBack,
  IconCamera,
  IconChip,
  IconClose,
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
  MarkLizhi,
} from "../components/Icons";
import { BUILDING, FLOORS } from "../data/building";
import { useBuildingSimulation, useInterval } from "../hooks/useSimulation";
// bundler-resolved backdrop art (see Landing.tsx for the same pattern)
import workspaceArt from "../assets/art/lizhi-workspace.jpg?url";
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

/** Modal for 项目 → 新建 / 打开. */
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
      <LiquidGlass className="modal__card" radius="xl" tone="ink" refraction={1.2} blur={22} elevation={3} static fill>
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
            取消 Cancel
          </button>
          <button className="btn btn--primary" disabled={!name.trim()} onClick={() => name.trim() && onSubmit(name.trim())}>
            {mode === "new" ? "创建 Create" : "打开 Open"}
          </button>
        </div>
      </LiquidGlass>
    </div>
  );
}

export function Workspace({ onExit, active }: Props) {
  const [paused, setPaused] = useState(false);
  const [view, setView] = useState<ViewMode>("model");
  const [showAll, setShowAll] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState("f5");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["root", "f5"]));
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | "open" | null>(null);
  const [projectName, setProjectName] = useState("lizhi-building-2024");
  const [savedAt, setSavedAt] = useState<string>("─");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [visiblePanels, setVisiblePanels] = useState({ hierarchy: true, monitor: true, status: true });
  const [entered, setEntered] = useState(false);

  const sim = useBuildingSimulation(paused || !active);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const toast = useCallback((cn: string, en: string, tone: "ok" | "warn" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, cn, en, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  useInterval(
    () => setToasts((t) => (t.length ? t.slice(1) : t)),
    3400,
    toasts.length > 0,
  );

  const toggleFloor = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectFloor = useCallback(
    (id: string) => {
      setSelectedFloor(id);
      setExpanded((prev) => new Set(prev).add(id).add("root"));
    },
    [],
  );

  const saveProject = useCallback(() => {
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setSavedAt(stamp);
    toast("项目已保存 · 场景与监测配置写入本地", "Project saved", "ok");
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
    toast("已导出运行快照 JSON", "Snapshot exported", "ok");
  }, [projectName, selectedFloor, sim, toast]);

  const importScene = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.ifc,.gltf,.glb";
    input.onchange = () => toast("模型导入队列已接收（演示环境不解析文件）", "Import queued", "warn");
    input.click();
  }, [toast]);

  const menus = useMemo<Record<string, MenuItem[]>>(
    () => ({
      项目: [
        { cn: "新建场景", en: "New", key: "Ctrl+N", icon: <IconFilePlus size={14} />, run: () => setModal("new") },
        { cn: "打开项目…", en: "Open", key: "Ctrl+O", icon: <IconFolder size={14} />, run: () => setModal("open") },
        {
          cn: "最近项目",
          en: "Recent",
          icon: <IconLayers size={14} />,
          run: () => toast(`最近项目：${projectName}`, "Recent project", "ok"),
        },
        { cn: "保存场景", en: "Save", key: "Ctrl+S", icon: <IconSave size={14} />, run: saveProject },
        { cn: "导入模型…", en: "Import", icon: <IconExport size={14} />, run: importScene },
        { cn: "导出运行快照", en: "Export", icon: <IconExport size={14} />, run: exportSnapshot },
        { cn: "返回首页", en: "Back to landing", icon: <IconBack size={14} />, run: onExit },
      ],
      视图: [
        { cn: "三维模型", en: "Isometric", key: "M", icon: <IconGrid size={14} />, run: () => setView("model") },
        { cn: "平面图", en: "Plan", key: "P", icon: <IconGrid size={14} />, run: () => setView("plan") },
        { cn: "数据面板", en: "Telemetry", key: "D", icon: <IconActivity size={14} />, run: () => setView("data") },
        {
          cn: showAll ? "仅显示选中楼层" : "显示全部楼层",
          en: "Toggle floors",
          key: "F",
          icon: <IconEye size={14} />,
          run: () => setShowAll((v) => !v),
        },
        { cn: "层级面板", en: "Hierarchy", icon: <IconLayers size={14} />, run: () => setVisiblePanels((p) => ({ ...p, hierarchy: !p.hierarchy })) },
        { cn: "监视器面板", en: "Monitor", icon: <IconCamera size={14} />, run: () => setVisiblePanels((p) => ({ ...p, monitor: !p.monitor })) },
        { cn: "状态栏", en: "Status bar", icon: <IconActivity size={14} />, run: () => setVisiblePanels((p) => ({ ...p, status: !p.status })) },
      ],
      监测: [
        { cn: paused ? "继续数据流" : "暂停数据流", en: paused ? "Resume" : "Pause", key: "Space", icon: <IconActivity size={14} />, run: () => setPaused((v) => !v) },
        { cn: "刷新读数", en: "Refresh", key: "R", icon: <IconUndo size={14} />, run: () => toast("已向 1 004 个点位请求全量读数", "Polling all endpoints", "ok") },
        { cn: "点位自检", en: "Self-test", icon: <IconChip size={14} />, run: () => toast(`端点自检完成：${sim.online}/${sim.devices} 在线`, "Diagnostics complete", "ok") },
        { cn: "告警订阅", en: "Alerts", icon: <IconRadar size={14} />, run: () => toast(`当前 ${sim.alerts} 条报警 · ${sim.warns} 条关注`, "Alert summary", sim.alerts ? "warn" : "ok") },
      ],
      帮助: [
        { cn: "面板快捷键", en: "Shortcuts", icon: <IconInfo size={14} />, run: () => toast("1-8 选楼层 · M/P/D 切换视图 · Space 暂停 · Esc 返回", "Shortcuts", "ok") },
        { cn: "关于立志楼数字孪生", en: "About", icon: <IconInfo size={14} />, run: () => toast("立志楼数字孪生面板 v1.0 · 数据为演示仿真", "About v1.0 · simulated data", "warn") },
        { cn: "返回入口页", en: "Landing", icon: <IconBack size={14} />, run: onExit },
      ],
    }),
    [exportSnapshot, importScene, onExit, paused, projectName, saveProject, sim.alerts, sim.devices, sim.online, sim.warns, showAll, toast],
  );

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "Escape") {
        if (modal) setModal(null);
        else if (openMenu) setOpenMenu(null);
        else if (focusMode) setFocusMode(false);
        else onExit();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setPaused((v) => !v);
        return;
      }
      const k = e.key.toLowerCase();
      if (k >= "1" && k <= "8") {
        const f = FLOORS[Number(k) - 1];
        if (f) selectFloor(f.id);
      } else if (k === "m") setView("model");
      else if (k === "p") setView("plan");
      else if (k === "d") setView("data");
      else if (k === "f") setShowAll((v) => !v);
      else if (k === "r") toast("已向 1 004 个点位请求全量读数", "Polling all endpoints", "ok");
      else if (k === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveProject();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, modal, onExit, openMenu, saveProject, selectFloor, toast]);

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
      <div className="ws__bg">
        <div className="ws__bgimg" style={{ backgroundImage: `url("${workspaceArt}")` }} />
        <div className="ws__grid" />
      </div>

      {/* ---- menu bar ---------------------------------------------------- */}
      <LiquidGlass className="menubar" radius="lg" tone="ink" refraction={0.8} blur={20} elevation={2} static>
        <div className="menubar__left">
          <div className="menubar__brand">
            <span className="menubar__logo">
              <MarkLizhi size={16} />
            </span>
            <span className="menubar__title">
              <span className="menubar__title-cn">立志楼 · 智能空间</span>
              <span className="menubar__title-en">Digital Twin Console</span>
            </span>
          </div>
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
                  <LiquidGlass className="menu" radius="md" tone="ink" refraction={0.8} blur={7} elevation={3} static>
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
        </div>

        <span className="menubar__center">
          <span className="menubar__project">
            <span className="tag" style={{ height: 18 }}>
              项目
            </span>
            <span className="menubar__project-name" title={`${projectName} · 统一建筑孪生工程文件`}>
              {projectName}
            </span>
            <span className="menubar__project-path">/scenes/lizhi/{floor.id}.scene</span>
          </span>
          <span className="tag" title="上次保存时间">
            保存 {savedAt}
          </span>
          {sim.alerts > 0 && (
            <span className="tag tag--alert">
              <i className="dot dot--pulse" /> {sim.alerts} 报警
            </span>
          )}
          {sim.alerts === 0 && sim.warns > 0 && (
            <span className="tag tag--warn">
              <i className="dot" /> {sim.warns} 关注
            </span>
          )}
        </span>

        <div className="menubar__right">
          <button className={`tbtn ${paused ? "tbtn--on" : ""}`} onClick={() => setPaused((v) => !v)}>
            <IconActivity size={13} />
            {paused ? "已暂停" : "实时"}
          </button>
          <button className="tbtn" onClick={saveProject}>
            <IconSave size={13} />
            保存
          </button>
          <button className="tbtn" onClick={onExit} title="返回入口页 / Back to landing (Esc)">
            <IconClose size={13} />
            退出
          </button>
        </div>
      </LiquidGlass>

      {/* ---- middle row --------------------------------------------------- */}
      <div
        className="ws__middle"
        style={{
          gridTemplateColumns: `${visiblePanels.hierarchy ? "258px" : "0px"} minmax(0, 1fr) ${
            visiblePanels.monitor ? "330px" : "0px"
          }`,
        }}
      >
        <div className="ws__left" style={{ display: visiblePanels.hierarchy ? undefined : "none" }}>
          <HierarchyPanel
            selectedFloor={selectedFloor}
            onSelectFloor={selectFloor}
            expanded={expanded}
            onToggle={toggleFloor}
            readings={sim.readings}
            onFocusFloor={(id) => {
              selectFloor(id);
              setFocusMode(true);
            }}
          />
        </div>

        <div className="ws__center">
          <ViewportPanel
            selectedFloor={selectedFloor}
            onSelectFloor={selectFloor}
            readings={sim.readings}
            history={sim.history}
            view={view}
            onView={setView}
            showAll={showAll}
            onToggleAll={() => setShowAll((v) => !v)}
            focusMode={focusMode}
            onFocusMode={setFocusMode}
          />
        </div>

        <div className="ws__right" style={{ display: visiblePanels.monitor ? undefined : "none" }}>
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
      {visiblePanels.status && <StatusBar sim={sim} selectedFloor={selectedFloor} onSelectFloor={selectFloor} />}

      {/* ---- toasts ------------------------------------------------------ */}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <LiquidGlass key={t.id} className="toast" radius="md" tone="ink" refraction={0.8} blur={18} elevation={2} static>
            <i className="dot" style={{ color: t.tone === "warn" ? "var(--amber)" : "var(--mint)" }} />
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
            toast(
              modal === "new" ? `已创建项目 ${name}` : `已打开项目 ${name}`,
              modal === "new" ? "Project created" : "Project opened",
              "ok",
            );
          }}
        />
      )}
    </div>
  );
}
