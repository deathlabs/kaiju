import Box from '@mui/material/Box'
import type { ReactNode } from 'react'

import {
  DeathlabsClassification,
  DeathlabsClassificationBanner,
} from './DeathlabsClassificationBanner'
import { DeathlabsSideNavBar } from './DeathlabsSideNavBar'
import { DeathlabsTopNavBar } from './DeathlabsTopNavBar'
import type { DeathlabsNavBarItem } from './types'

export interface DeathlabsAppLayoutTopNavBar {
  title: ReactNode
  userMenu: readonly DeathlabsNavBarItem[]
}

export interface DeathlabsAppLayoutSideNavBar {
  items: readonly DeathlabsNavBarItem[]
}

export interface DeathlabsAppLayoutProps {
  classification: DeathlabsClassification
  topNavBar: DeathlabsAppLayoutTopNavBar
  sideNavBar: DeathlabsAppLayoutSideNavBar
  children?: ReactNode
}

export const DeathlabsAppLayout = ({
  classification,
  topNavBar,
  sideNavBar,
  children,
}: DeathlabsAppLayoutProps) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}
  >
    <Box sx={{ flexShrink: 0 }}>
      <DeathlabsClassificationBanner
        type={classification}
        sx={{ position: 'static', width: '100%' }}
      />
    </Box>
    <Box
      sx={{
        flexShrink: 0,
        position: 'relative',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <DeathlabsTopNavBar
        data-testid="top-navigation"
        position="static"
        title={topNavBar.title}
        userMenu={topNavBar.userMenu}
      />
    </Box>
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <DeathlabsSideNavBar items={sideNavBar.items} />
      <Box
        component="main"
        sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'auto' }}
      >
        {children}
      </Box>
    </Box>
  </Box>
)

DeathlabsAppLayout.displayName = 'DeathlabsAppLayout'
