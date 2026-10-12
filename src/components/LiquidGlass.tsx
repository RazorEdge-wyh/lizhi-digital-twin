/**
 * Liquid glass surface — one material system, two applications.
 *
 * The pane is built from three things only:
 *
 *  1. a backdrop frosting — blur + saturation, plus a brightness lift on the
 *     light variant;
 *  2. an edge that genuinely refracts the backdrop. We rasterise a rounded-rect
 *     signed distance field into a canvas, encode the gradient as an RGB
 *     displacement map (R = x offset, G = y offset, mid-grey = no offset) and
 *     feed it to an SVG `feDisplacementMap`. Same technique as Apple's Liquid
 *     Glass and rdev/liquid-glass-react;
 *  3. one hairline catch-light along the top edge and a faint inner shade.
 *
 * Two details make this version behave where the previous one broke:
 *
 *  - **The filter travels with the pane.** The SVG is serialised into the CSS
 *    value itself (a `data:` URL) instead of being referenced as `url(#id)`.
 *    A referenced filter is resolved against the document, so it gets clipped
 *    by whatever ancestor has `overflow: hidden` — which is every panel here.
 *    A self-contained URL has no such coupling.
 *  - **The material never rides on an inherited custom property.** Each pane
 *    writes its own body colour inline, so a dark chrome host can no longer
 *    force its wash onto the small panes stacked inside it.
 *
 * `variant` is the shared vocabulary the two screens are built from:
 *   `chrome` — dark structural glass: panels, menu bar, viewport, monitor.
 *   `light`  — bright frosting: the entry control that floats over footage.
 *
 * Set `over` when a pane sits on top of another pane: nested `backdrop-filter`
 * cannot sample what its parent already filtered, so that tier keeps the body,
 * edge and rim — the parts that read as glass — and drops the frosting.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

export type GlassVariant = "chrome" | "light";
export type GlassRadius = "sm" | "md" | "lg" | "xl";

export interface LiquidGlassProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  radius?: GlassRadius;
  /** Explicit radius in px, overriding `radius`. */
  radiusPx?: number;
  /** Which application of the material this pane is. */
  variant?: GlassVariant;
  /** Edge refraction strength. 0 disables the displacement pass. */
  refraction?: number;
  /** Backdrop blur in px (used when there is no displacement pass). */
  blur?: number;
  /** Set when this pane sits on top of another glass pane. */
  over?: boolean;
  /**
   * An opaque pane. Floating surfaces (a dropdown, a modal, a toast) need to be
   * read against whatever they cover, and a translucent pane over dense UI
   * samples intermediate layers in a way that leaves a sharp rectangle of the
   * content underneath. Opaque sidesteps that entirely.
   */
  solid?: boolean;
  /** Elevation shadow strength. */
  elevation?: 0 | 1 | 2;
  /** Let the content wrapper stretch to the full pane height. */
  fill?: boolean;
}

const RADII: Record<GlassRadius, number> = { sm: 12, md: 16, lg: 20, xl: 30 };

interface Material {
  /** base body colour; its alpha is driven by `--lg-body-alpha` */
  body: string;
  /** backdrop value when the displacement pass is unavailable */
  fallback: string;
}

const MATERIALS: Record<GlassVariant, Material> = {
  chrome: {
    body: "rgba(12, 15, 20, 0.66)",
    fallback: "blur(20px) saturate(160%)",
  },
  light: {
    body: "rgba(255, 255, 255, 0.38)",
    fallback: "blur(22px) saturate(180%) brightness(1.2)",
  },
};

/** Nested panes: translucency instead of frosting, tuned per variant. */
const OVER_BODY: Record<GlassVariant, string> = {
  chrome: "rgba(255, 255, 255, 0.085)",
  light: "rgba(255, 255, 255, 0.2)",
};

/** Signed distance to a rounded rectangle, in half-extent space. */
function roundedRectSDF(x: number, y: number, hw: number, hh: number, r: number): number {
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return Math.min(Math.max(qx, qy), 0) + outside - r;
}

