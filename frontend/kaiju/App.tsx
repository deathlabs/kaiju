import CodeIcon from '@mui/icons-material/Code'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FeedbackIcon from '@mui/icons-material/Feedback'
import FlagIcon from '@mui/icons-material/Flag'
import FolderIcon from '@mui/icons-material/Folder'
import HeadsetIcon from '@mui/icons-material/Headset'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

import {
  DeathlabsAppLayout,
  DeathlabsClassification,
  DeathlabsPageContent,
  DeathlabsPageHeader,
  DeathlabsThemeProvider,
} from './components'
import { ReferencesPage } from './ReferencesPage'

const sideNavBar = {
  items: [
    { name: 'Dashboard', href: '#dashboard', icon: <DashboardIcon /> },
    { name: 'Exercises', href: '#exercises', icon: <FolderIcon /> },
    { name: 'Objectives', href: '#objectives', icon: <TrackChangesIcon /> },
    { name: 'References', href: '#references', icon: <FlagIcon /> },
  ],
}

const topNavBar = {
  title: 'Kaiju',
  userMenu: [
    {
      name: 'User guide',
      href: 'https://github.com/deathlabs/kaiju',
      icon: <MenuBookIcon />,
    },
    {
      name: 'Developer guide',
      href: 'https://github.com/deathlabs/kaiju',
      icon: <CodeIcon />,
    },
    {
      name: 'Submit feedback',
      href: 'https://github.com/deathlabs/kaiju',
      icon: <FeedbackIcon />,
    },
    {
      name: 'Contact us',
      href: 'https://github.com/deathlabs/kaiju',
      icon: <HeadsetIcon />,
    },
  ],
}

const pageTitles = {
  '#dashboard': 'Dashboard',
  '#exercises': 'Exercises',
  '#objectives': 'Objectives',
  '#references': 'References',
} as const

type PageHref = keyof typeof pageTitles

const getPageHref = (): PageHref => {
  const hash = window.location.hash as PageHref

  return hash in pageTitles ? hash : '#dashboard'
}

function App() {
  const [pageHref, setPageHref] = useState(getPageHref)

  useEffect(() => {
    const updatePage = () => setPageHref(getPageHref())

    window.addEventListener('hashchange', updatePage)

    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  return (
    <DeathlabsThemeProvider>
      <DeathlabsAppLayout
        classification={DeathlabsClassification.UNCLASSIFIED}
        sideNavBar={sideNavBar}
        topNavBar={topNavBar}
      >
        <DeathlabsPageContent>
          <DeathlabsPageHeader>{pageTitles[pageHref]}</DeathlabsPageHeader>
          {pageHref === '#dashboard' && (
            <Typography color="text.secondary">
              Plan, conduct, and review tabletop exercises.
            </Typography>
          )}
          {pageHref === '#references' && <ReferencesPage />}
        </DeathlabsPageContent>
      </DeathlabsAppLayout>
    </DeathlabsThemeProvider>
  )
}

export default App

