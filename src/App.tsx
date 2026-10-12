import { useCallback, useEffect, useRef, useState } from "react";
import { Landing } from "./screens/Landing";
import { Workspace } from "./screens/Workspace";

type Mode = "landing" | "workspace";

const TRANSITION_MS = 420;

/** `#console` deep-links straight into the detail console. */
const modeFromHash = (): Mode => (window.location.hash.replace(/^#\/?/, "") === "console" ? "workspace" : "landing");

export function App() {
  const [mode, setMode] = useState<Mode>(modeFromHash);
  const [transitioning, setTransitioning] = useState(false);
  const timer = useRef<number | null>(null);

  const go = useCallback(
    (next: Mode) => {
      setTransitioning(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setMode(next);
        setTransitioning(false);
      }, TRANSITION_MS);
    },
    [],
  );

  // keep the URL in step so the console view can be linked and reloaded
  useEffect(() => {
    const wanted = mode === "workspace" ? "#console" : "";
    if (window.location.hash !== wanted) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${wanted}`);
    }
  }, [mode]);

  useEffect(() => {
    const onHash = () => {
      const next = modeFromHash();
      setMode((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const startExploring = useCallback(() => go("workspace"), [go]);
  const exitToLanding = useCallback(() => go("landing"), [go]);

  const landingHidden = mode !== "landing" || transitioning;
  const workspaceHidden = mode !== "workspace" || transitioning;

  return (
    <main className="app">
      <div className={`app__layer app__fade ${landingHidden ? "app__layer--hidden" : ""}`} aria-hidden={landingHidden}>
        <Landing onExplore={startExploring} />
      </div>

      <div className={`app__layer app__fade ${workspaceHidden ? "app__layer--hidden" : ""}`} aria-hidden={workspaceHidden}>
        <Workspace onExit={exitToLanding} active={mode === "workspace"} />
      </div>
    </main>
  );
}
