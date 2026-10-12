import { MediaBackdrop } from "../components/MediaBackdrop";
import { BUILDING } from "../data/building";

interface Props {
  onExplore: () => void;
}

/**
 * Landing: one large word on the left, and the bare minimum of context.
 *
 * The entry is deliberately NOT glass — it is plain type with a rule that draws
 * itself in on hover. That makes the one action on the screen unambiguous: no
 * material competing with it, nothing to decode. Everything that used to sit
 * beside it (project name, faculty, spec figures) is compressed into a small
 * kicker above and two short footer lines at the bottom edge.
 */
export function Landing({ onExplore }: Props) {
  return (
    <section className="landing" aria-label="立志楼数字孪生入口">
      <MediaBackdrop />
      <div className="landing__scrim" aria-hidden="true" />

      <div className="landing__content">
        <p className="landing__kicker">
          立志楼 · LIZHI BUILDING
          <span className="landing__kicker-sub">湖南科技大学 · 智能空间数字孪生</span>
        </p>

        {/* deliberately plain type, no material: the one action must be
            unambiguous, and the hover rule is the whole affordance */}
        <button className="startlink" type="button" onClick={onExplore}>
          <span className="startlink__text">开始探索</span>
          <span className="startlink__rule" aria-hidden="true" />
        </button>
      </div>

      <footer className="landing__footer">
        <span className="landing__meta">
          建筑与设计学院 · 数学与统计学院 共用教学楼
          <i className="landing__meta-sep">/</i>
          {BUILDING.floors}F + B{BUILDING.basement}
          <i className="landing__meta-sep">/</i>
          {(BUILDING.gfa / 10000).toFixed(2)} 万 m²
          <i className="landing__meta-sep">/</i>
          {BUILDING.target}
        </span>
        <span className="landing__coords">
          {BUILDING.lat.toFixed(4)}°N {BUILDING.lon.toFixed(4)}°E · ELEV {BUILDING.elevation} m
        </span>
      </footer>
    </section>
  );
}
