import AddLinkIcon from '@mui/icons-material/AddLink'
import CodeIcon from '@mui/icons-material/Code'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import FeedbackIcon from '@mui/icons-material/Feedback'
import FlagIcon from '@mui/icons-material/Flag'
import HeadsetIcon from '@mui/icons-material/Headset'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import { useEffect, useState } from 'react'

import {
  DeathlabsAppLayout,
  DeathlabsClassification,
  DeathlabsPageContent,
  DeathlabsPageHeader,
  DeathlabsThemeProvider,
} from './components'
import { ExercisesPage } from './pages/ExercisesPage'
import { ExerciseRun } from './pages/ExerciseRun'
import { MetricsPage } from './pages/MetricsPage'
import { ObjectivesPage } from './pages/ObjectivesPage'
import { ReferencesPage } from './pages/ReferencesPage'

const sideNavBar = {
  items: [
    { name: 'Metrics', href: '#metrics', icon: <AnalyticsIcon /> },
    { name: 'Exercises', href: '#exercises', icon: <ContentPasteIcon /> },
    { name: 'Objectives', href: '#objectives', icon: <FlagIcon /> },
    { name: 'References', href: '#references', icon: <AddLinkIcon /> },
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
  '#metrics': 'Metrics',
  '#exercises': 'Exercises',
  '#objectives': 'Objectives',
  '#references': 'References',
} as const

type PageHref = keyof typeof pageTitles

const getPageHref = (): PageHref => {
  const hash = window.location.hash as PageHref

  return hash in pageTitles ? hash : '#metrics'
}

function App() {
  const [hash, setHash] = useState(() => window.location.hash)
  const pageHref = getPageHref()
  const exerciseRun = hash.match(/^#exercises\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/run$/i)

  useEffect(() => {
    const updatePage = () => setHash(window.location.hash)

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
          {!exerciseRun && <DeathlabsPageHeader>{pageTitles[pageHref]}</DeathlabsPageHeader>}
          {exerciseRun && <ExerciseRun exerciseId={exerciseRun[1]} onClose={() => { window.location.hash = '#exercises' }} />}
          {!exerciseRun && pageHref === '#metrics' && <MetricsPage />}
          {pageHref === '#exercises' && <ExercisesPage />}
          {pageHref === '#objectives' && <ObjectivesPage />}
          {pageHref === '#references' && <ReferencesPage />}
        </DeathlabsPageContent>
      </DeathlabsAppLayout>
    </DeathlabsThemeProvider>
  )
}

export default App

