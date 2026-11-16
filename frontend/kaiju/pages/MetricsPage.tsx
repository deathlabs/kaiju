import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

interface Metrics {
  exercises: number
  objectives: number
  references: number
  users: number
}

interface User {
  username: string
  display_name: string
}

const metricLabels: Record<keyof Metrics, string> = {
  exercises: 'Exercises',
  objectives: 'Objectives',
  references: 'References',
  users: 'Users',
}

export function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)
  const [users, setUsers] = useState<User[] | null>(null)
  const [usersError, setUsersError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/v1/metrics', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load metrics.')

        return response.json() as Promise<Metrics>
      })
      .then(setMetrics)
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          return
        }

        setError(true)
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!usersOpen) return

    const controller = new AbortController()
    setUsers(null)
    setUsersError(false)
    fetch('/api/v1/users', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load users.')

        return response.json() as Promise<User[]>
      })
      .then(setUsers)
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setUsersError(true)
      })

    return () => controller.abort()
  }, [usersOpen])

  if (error) return <Alert severity="error">Could not load metrics.</Alert>
  if (!metrics) return <CircularProgress aria-label="Loading metrics" />

  return (
    <>
      <Grid container spacing={3}>
        {(Object.keys(metricLabels) as (keyof Metrics)[]).map((metric) => {
          const content = (
            <CardContent sx={{ textAlign: 'left' }}>
              <Typography color="text.secondary" variant="body2">
                {metricLabels[metric]}
              </Typography>
              <Typography component="p" variant="h4">
                {metrics[metric]}
              </Typography>
            </CardContent>
          )

          return (
            <Grid key={metric} size={{ xs: 6, md: 3 }}>
              <Card>
                {metric === 'users' ? (
                  <CardActionArea onClick={() => setUsersOpen(true)}>
                    {content}
                  </CardActionArea>
                ) : content}
              </Card>
            </Grid>
          )
        })}
      </Grid>
      <Dialog fullWidth maxWidth="sm" onClose={() => setUsersOpen(false)} open={usersOpen}>
        <DialogTitle>Users</DialogTitle>
        <DialogContent dividers>
          {usersError ? <Alert severity="error">Could not load users.</Alert> :
            users === null ? <CircularProgress aria-label="Loading users" /> :
              users.length === 0 ? <Typography>No users found.</Typography> : (
                <List>
                  {users.map((user) => (
                    <ListItem key={user.username} disablePadding>
                      <ListItemText primary={user.display_name} />
                    </ListItem>
                  ))}
                </List>
              )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-start' }}>
          <Button color="inherit" onClick={() => setUsersOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
