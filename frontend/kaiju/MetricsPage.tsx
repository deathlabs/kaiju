import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

interface Metrics {
  exercises: number
  objectives: number
  references: number
  users: number
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

  if (error) return <Alert severity="error">Could not load metrics.</Alert>
  if (!metrics) return <CircularProgress aria-label="Loading metrics" />

  return (
    <Card>
      <CardContent>
        <Grid container spacing={3}>
          {(Object.keys(metricLabels) as (keyof Metrics)[]).map((metric) => (
            <Grid key={metric} size={{ xs: 6, md: 3 }}>
              <Typography color="text.secondary" variant="body2">
                {metricLabels[metric]}
              </Typography>
              <Typography component="p" variant="h4">
                {metrics[metric]}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}
