import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import AppBar, { type AppBarProps } from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Toolbar, { type ToolbarProps } from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { forwardRef, type ReactNode } from 'react'

import { useDeathlabsColorMode } from './DeathlabsThemeProvider'
import type { DeathlabsNavBarItem } from './types'
import { DeathlabsUserMenu } from './DeathlabsUserMenu'

export interface DeathlabsTopNavBarProps
  extends Omit<AppBarProps, 'children' | 'title'> {
  title?: ReactNode
  userMenu: readonly DeathlabsNavBarItem[]
  toolbarProps?: ToolbarProps
}

export const DeathlabsTopNavBar = forwardRef<
  HTMLElement,
  DeathlabsTopNavBarProps
>(function DeathlabsTopNavBar(
  { title, userMenu, toolbarProps, position = 'sticky', ...props },
  ref,
) {
  const { mode, toggleColorMode } = useDeathlabsColorMode()

  return (
    <AppBar ref={ref} position={position} {...props}>
      <Toolbar {...toolbarProps}>
        <Box sx={{ alignItems: 'center', display: 'flex', flexGrow: 1 }}>
          {typeof title === 'string' ? (
            <Typography component="div" variant="h6">
              {title}
            </Typography>
          ) : (
            title
          )}
        </Box>
        <IconButton
          aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          color="inherit"
          onClick={toggleColorMode}
        >
          {mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
        <DeathlabsUserMenu items={userMenu} />
      </Toolbar>
    </AppBar>
  )
})

DeathlabsTopNavBar.displayName = 'DeathlabsTopNavBar'
