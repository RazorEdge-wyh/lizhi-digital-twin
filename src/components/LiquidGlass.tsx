/**
 * Liquid-glass surface.
 *
 * Two layers of realism are stacked here:
 *
 * 1. A physically-flavoured CSS glass base -- backdrop blur + saturation, a
 *    tinted gradient body, a bright specular rim, an inner shadow and a fine
 *    noise film so the pane never reads as flat plastic.
 * 2. A genuine refraction pass. We rasterise a signed-distance-field of a
 *    rounded rectangle into a canvas, encode the gradient as an RGB
 *    displacement map, then hand it to an SVG `feDisplacementMap` used as the
 *    element's `backdrop-filter`. That bends the *backdrop itself* around the
 *    edges, which is the effect Apple's Liquid Glass and the rdev
 *    liquid-glass-react component both approximate.
 *
 * If a browser cannot run filters over a backdrop, layer 1 still stands on its
 * own, so nothing degrades into an unreadable box.
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

export type GlassTone = "neutral" | "cool" | "warm" | "ink";
export type GlassRadius = "sm" | "md" | "lg" | "xl";

export interface LiquidGlassProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /** Corner radius token (or any CSS length via `radiusPx`). */
  radius?: GlassRadius;
  /** Explicit radius in px, overriding `radius`. */
  radiusPx?: number;
  /** Colour bias of the tinted glass body. */
  tone?: GlassTone;
  /** Strength of the edge refraction, 0 disables the SVG pass entirely. */
  refraction?: number;
  /** Backdrop blur in px. */
  blur?: number;
  /** Adds a bright top-lit rim, as if a light source sits above the pane. */
  specular?: boolean;
  /** Draw the animated sheen sweep. */
  sheen?: boolean;
  /** Elevation shadow strength. */
  elevation?: 0 | 1 | 2 | 3;
  /** Renders the pane as a non-interactive container with no hover response. */
  static?: boolean;
  /** Let the content wrapper stretch to the full pane height. */
  fill?: boolean;
}

const RADII: Record<GlassRadius, number> = { sm: 10, md: 14, lg: 18, xl: 26 };

const TONES: Record<GlassTone, string> = {
  neutral: "rgba(148, 170, 200, 0.10)",
  cool: "rgba(96, 190, 230, 0.10)",
  warm: "rgba(255, 196, 140, 0.09)",
  ink: "rgba(8, 12, 22, 0.42)",
};

/** Surfaces that float above dense UI need their own opaque floor. */
const SURFACES: Partial<Record<GlassTone, string>> = {
  ink: "rgba(7, 11, 20, 0.72)",
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

/**
 * Build a data-URL displacement map for a rounded rectangle.
 *
 * R encodes horizontal offset, G vertical, both biased to mid-grey (128) as
 * required by `feDisplacementMap`. The displacement is concentrated in a band
 * just inside the border, which is what produces the "thick glass edge" look.
 */
function buildDisplacementMap(w: number, h: number, radius: number, strength: number): string {
  const scale = 0.5; // render at half res; the result is smooth anyway
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
  const band = Math.max(6, Math.min(cw, ch) * 0.16);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const dist = roundedRectSDF(px, py, hw, hh, r);
      // 1 at the border, easing to 0 `band` px inside the pane
      const falloff = 1 - smoothstep(-band, 0, dist);
      // a gentle outward push: convex glass magnifies what is behind it
      const magnify = smoothstep(-band, 0, dist) * 0.35;
      const amount = (falloff * 0.85 + magnify) * strength * 12;
      // direction away from the centre, normalised by half-extents
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

/** Does this browser support a filter function inside backdrop-filter? */
function supportsBackdropFilterUrl(): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false;
  return (
    CSS.supports("backdrop-filter", "url(#x)") ||
    CSS.supports("-webkit-backdrop-filter", "url(#x)")
  );
}

export const LiquidGlass = forwardRef<HTMLDivElement, LiquidGlassProps>(function LiquidGlass(
  {
    children,
    radius = "lg",
    radiusPx,
    tone = "neutral",
    refraction = 1,
    blur = 16,
    specular = true,
    sheen = false,
    elevation = 2,
    static: isStatic = false,
    fill = false,
    className,
    style,
    ...rest
  },
  forwardedRef,
) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `lg-refract-${rawId}`;
  const [map, setMap] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const canRefract = useMemo(supportsBackdropFilterUrl, []);

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
    if (!node || !canRefract || refraction <= 0) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [canRefract, refraction]);

  useEffect(() => {
    if (!canRefract || refraction <= 0 || size.w < 8 || size.h < 8) {
      setMap("");
      return;
    }
    const r = radiusPx ?? RADII[radius];
    // Debounce: resizing a pane should not rasterise a field per frame.
    const timer = window.setTimeout(() => {
      setMap(buildDisplacementMap(size.w, size.h, r, refraction));
    }, 60);
    return () => window.clearTimeout(timer);
  }, [canRefract, refraction, radius, radiusPx, size.w, size.h]);

  const px = radiusPx ?? RADII[radius];
  const backdrop = map
    ? `url(#${filterId}) blur(${blur}px) saturate(165%) brightness(1.06)`
    : `blur(${blur}px) saturate(165%) brightness(1.06)`;

  const cssVars = {
    "--lg-radius": `${px}px`,
    "--lg-tint": TONES[tone],
    "--lg-surface": SURFACES[tone] ?? "transparent",
    "--lg-blur": `${blur}px`,
    "--glass-backdrop": backdrop,
  } as CSSProperties;

  return (
    <div
      {...rest}
      ref={setRefs}
      className={[
        "lg",
        `lg--r-${radius}`,
        `lg--e${elevation}`,
        `lg--tone-${tone}`,
        specular ? "lg--specular" : "",
        sheen ? "lg--sheen" : "",
        isStatic ? "lg--static" : "",
        fill ? "lg--fill" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...cssVars, ...style }}
      data-refraction={map ? "on" : "off"}
    >
      {map && (
        <svg className="lg__filter-defs" aria-hidden="true" focusable="false">
          <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage href={map} x="0" y="0" width={size.w} height={size.h} preserveAspectRatio="none" result="map" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={refraction * 12}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      )}
      <span className="lg__body" aria-hidden="true" />
      <span className="lg__rim" aria-hidden="true" />
      {specular && <span className="lg__specular" aria-hidden="true" />}
      <span className="lg__noise" aria-hidden="true" />
      {sheen && <span className="lg__sheen" aria-hidden="true" />}
      <div className="lg__content">{children}</div>
    </div>
  );
});

/** Thin hairline divider that reads as an etched groove in glass. */
export function GlassDivider({ vertical = false }: { vertical?: boolean }) {
  return <span className={vertical ? "glass-rule glass-rule--v" : "glass-rule"} aria-hidden="true" />;
}
