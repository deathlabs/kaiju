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
    darkPrimary: string
    darkPrimaryHover: string
    darkBackground: string
    darkSurface: string
    darkBorder: string
    darkText: string
    darkTextMuted: string
    darkOnPrimary: string
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
  interface Theme {
    deathlabs: DeathlabsThemeTokens
  }

  interface ThemeOptions {
    deathlabs?: DeathlabsThemeTokens
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
    darkPrimary: '#60A5FA',
    darkPrimaryHover: '#93C5FD',
    darkBackground: '#0F172A',
    darkSurface: '#1E293B',
    darkBorder: '#334155',
    darkText: '#F8FAFC',
    darkTextMuted: '#94A3B8',
    darkOnPrimary: '#0F172A',
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
  const colors = {
    primary: darkMode
      ? deathlabsTokens.colors.darkPrimary
      : deathlabsTokens.colors.primary,
    primaryHover: darkMode
      ? deathlabsTokens.colors.darkPrimaryHover
      : deathlabsTokens.colors.primaryHover,
    background: darkMode
      ? deathlabsTokens.colors.darkBackground
      : deathlabsTokens.colors.background,
    surface: darkMode
      ? deathlabsTokens.colors.darkSurface
      : deathlabsTokens.colors.surface,
    border: darkMode
      ? deathlabsTokens.colors.darkBorder
      : deathlabsTokens.colors.border,
    text: darkMode
      ? deathlabsTokens.colors.darkText
      : deathlabsTokens.colors.text,
    textMuted: darkMode
      ? deathlabsTokens.colors.darkTextMuted
      : deathlabsTokens.colors.textMuted,
    onPrimary: darkMode
      ? deathlabsTokens.colors.darkOnPrimary
      : deathlabsTokens.colors.onPrimary,
  }

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
      background: { default: colors.background, paper: colors.surface },
      primary: {
        main: colors.primary,
        dark: colors.primaryHover,
        contrastText: colors.onPrimary,
      },
      secondary: { main: colors.primary },
      text: {
        primary: colors.text,
        secondary: colors.textMuted,
      },
      divider: colors.border,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: deathlabsTokens.rounded.md,
            textTransform: 'none',
            '&.MuiButton-containedPrimary': {
              backgroundColor: colors.primary,
              color: colors.onPrimary,
              padding: 12,
              '&:hover': {
                backgroundColor: colors.primaryHover,
              },
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: colors.surface,
            borderColor: colors.border,
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
