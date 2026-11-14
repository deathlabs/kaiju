import CssBaseline from '@mui/material/CssBaseline'
import {
  createTheme,
  ThemeProvider,
  type PaletteMode,
} from '@mui/material/styles'
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface DeathlabsThemeTokens {
  colors: {
    ember: string
    raisedSurface: string
    classification: {
      unclassified: string
      cui: string
      confidential: string
      secret: string
      topSecret: string
      topSecretSci: string
    }
  }
  shadows: {
    glow: string
  }
}

declare module '@mui/material/styles' {
  interface Theme {
    deathlabs: DeathlabsThemeTokens
  }

  interface ThemeOptions {
    deathlabs?: DeathlabsThemeTokens
  }
}

export const deathlabsTokens = {
  colors: {
    ember: '#4D1E4A',
    raisedSurface: '#3F3542',
    classification: {
      unclassified: '#007A33',
      cui: '#502B85',
      confidential: '#0033A0',
      secret: '#C8102E',
      topSecret: '#FF8C00',
      topSecretSci: '#FCE83A',
    },
  },
  shadows: {
    glow: '0 0 12px rgba(224,87,201,0.7)',
  },
} satisfies DeathlabsThemeTokens

export const createDeathlabsTheme = (mode: PaletteMode) =>
  createTheme({
    typography: {
      fontFamily: "'JetBrains Mono', monospace",
    },
    palette: {
      mode,
      background:
        mode === 'dark'
          ? { default: '#261D29', paper: '#342B37' }
          : { default: '#F7F4F8', paper: '#FFFFFF' },
      primary: {
        main: '#54485A',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#E057C9',
      },
      divider:
        mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)',
    },
    deathlabs: deathlabsTokens,
  })

interface DeathlabsColorMode {
  mode: PaletteMode
  toggleColorMode: () => void
}

const DeathlabsColorModeContext = createContext<DeathlabsColorMode>({
  mode: 'dark',
  toggleColorMode: () => undefined,
})

export const useDeathlabsColorMode = () =>
  useContext(DeathlabsColorModeContext)

export interface DeathlabsThemeProviderProps {
  children: ReactNode
}

export function DeathlabsThemeProvider({
  children,
}: DeathlabsThemeProviderProps) {
  const [mode, setMode] = useState<PaletteMode>('dark')
  const theme = useMemo(() => createDeathlabsTheme(mode), [mode])
  const colorMode = useMemo<DeathlabsColorMode>(
    () => ({
      mode,
      toggleColorMode: () =>
        setMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark')),
    }),
    [mode],
  )

  return (
    <DeathlabsColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </DeathlabsColorModeContext.Provider>
  )
}
