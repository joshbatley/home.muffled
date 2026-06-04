import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

const STORAGE_KEY = "theme"

const themeFavicons = {
  light: "/logo-ink.svg",
  dark: "/logo-paper.svg",
} as const

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
} | null>(null)

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyFavicon(theme: Theme) {
  const href = themeFavicons[theme]
  document
    .querySelectorAll<HTMLLinkElement>("link[data-theme-icon]")
    .forEach((link) => {
      link.href = href
    })
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  applyFavicon(theme)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const initial =
      stored === "dark" || stored === "light" ? stored : getSystemTheme()
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  function setTheme(next: Theme) {
    setThemeState(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

export const themeInitScript = `(function(){try{var s=localStorage.getItem("${STORAGE_KEY}");var t=s==="dark"||s==="light"?s:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(t==="dark")document.documentElement.classList.add("dark");var h=t==="dark"?"${themeFavicons.dark}":"${themeFavicons.light}";document.querySelectorAll("link[data-theme-icon]").forEach(function(l){l.href=h})}catch(e){}})()`
