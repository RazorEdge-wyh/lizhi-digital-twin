import { useEffect, useState } from "react";
import { LiquidGlass } from "../components/LiquidGlass";
import { MarkLizhi, IconArrowRight, IconPlay, IconBuilding } from "../components/Icons";
import { BUILDING } from "../data/building";
import { useBuildingSimulation } from "../hooks/useSimulation";
// imported so the bundler fingerprints the art and rebases the URL for whatever
// base path the site is deployed under (e.g. GitHub Pages project sites)
import heroArt from "../assets/art/lizhi-hero.jpg?url";

interface Props {
  onExplore: () => void;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function Landing({ onExplore }: Props) {
  const sim = useBuildingSimulation(false);
  const now = useClock();

  const onlineRate = ((sim.online / Math.max(1, sim.devices)) * 100).toFixed(1);
  const time = now.toLocaleTimeString("zh-CN", { hour12: false });

  return (
    <section className="landing" aria-label="立志楼数字孪生入口">
      <div className="landing__bg" style={{ backgroundImage: `url("${heroArt}")` }} />
      <div className="landing__scrim" />
      <div className="landing__grain" />
      <div className="landing__scan" />

      <header className="landing__topbar">
        <div className="brandline">
          <span className="brandline__mark">
            <MarkLizhi size={19} />
          </span>
          <span className="brandline__text">
            <span className="brandline__cn">湖南科技大学</span>
            <span className="brandline__en">Hunan University of Science and Technology</span>
          </span>
        </div>
        <div className="statuschips">
          <span className="chip chip--live">
            <i className="dot dot--pulse" />
            <span className="chip__k">Live</span>
            <span className="mono">
              {sim.online}/{sim.devices}
            </span>
          </span>
          <span className="chip">
            <span className="chip__k">在线率</span>
            <span className="mono">{onlineRate}%</span>
          </span>
          <span className="chip">
            <span className="chip__k">CST</span>
            <span className="mono">{time}</span>
          </span>
        </div>
      </header>

      <div className="landing__content">
        <div className="eyebrow">
          <span className="eyebrow__rule" />
          <span className="eyebrow__cn">未来智能空间建筑</span>
          <span>Lizhi Building</span>
        </div>

        <div className="hero">
          <h1 className="hero__title">
            <span className="hero__title-cn">立志楼</span>
            <span className="hero__title-en">Lizhi Building</span>
          </h1>
          <p className="hero__lede">
            以立志楼为载体的智能空间建筑数字孪生平台。接入楼宇自控、环境感知与能耗计量三类数据，实时呈现各楼层运行态势，为建筑的低碳运行、空间调度与安全预警提供统一的决策面板。
            <span className="hero__lede-en">
              A digital-twin shell for an intelligent building: live floor topology, environmental sensing and energy
              telemetry unified on one decision surface.
            </span>
          </p>
        </div>

        <div className="specs">
          <div className="spec">
            <IconBuilding size={16} />
            <span>
              <span className="spec__v">{BUILDING.floors}F + B{BUILDING.basement}</span>
            </span>
            <span className="spec__k">楼层</span>
          </div>
          <div className="spec">
            <span className="spec__v">{(BUILDING.gfa / 10000).toFixed(2)}</span>
            <span className="spec__k">万 m² 建筑面积</span>
          </div>
          <div className="spec">
            <span className="spec__v">{sim.devices}</span>
            <span className="spec__k">监测点位</span>
          </div>
          <div className="spec">
            <span className="spec__v">{(sim.load / 1000).toFixed(1)}</span>
            <span className="spec__k">MW 实时负荷</span>
          </div>
        </div>

        <div className="startrow">
          <button className="startbtn" onClick={onExplore} aria-label="开始探索 Start Exploring">
            <LiquidGlass radius="lg" tone="cool" refraction={1.4} blur={20} elevation={3} sheen specular>
              <span className="startbtn__inner">
                <span className="startbtn__glyph">
                  <IconPlay size={19} />
                </span>
                <span className="startbtn__text">
                  <span className="startbtn__cn">开始探索</span>
                  <span className="startbtn__en">Start Exploring</span>
                </span>
                <IconArrowRight size={18} className="startbtn__chev" />
              </span>
            </LiquidGlass>
          </button>
          <div className="startrow__hint">
            <span>
              进入 <b>立志楼细节面板</b>
            </span>
            <span>Enter the building detail console · 层级 / 传感器 / 监视器</span>
          </div>
        </div>
      </div>

      <footer className="landing__footer">
        <span>
          湖南科技大学 · 立志楼数字孪生 / Lizhi Building Digital Twin · {BUILDING.target}
        </span>
        <span className="landing__coords">
          {BUILDING.lat.toFixed(4)}°N {BUILDING.lon.toFixed(4)}°E · ELEV {BUILDING.elevation} m · 建成年份{" "}
          {BUILDING.built}
        </span>
      </footer>
    </section>
  );
}
