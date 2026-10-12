import { LiquidGlass } from "../components/LiquidGlass";
import { MediaBackdrop } from "../components/MediaBackdrop";
import { IconArrowRight, IconBuilding, IconPlay, IconWifi } from "../components/Icons";
import { BUILDING } from "../data/building";
import { useBuildingSimulation } from "../hooks/useSimulation";

interface Props {
  onExplore: () => void;
}

/**
 * Landing: the building, the name, and the one way in.
 *
 * The composition is the editorial one — eyebrow, display title, a short
 * bilingual lede, four live spec chips, then the single control — with the
 * restrained material system underneath it. The decorative layers that used to
 * sit on top (scan lines and the noise film) are gone, so the footage is what
 * you actually see; the scrim only grades it enough to hold white type.
 */
export function Landing({ onExplore }: Props) {
  const sim = useBuildingSimulation(false);
  const onlineRate = ((sim.online / Math.max(1, sim.devices)) * 100).toFixed(1);

  return (
    <section className="landing" aria-label="立志楼数字孪生入口">
      <MediaBackdrop />
      <div className="landing__scrim" aria-hidden="true" />

      <div className="landing__content">
        <div className="eyebrow">
          <span className="eyebrow__rule" />
          <span className="eyebrow__cn">未来智能空间建筑</span>
          <span className="eyebrow__en">Lizhi Building</span>
        </div>

        <div className="hero">
          <h1 className="hero__title">
            <span className="hero__title-cn">立志楼</span>
            <span className="hero__title-en">Lizhi Building</span>
          </h1>

          {/* who the building is for */}
          <p className="hero__faculty">
            建筑与设计学院 · 数学与统计学院 共用教学楼
            <span className="hero__faculty-en">
              Shared Teaching Building · School of Architecture &amp; Design / School of Mathematics &amp; Statistics
            </span>
          </p>

          <p className="hero__lede">
            以立志楼为载体的智能空间数字孪生平台。接入楼宇自控、环境感知与能耗计量三类数据，实时呈现各楼层运行态势，为建筑的低碳运行、空间调度与安全预警提供统一的决策面板。
            <span className="hero__lede-en">
              A digital-twin shell for an intelligent building: live floor topology, environmental sensing and
              energy telemetry on one decision surface.
            </span>
          </p>
        </div>

        <div className="specs">
          <div className="spec">
            <IconBuilding size={15} />
            <span className="spec__v">
              {BUILDING.floors}F + B{BUILDING.basement}
            </span>
            <span className="spec__k">楼层</span>
          </div>
          <div className="spec">
            <span className="spec__v">{(BUILDING.gfa / 10000).toFixed(2)}</span>
            <span className="spec__k">万 m² 建筑面积</span>
          </div>
          <div className="spec">
            <IconWifi size={15} />
            <span className="spec__v">{sim.devices}</span>
            <span className="spec__k">监测点位</span>
          </div>
          <div className="spec">
            <span className="spec__v">{(sim.load / 1000).toFixed(1)}</span>
            <span className="spec__k">MW 实时负荷</span>
          </div>
        </div>

        <div className="startrow">
          <button className="enter" onClick={onExplore} aria-label="开始探索，进入立志楼细节面板 / Start exploring">
            <LiquidGlass radius="xl" radiusPx={31} tone="frost" refraction={1.15} blur={24} elevation={2}>
              <span className="enter__inner">
                <span className="enter__glyph">
                  <IconPlay size={16} />
                </span>
                <span className="enter__label">
                  <span className="enter__cn">开始探索</span>
                  <span className="enter__en">Start Exploring</span>
                </span>
                <IconArrowRight size={17} className="enter__chev" />
              </span>
            </LiquidGlass>
          </button>

          <div className="startrow__hint">
            <span>
              进入 <b>立志楼细节面板</b>
            </span>
            <span>Layers · Sensors · Monitor</span>
          </div>
        </div>
      </div>

      <footer className="landing__footer">
        <span>
          湖南科技大学 · 立志楼数字孪生 / Lizhi Building Digital Twin · {BUILDING.target}
        </span>
        <span className="landing__coords">
          {BUILDING.lat.toFixed(4)}°N {BUILDING.lon.toFixed(4)}°E · ELEV {BUILDING.elevation} m · 在线率 {onlineRate}%
        </span>
      </footer>
    </section>
  );
}