function smoothstep(a: number, b: number, t: number): number {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

/** A 1x1 fully transparent PNG, used as the feImage seed we overwrite. */
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/**
 * Rasterise the displacement map. The offsets live in a narrow band just inside
 * the border, which is what gives the edge its thickness; the middle stays at
 * mid-grey so the centre of the pane passes through untouched.
 */
function buildDisplacementDataUrl(w: number, h: number, radius: number): string {
  const scale = 0.5; // half resolution is plenty for a smooth field
  const cw = Math.max(2, Math.round(w * scale));
  const ch = Math.max(2, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const image = ctx.createImageData(cw, ch);
  const data = image.data;
  const hw = cw / 2;
  const hh = ch / 2;
  const r = Math.min(radius * scale, hw, hh);
  const band = Math.max(5, Math.min(cw, ch) * 0.14);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const dist = roundedRectSDF(px, py, hw, hh, r);
      const rim = 1 - smoothstep(-band, 0, dist);
      const amount = rim * 255 * 0.5;
      const nx = px / Math.max(1, hw);
      const ny = py / Math.max(1, hh);
      const len = Math.hypot(nx, ny) || 1;
      const i = (y * cw + x) * 4;
      data[i] = Math.max(0, Math.min(255, 128 + (nx / len) * amount));
      data[i + 1] = Math.max(0, Math.min(255, 128 + (ny / len) * amount));
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

/**
 * Wrap a displacement map into a self-contained `backdrop-filter` value.
 *
 * `feImage` has no way to carry a runtime value, so the blank pixel is written
 * as a seed and the real map is spliced into the serialised filter's `xlink:href`
 * (the SVG1.1 attribute, which both Chrome and Safari honour inside a filter).
 */
function buildBackdropFilter(mapUrl: string, scale: number, brighten: boolean): string {
  const lift = brighten ? ' feColorMatrix type="matrix" values="1.12 0 0 0 0.05  0 1.12 0 0 0.05  0 0 1.12 0 0.05  0 0 0 1 0"' : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
    `<filter id="f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
    `<feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" xlink:href="${BLANK_PNG}"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${scale.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="shifted"/>` +
    lift +
    `</filter></svg>`;
  const encoded = svg.replace(BLANK_PNG, mapUrl);
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(encoded)}")`;
}

function supportsUrlBackdropFilter(): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false;
  return (
    CSS.supports("backdrop-filter", 'url("data:image/svg+xml;base64,PHN2Zy8+")') ||
    CSS.supports("-webkit-backdrop-filter", 'url("data:image/svg+xml;base64,PHN2Zy8+")')
  );
}

export const LiquidGlass = forwardRef<HTMLDivElement, LiquidGlassProps>(function LiquidGlass(
  {
    children,
    radius = "lg",
    radiusPx,
    variant = "chrome",
    refraction = 1,
    blur,
    over = false,
    solid = false,
    elevation = 1,
    fill = false,
    className,
    style,
    ...rest
  },
  forwardedRef,
) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [map, setMap] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const canRefract = useMemo(supportsUrlBackdropFilter, []);
  const active = canRefract && !over && refraction > 0;

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  useEffect(() => {
    const node = localRef.current;
    if (!node || !active) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    if (!active || size.w < 8 || size.h < 8) {
      setMap("");
      return;
    }
    const r = radiusPx ?? RADII[radius];
    // debounce: resizing a pane should not rasterise a field every frame
    const timer = window.setTimeout(() => setMap(buildDisplacementDataUrl(size.w, size.h, r)), 60);
    return () => window.clearTimeout(timer);
  }, [active, radius, radiusPx, size.w, size.h]);

  const material = MATERIALS[variant];
  const px = radiusPx ?? RADII[radius];
  const body = solid ? "rgba(17, 20, 26, 0.96)" : over ? OVER_BODY[variant] : material.body;
  const backdrop = solid || over
    ? "none"
    : map
      ? `${buildBackdropFilter(map, refraction * 10, variant === "light")} saturate(175%)${
          variant === "light" ? " brightness(1.1)" : ""
        }`
      : (blur !== undefined ? `blur(${blur}px) saturate(170%)` : material.fallback);

  const vars = {
    "--lg-radius": `${px}px`,
    "--lg-body": body,
    "--lg-body-alpha": 1,
    "--lg-backdrop": backdrop,
  } as CSSProperties;

  return (
    <div
      {...rest}
      ref={setRefs}
      className={[
        "lg",
        `lg--r-${radius}`,
        `lg--${variant}`,
        `lg--e${elevation}`,
        over ? "lg--over" : "",
        solid ? "lg--solid" : "",
        fill ? "lg--fill" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...vars, ...style }}
      data-lg-id={id}
      data-refraction={map ? "on" : "off"}
    >
      <span className="lg__body" aria-hidden="true" />
      <div className="lg__content">{children}</div>
    </div>
  );
});

/** Hairline divider — structure, not decoration. */
export function GlassDivider({ vertical = false }: { vertical?: boolean }) {
  return <span className={vertical ? "hairline hairline--v" : "hairline"} aria-hidden="true" />;
}
