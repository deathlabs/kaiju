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
    primary: string
    primaryHover: string
    background: string
    surface: string
    border: string
    text: string
    textMuted: string
    onPrimary: string
    classification: {
      unclassified: string
      cui: string
      confidential: string
      secret: string
      topSecret: string
      topSecretSci: string
    }
  }
  rounded: { md: number }
  spacing: { sm: number; md: number; lg: number }
}

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary']
  }

  interface PaletteOptions {
    accent?: PaletteOptions['primary']
  }

  interface Theme {
    deathlabs: DeathlabsThemeTokens
  }

  interface ThemeOptions {
    deathlabs?: DeathlabsThemeTokens
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    accent: true
  }
}

export const deathlabsTokens = {
  colors: {
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    onPrimary: '#FFFFFF',
    classification: {
      unclassified: '#007A33',
      cui: '#502B85',
      confidential: '#0033A0',
      secret: '#C8102E',
      topSecret: '#FF8C00',
      topSecretSci: '#FCE83A',
    },
  },
  rounded: { md: 6 },
  spacing: { sm: 8, md: 16, lg: 24 },
} satisfies DeathlabsThemeTokens

export const createDeathlabsTheme = (mode: PaletteMode) => {
  const darkMode = mode === 'dark'

  return createTheme({
    cssVariables: true,
    spacing: deathlabsTokens.spacing.sm,
    shape: { borderRadius: deathlabsTokens.rounded.md },
    typography: {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: 16,
      body1: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.6,
      },
      h4: {
        fontSize: '2.25rem',
        fontWeight: 700,
        lineHeight: 1.2,
      },
    },
    palette: {
      mode,
      primary: { main: darkMode ? '#1E5A8A' : deathlabsTokens.colors.primary },
      secondary: { main: darkMode ? '#4F6D7A' : deathlabsTokens.colors.primary },
      accent: {
        main: '#F2A541',
        light: '#F5B767',
        dark: '#A9732E',
        contrastText: 'rgba(0, 0, 0, 0.87)',
      },
      background: {
        default: darkMode ? '#0F1720' : deathlabsTokens.colors.background,
        paper: darkMode ? '#17212B' : deathlabsTokens.colors.surface,
      },
      text: {
        primary: darkMode ? '#E6ECF2' : deathlabsTokens.colors.text,
        secondary: darkMode
          ? 'rgba(230, 236, 242, 0.6)'
          : deathlabsTokens.colors.textMuted,
      },
      divider: deathlabsTokens.colors.border,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: deathlabsTokens.rounded.md,
            textTransform: 'none',
            padding: 12,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: deathlabsTokens.rounded.md,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: deathlabsTokens.spacing.lg,
            '&:last-child': {
              paddingBottom: deathlabsTokens.spacing.lg,
            },
          },
        },
      },
    },
    deathlabs: deathlabsTokens,
  })
}

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
