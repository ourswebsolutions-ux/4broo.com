// Inline SVG icon set (1.5px strokes) — no icon library dependency.
// Icons are decorative by default; pass `title` to give one an accessible name.
import { cn } from "@/utils/cn";

const PATHS = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  user: <><circle cx="12" cy="8" r="3.75" /><path d="M4.5 20c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5" /></>,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />,
  bag: <><path d="M5 8.5h14l-1 11.5H6L5 8.5Z" /><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" /></>,
  menu: <><path d="M3.5 7h17" /><path d="M3.5 12h17" /><path d="M3.5 17h11" /></>,
  close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
  arrowRight: <><path d="M4 12h15" /><path d="m14 7 5 5-5 5" /></>,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 1.5" /></>,
  mail: <><rect x="3.5" y="6" width="17" height="12" rx="1" /><path d="m4 7 8 6 8-6" /></>,
  wifiOff: <><path d="m3 3 18 18" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M5 12.5a10 10 0 0 1 4-2.3M19 12.5a10 10 0 0 0-3.2-2" /><path d="M2 8.8a15 15 0 0 1 4.4-2.6M22 8.8A15 15 0 0 0 11 5" /><circle cx="12" cy="20" r=".6" /></>,
  alert: <><path d="M12 4 2.8 19.5h18.4L12 4Z" /><path d="M12 10v4.5" /><circle cx="12" cy="17" r=".6" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  upload: <><path d="M12 15.5V4.5" /><path d="m7.5 9 4.5-4.5L16.5 9" /><path d="M4.5 15v4.5h15V15" /></>,
  arrowUp: <><path d="M12 19V5" /><path d="m6.5 10.5 5.5-5.5 5.5 5.5" /></>,
  arrowDown: <><path d="M12 5v14" /><path d="m6.5 13.5 5.5 5.5 5.5-5.5" /></>,
  trash: <><path d="M4.5 7h15" /><path d="M9.5 7V4.5h5V7" /><path d="M6.5 7l1 12.5h9l1-12.5" /></>,
  edit: <><path d="M4.5 19.5h4l10-10-4-4-10 10v4Z" /><path d="m13 7 4 4" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  minus: <path d="M5 12h14" />,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5S9.6 5.9 12 3.5Z" /></>,
  mapPin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.25" /></>,
  package: <><path d="M4 7.5 12 3.5l8 4v9l-8 4-8-4v-9Z" /><path d="m4 7.5 8 4 8-4" /><path d="M12 11.5v9" /></>,
  logout: <><path d="M14 4.5H5.5v15H14" /><path d="M10 12h10" /><path d="m16.5 8.5 3.5 3.5-3.5 3.5" /></>,
  bookmark: <path d="M6.5 4.5h11v15.5L12 16l-5.5 4V4.5Z" />,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="1" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  image: <><rect x="4" y="4.5" width="16" height="15" rx="1" /><circle cx="9" cy="9.5" r="1.5" /><path d="m4.5 17 4.5-4.5 3 3 3-3 4.5 4.5" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.75" /></>,
  grip: <><circle cx="9" cy="6.5" r=".9" /><circle cx="15" cy="6.5" r=".9" /><circle cx="9" cy="12" r=".9" /><circle cx="15" cy="12" r=".9" /><circle cx="9" cy="17.5" r=".9" /><circle cx="15" cy="17.5" r=".9" /></>,
  star: <path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8L12 3.8Z" />,
  whatsapp: (
    <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5Zm4.6 11.7c-.2.6-1.1 1.1-1.6 1.2-.4.1-.9.1-1.5-.1-.3-.1-.8-.3-1.4-.5-2.4-1-4-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.6-.3h.5c.1 0 .4 0 .6.4l.8 1.9c.1.1.1.3 0 .5l-.3.4-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-.9c.2-.3.4-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.7-.2 1.3Z" />
  ),
  instagram: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17" cy="7" r=".6" /></>,
  tiktok: <path d="M14 4v10.2a3.3 3.3 0 1 1-3.3-3.3M14 4c.4 2.3 2 3.9 4.5 4.1" />,
  facebook: <path d="M14.5 8H13a1.5 1.5 0 0 0-1.5 1.5V20M9 12.5h5.5M15.5 4H13a4 4 0 0 0-4 4v1" />,
  youtube: (
    <>
      <rect x="2.75" y="5.75" width="18.5" height="12.5" rx="3.5" />
      <path d="m10.25 9.25 4.5 2.75-4.5 2.75z" />
    </>
  ),
  phone: <path d="M5.5 3.75h3l1.5 4-2 1.25a11 11 0 0 0 7 7l1.25-2 4 1.5v3a1.75 1.75 0 0 1-1.75 1.75A16.25 16.25 0 0 1 3.75 5.5 1.75 1.75 0 0 1 5.5 3.75Z" />,
};

const FILLED = new Set(["whatsapp"]);

export function Icon({ name, className, title, filled = false, strokeWidth = 1.5 }) {
  const isFilled = filled || FILLED.has(name);
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-5 shrink-0", className)}
      fill={isFilled ? "currentColor" : "none"}
      stroke={isFilled && name === "whatsapp" ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
