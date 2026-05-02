import data from "./themes.json";

/** A user-installable theme — one block of CSS variables for light, one
 *  for dark. Sourced from a shadcn / tweakcn registry URL via
 *  `yarn themes:add <url>`. */
export type Theme = {
  id: string;
  name: string;
  source?: string;
  cssVars: {
    theme?: Record<string, string>;
    light: Record<string, string>;
    dark: Record<string, string>;
  };
};

export const THEMES: readonly Theme[] = data as Theme[];

export const STORAGE_KEY = "ft-theme-id";

const ALL_VAR_NAMES: readonly string[] = (() => {
  const set = new Set<string>();
  for (const t of THEMES) {
    for (const k of Object.keys(t.cssVars.light)) set.add(k);
    for (const k of Object.keys(t.cssVars.dark)) set.add(k);
  }
  return [...set];
})();

/** Strip every var any installed theme can set — used when switching
 *  away from the active theme so its colors don't bleed into the next. */
export function clearThemeVars(root: HTMLElement) {
  for (const k of ALL_VAR_NAMES) root.style.removeProperty(`--${k}`);
}

export function applyTheme(root: HTMLElement, theme: Theme, mode: "light" | "dark") {
  clearThemeVars(root);
  const vars = mode === "dark" ? theme.cssVars.dark : theme.cssVars.light;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(`--${k}`, v);
  }
}

export function findTheme(id: string | null | undefined): Theme | undefined {
  if (!id) return undefined;
  return THEMES.find((t) => t.id === id);
}

/** Inline-script body that runs synchronously in <head> before paint —
 *  prevents the user's saved theme from flashing the default one. */
export function buildBootstrapScript(): string {
  const json = JSON.stringify(THEMES);
  return `(function(){try{var id=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(!id)return;var themes=${json};var t=themes.find(function(x){return x.id===id});if(!t)return;var isDark=document.documentElement.classList.contains('dark');var vars=isDark?t.cssVars.dark:t.cssVars.light;for(var k in vars){document.documentElement.style.setProperty('--'+k,vars[k])}}catch(e){}})();`;
}
