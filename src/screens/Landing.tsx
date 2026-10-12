import { LiquidGlass } from "../components/LiquidGlass";
import { MediaBackdrop } from "../components/MediaBackdrop";

interface Props {
  onExplore: () => void;
}

/**
 * Landing: the building, the name, and a single choice.
 *
 * Everything that is not one of those three things was removed on purpose — no
 * brand mark, no status chips, no spec grid, no footer, no icons. The title is
 * the page's only type; the button is its only control, and the only glass on
 * the screen, because it has to stay legible over both the lit facade and the
 * dark sky behind it.
 *
 * The backdrop is a looping video on capable desktop viewports and a still
 * everywhere else (see MediaBackdrop). It sits at the bottom of the stack; the
 * scrim grades it for legibility and the content sits above both.
 */
export function Landing({ onExplore }: Props) {
  return (
    <section className="landing" aria-label="立志楼数字孪生入口">
      <MediaBackdrop />
      <div className="landing__scrim" aria-hidden="true" />

      <div className="landing__content">
        <h1 className="landing__title">立志楼</h1>
        <p className="landing__subtitle">
          <span className="landing__subtitle-cn">建筑与设计学院 · 数学与统计学院 共用教学楼</span>
          <span className="landing__subtitle-en">
            Shared Teaching Building · School of Architecture &amp; Design / School of Mathematics &amp; Statistics
          </span>
        </p>

        <button className="enter" onClick={onExplore} aria-label="开始探索，进入立志楼细节面板 / Start exploring">
          {/* `fill` lets the pane stretch to the button's box so its padding and
              radius actually apply — otherwise the glass sizes to its label. */}
          <LiquidGlass radius="xl" radiusPx={31} tone="frost" refraction={1.15} blur={24} elevation={2}>
            <span className="enter__label">
              <span className="enter__cn">开始探索</span>
              <span className="enter__en">Start Exploring</span>
            </span>
          </LiquidGlass>
        </button>
      </div>
    </section>
  );
}
