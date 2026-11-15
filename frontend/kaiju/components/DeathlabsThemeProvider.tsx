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
    primary: '#7526AD', primaryHover: '#8531C2',
    background: '#F2F2F2', surface: '#FFFFFF', border: '#D9D9D9',
    text: '#1A1A1A', textMuted: '#595959', onPrimary: '#FFFFFF',
    classification: {
      unclassified: '#007A33', cui: '#502B85', confidential: '#0033A0',
      secret: '#C8102E', topSecret: '#FF8C00', topSecretSci: '#FCE83A',
    },
  },
  rounded: { md: 8 },
  spacing: { sm: 8, md: 12, lg: 16 },
} satisfies DeathlabsThemeTokens

export const createDeathlabsTheme = (mode: PaletteMode) => {
  const darkMode = mode === 'dark'
  const surface = darkMode ? '#262626' : '#FFFFFF'
  const border = darkMode ? '#404040' : '#D9D9D9'
  const strongBorder = darkMode ? '#595959' : '#A6A6A6'
  const accentText = darkMode ? '#E0C2F5' : '#5E188F'
  const selected = darkMode ? '#2C1C38' : '#F4EBFA'

  return createTheme({
    cssVariables: true,
    spacing: 8,
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif', fontSize: 16,
      fontWeightRegular: 400, fontWeightMedium: 500, fontWeightBold: 500,
      h4: { fontSize: 28, fontWeight: 500, lineHeight: 1.3 },
      h6: { fontSize: 18, fontWeight: 500, lineHeight: 1.4 },
      body1: { fontSize: 16, fontWeight: 400, lineHeight: 1.5 },
      body2: { fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
      caption: { fontSize: 14, fontWeight: 400 },
      button: { fontSize: 15, fontWeight: 500, textTransform: 'none' },
    },
    palette: {
      mode,
      primary: { main: '#7526AD', light: '#8531C2', dark: '#5E188F', contrastText: '#FFFFFF' },
      secondary: { main: accentText },
      accent: { main: '#7526AD', contrastText: '#FFFFFF' },
      background: { default: darkMode ? '#1A1A1A' : '#F2F2F2', paper: surface },
      text: { primary: darkMode ? '#F2F2F2' : '#1A1A1A', secondary: darkMode ? '#A6A6A6' : '#595959' },
      divider: border,
    },
    components: {
      MuiAppBar: { defaultProps: { color: 'inherit', elevation: 0 }, styleOverrides: { root: { backgroundColor: surface, borderBottom: `0.5px solid ${border}`, backgroundImage: 'none' } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', boxShadow: 'none' }, outlined: { border: `0.5px solid ${border}` } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8, minHeight: 44, padding: '0 16px',
            '&.MuiButton-containedPrimary': { padding: '0 18px', '&:hover': { backgroundColor: '#8531C2' }, '&:active': { backgroundColor: '#5E188F' } },
            '&.MuiButton-outlinedPrimary': { borderColor: darkMode ? strongBorder : '#7526AD', color: darkMode ? '#F2F2F2' : '#7526AD' },
            '&.MuiButton-textPrimary': { color: accentText },
          },
        },
      },
      MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
      MuiCard: { styleOverrides: { root: { borderRadius: 12, border: `0.5px solid ${border}` } } },
      MuiCardContent: { styleOverrides: { root: { padding: '18px 20px', '&:last-child': { paddingBottom: 18 } } } },
      MuiOutlinedInput: { styleOverrides: { root: { minHeight: 44, backgroundColor: surface, borderRadius: 8, '& .MuiOutlinedInput-notchedOutline': { borderColor: strongBorder, borderWidth: '0.5px' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accentText } } } },
      MuiInputLabel: { styleOverrides: { root: { '&.Mui-focused': { color: accentText } } } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 8, color: darkMode ? '#A6A6A6' : '#595959', '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: selected, color: accentText }, '&.Mui-selected .MuiTypography-root': { fontWeight: 500 } } } },
      MuiTab: { styleOverrides: { root: { minHeight: 44, '&.Mui-selected': { color: accentText } } } },
      MuiLink: { styleOverrides: { root: { color: accentText } } },
      MuiTableContainer: { styleOverrides: { root: { border: `0.5px solid ${border}`, borderRadius: 12, backgroundColor: surface } } },
      MuiTableCell: { styleOverrides: { root: { borderBottom: `0.5px solid ${border}`, padding: '14px 16px' }, head: { color: darkMode ? '#A6A6A6' : '#595959', fontSize: 14, fontWeight: 400, padding: '12px 16px' } } },
      MuiTableRow: { styleOverrides: { root: { '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: selected } } } },
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
