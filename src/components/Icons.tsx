import type { SVGProps } from "react";

/**
 * One icon set, one stroke weight. 1.5px matches the optical weight of the
 * regular-weight text the icons sit beside; a second library or a mixed stroke
 * weight is the fastest way to make an interface look assembled rather than
 * designed. Everything inherits `currentColor`, so states come from CSS.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

export const IconChevronRight = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconPlus = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconBuilding = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 21V7l8-4 8 4v14" />
    <path d="M9 21v-5h6v5" />
    <path d="M9 10h1.5M13.5 10H15M9 13.5h1.5M13.5 13.5H15" />
  </svg>
);

export const IconLayers = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </svg>
);

export const IconChip = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
  </svg>
);

export const IconFolder = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 7.5A2 2 0 015 5.5h3.6a2 2 0 011.5.7l1 1.2H19a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </svg>
);

export const IconFilePlus = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M12 12v5M9.5 14.5h5" />
  </svg>
);

export const IconSave = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
    <path d="M8 3v6h7V3M8 21v-6h8v6" />
  </svg>
);

export const IconExport = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 14V4" />
    <path d="M8 9l4 4 4-4" />
    <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
  </svg>
);

export const IconUndo = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 9h11a5 5 0 010 10H8" />
    <path d="M8 5L4 9l4 4" />
  </svg>
);

export const IconCamera = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 8.5A2 2 0 015 6.5h2l1.3-2h7.4l1.3 2h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <circle cx="12" cy="12.5" r="3.2" />
  </svg>
);

export const IconActivity = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 12h4l2.5-6 3.5 12 2.5-6h5" />
  </svg>
);

export const IconGrid = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
  </svg>
);

export const IconCube = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2.8l8 4.4v9.6l-8 4.4-8-4.4V7.2z" />
    <path d="M4 7.2l8 4.4 8-4.4M12 11.6V21" />
  </svg>
);

export const IconPause = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M9.5 5v14M14.5 5v14" />
  </svg>
);

export const IconPlay = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M8.5 5.5v13l10-6.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconBack = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M20 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </svg>
);

export const IconEye = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3.1" />
  </svg>
);

export const IconRadar = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.6" />
    <path d="M12 12l6-3.4" />
  </svg>
);

export const IconInfo = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.6v.9" />
  </svg>
);
