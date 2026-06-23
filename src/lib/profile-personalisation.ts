export const BANNER_THEME_OPTIONS = [
  { value: "classic", label: "Classic" },
  { value: "midnight", label: "Midnight" },
  { value: "emerald", label: "Emerald" },
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
  { value: "gold", label: "Gold" },
] as const;

export const ACCENT_THEME_OPTIONS = [
  { value: "emerald", label: "Emerald" },
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
  { value: "gold", label: "Gold" },
  { value: "red", label: "Red" },
] as const;

export type BannerTheme = (typeof BANNER_THEME_OPTIONS)[number]["value"];
export type AccentTheme = (typeof ACCENT_THEME_OPTIONS)[number]["value"];

const bannerThemeClasses: Record<BannerTheme, string> = {
  classic: "border-white/10 bg-white/[0.04]",
  midnight: "border-slate-400/20 bg-slate-950/85",
  emerald: "border-emerald-400/25 bg-emerald-950/55",
  blue: "border-sky-400/25 bg-sky-950/55",
  purple: "border-violet-400/25 bg-violet-950/50",
  gold: "border-yellow-300/25 bg-yellow-950/45",
};

const accentThemeClasses: Record<
  AccentTheme,
  { text: string; border: string; surface: string }
> = {
  emerald: {
    text: "text-emerald-200",
    border: "border-emerald-400/25",
    surface: "bg-emerald-400/10",
  },
  blue: {
    text: "text-sky-200",
    border: "border-sky-400/25",
    surface: "bg-sky-400/10",
  },
  purple: {
    text: "text-violet-200",
    border: "border-violet-400/25",
    surface: "bg-violet-400/10",
  },
  gold: {
    text: "text-yellow-100",
    border: "border-yellow-300/25",
    surface: "bg-yellow-300/10",
  },
  red: {
    text: "text-red-200",
    border: "border-red-400/25",
    surface: "bg-red-400/10",
  },
};

export function isBannerTheme(value: string): value is BannerTheme {
  return BANNER_THEME_OPTIONS.some((option) => option.value === value);
}

export function isAccentTheme(value: string): value is AccentTheme {
  return ACCENT_THEME_OPTIONS.some((option) => option.value === value);
}

export function getBannerThemeClasses(value: string | null | undefined) {
  const theme = value && isBannerTheme(value) ? value : "classic";
  return bannerThemeClasses[theme];
}

export function getAccentThemeClasses(value: string | null | undefined) {
  const theme = value && isAccentTheme(value) ? value : "emerald";
  return accentThemeClasses[theme];
}
