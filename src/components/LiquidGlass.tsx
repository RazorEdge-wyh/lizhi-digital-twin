/**
 * Liquid glass surface — Apple-style restraint.
 *
 * The pane is built from three things only:
 *
 *  1. a backdrop blur + saturation lift, so the pane reads as frosted glass;
 *  2. an edge that genuinely refracts the backdrop. We rasterise a rounded-rect
 *     signed distance field into a canvas, encode the gradient as an RGB
 *     displacement map (R = x offset, G = y offset, mid-grey = no offset) and
 *     hand it to an SVG `feDisplacementMap` used as this element's
 *     `backdrop-filter`. That is the same technique as Apple's Liquid Glass and
 *     rdev/liquid-glass-react, and it is what makes the rim bend the image
 *     behind it instead of just sitting on top;
 *  3. a single hairline highlight along the top edge plus a very light inner
 *     shade, which is how a real pane catches light.
 *
 * Deliberately absent: coloured glows, gradient text, noise film, animated
 * sheen, drop shadows beyond one soft elevation shadow. Glass is a material for
 * controls and structural chrome; using it everywhere reads as decoration.
 *
 * Browsers that cannot filter a backdrop simply get (1) and (3), which still
 * looks like glass and never degrades into an unreadable box.
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

export type GlassTone = "regular" | "thin" | "thick" | "frost";
export type GlassRadius = "sm" | "md" | "lg" | "xl";
export interface LiquidGlassProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  radius?: GlassRadius;
  /** Explicit radius in px, overriding `radius`. */
  radiusPx?: number;
  /**
   * Material weight, mirroring how Apple names glass variants:
   * `thin` lets the backdrop through, `regular` is the default control
   * material, `thick` is for chrome that must stay legible over busy content.
   */
  tone?: GlassTone;
  /** Edge refraction strength. 0 disables the SVG pass entirely. */
  refraction?: number;
  /** Backdrop blur in px. */
  blur?: number;
  /**
   * Set when this pane sits on top of another glass pane. Nested
   * `backdrop-filter` does not sample what the parent already filtered the way
   * a flat stack does, so a blurred child goes muddy. In this mode the pane
   * keeps the tint, edge and rim — the parts that read as glass — and drops the
   * blur, which keeps every surface legibly glassy without turning to soup.
   */
  over?: boolean;
  /** Elevation shadow strength. */
  elevation?: 0 | 1 | 2;
  /** Let the content wrapper stretch to the full pane height. */
  fill?: boolean;
}

const RADII: Record<GlassRadius, number> = { sm: 10, md: 14, lg: 20, xl: 28 };

/**
 * Tint (the material's own body) and wash (a neutral veil over it). `frost` is
 * the light material used for a control that floats over imagery: a white body
 * brightens the backdrop behind it so the label stays readable over both lit
 * and dark content, which is exactly when Apple reaches for light glass.
 */
const TONES: Record<GlassTone, { tint: string; wash: string }> = {
  thin: { tint: "rgba(255, 255, 255, 0.07)", wash: "rgba(10, 14, 22, 0.10)" },
  regular: { tint: "rgba(255, 255, 255, 0.10)", wash: "rgba(10, 14, 22, 0.22)" },
  thick: { tint: "rgba(255, 255, 255, 0.07)", wash: "rgba(8, 12, 20, 0.62)" },
  frost: { tint: "rgba(255, 255, 255, 0.44)", wash: "rgba(255, 255, 255, 0.16)" },
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
 * Build a data-URL displacement map for a rounded rectangle. The displacement
 * is concentrated in a narrow band just inside the border, which is what gives
 * the edge its thickness.
 */
function buildDisplacementMap(w: number, h: number, radius: number, strength: number): string {
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
  const band = Math.max(4, Math.min(cw, ch) * 0.12);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const dist = roundedRectSDF(px, py, hw, hh, r);
      // 1 at the border easing to 0 `band` px inside
      const rim = 1 - smoothstep(-band, 0, dist);
      const amount = rim * strength * 9;
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

function supportsBackdropFilterUrl(): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false;
  return CSS.supports("backdrop-filter", "url(#x)") || CSS.supports("-webkit-backdrop-filter", "url(#x)");
}

export const LiquidGlass = forwardRef<HTMLDivElement, LiquidGlassProps>(function LiquidGlass(
  {
    children,
    radius = "lg",
    radiusPx,
    tone = "regular",
    refraction = 1,
    blur = 20,
    over = false,
    elevation = 1,
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
    // debounce: resizing a pane should not rasterise a field every frame
    const timer = window.setTimeout(() => {
      setMap(buildDisplacementMap(size.w, size.h, r, refraction));
    }, 60);
    return () => window.clearTimeout(timer);
  }, [canRefract, refraction, radius, radiusPx, size.w, size.h]);

  const px = radiusPx ?? RADII[radius];
  const material = TONES[tone];
  // The SDF pass already scales its offsets, so a refracted edge needs no extra
  // filter blur; a large `blur()` here would smear the very edge it produces.
  const lift = tone === "frost" ? " brightness(1.22)" : "";
  const backdrop = over
    ? "none"
    : map
      ? `url(#${filterId}) saturate(180%)${lift}`
      : `blur(${blur}px) saturate(180%)${lift}`;

  const cssVars = {
    "--lg-radius": `${px}px`,
    "--lg-tint": material.tint,
    "--lg-wash": material.wash,
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
        over ? "lg--over" : "",
        fill ? "lg--fill" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...cssVars, ...style }}
      data-refraction={map ? "on" : "off"}
    >
      {map && (
        <svg className="lg__defs" aria-hidden="true" focusable="false">
          <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage href={map} x="0" y="0" width={size.w} height={size.h} preserveAspectRatio="none" result="map" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={refraction * 9}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      )}
      <span className="lg__body" aria-hidden="true" />
      <div className="lg__content">{children}</div>
    </div>
  );
});

/** Hairline divider — structure, not decoration. */
export function GlassDivider({ vertical = false }: { vertical?: boolean }) {
  return <span className={vertical ? "hairline hairline--v" : "hairline"} aria-hidden="true" />;
}
