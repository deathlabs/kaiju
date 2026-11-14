import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import GroupsIcon from '@mui/icons-material/Groups'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import FormLabel from '@mui/material/FormLabel'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

type ExerciseType = 'discussion' | 'discussion_and_hands_on'
type ExerciseStatus = 'planned' | 'prepared' | 'in_progress' | 'completed'

interface Exercise {
  id: string
  scheduled_start_time: string
  scheduled_end_time: string
  type: ExerciseType
  title: string
  status: ExerciseStatus
}

interface ExerciseForm {
  title: string
  type: ExerciseType
  scheduledStartTime: string
  scheduledEndTime: string
  scenario: string
}

const exercisesUrl = '/api/v1/exercises/'
const steps = ['Exercise details', 'Scenario']
const emptyForm: ExerciseForm = {
  title: '',
  type: 'discussion',
  scheduledStartTime: '',
  scheduledEndTime: '',
  scenario: '',
}

const typeLabels: Record<ExerciseType, string> = {
  discussion: 'Discussion',
  discussion_and_hands_on: 'Discussion and hands-on',
}

const statusLabels: Record<ExerciseStatus, string> = {
  planned: 'Planned',
  prepared: 'Prepared',
  in_progress: 'In progress',
  completed: 'Completed',
}

const getErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { detail?: unknown; message?: string }

    if (body.message) return body.message
    if (typeof body.detail === 'string') return body.detail
  } catch {
    // The API did not return a JSON error response.
  }

  return `The request failed with status ${response.status}.`
}

const formatSchedule = (start: string, end: string) => {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const date = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(startDate)
  const time = new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
  })

  return `${date}, ${time.format(startDate)}–${time.format(endDate)}`
}

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [form, setForm] = useState<ExerciseForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadExercises = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setPageError(null)

    try {
      const response = await fetch(exercisesUrl, { signal })

      if (!response.ok) throw new Error(await getErrorMessage(response))

      setExercises((await response.json()) as Exercise[])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return

      setPageError(
        error instanceof Error ? error.message : 'Could not load exercises.',
      )
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadExercises(controller.signal)

    return () => controller.abort()
  }, [loadExercises])

  const openCreateForm = () => {
    setForm(emptyForm)
    setActiveStep(0)
    setFormError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    if (!saving) setFormOpen(false)
  }

  const continueToScenario = () => {
    if (
      !form.title.trim() ||
      !form.scheduledStartTime ||
      !form.scheduledEndTime
    ) {
      setFormError('Enter a title, start time, and end time.')
      return
    }

    if (new Date(form.scheduledEndTime) <= new Date(form.scheduledStartTime)) {
      setFormError('Set the end time after the start time.')
      return
    }

    setFormError(null)
    setActiveStep(1)
  }

  const createExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (activeStep === 0) {
      continueToScenario()
      return
    }

    if (!form.scenario.trim()) {
      setFormError('Enter the initial conditions for the scenario.')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      const response = await fetch(exercisesUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          type: form.type,
          scheduled_start_time: new Date(form.scheduledStartTime).toISOString(),
          scheduled_end_time: new Date(form.scheduledEndTime).toISOString(),
          scenario: form.scenario.trim(),
        }),
      })

      if (!response.ok) throw new Error(await getErrorMessage(response))

      const exercise = (await response.json()) as Exercise
      setExercises((currentExercises) => [...currentExercises, exercise])
      setFormOpen(false)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not create the exercise.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Box
        sx={{
          alignItems: { sm: 'center' },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography color="text.secondary">
          Build and prepare tabletop exercises before facilitation begins.
        </Typography>
        <Button
          onClick={openCreateForm}
          startIcon={<AddIcon />}
          variant="contained"
        >
          Create exercise
        </Button>
      </Box>

      {pageError && (
        <Alert
          action={
            <Button color="inherit" onClick={() => void loadExercises()}>
              Retry
            </Button>
          }
          severity="error"
          sx={{ mb: 2 }}
        >
          {pageError}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress aria-label="Loading exercises" />
        </Box>
      ) : exercises.length === 0 ? (
        <Paper sx={{ p: { xs: 3, sm: 6 }, textAlign: 'center' }} variant="outlined">
          <GroupsIcon color="secondary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography component="h2" gutterBottom variant="h6">
            Create your first exercise
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Start with the schedule and scenario. Add the plan after you create it.
          </Typography>
          <Button onClick={openCreateForm} startIcon={<AddIcon />} variant="contained">
            Create exercise
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {exercises.map((exercise) => (
            <Grid key={exercise.id} size={{ xs: 12, md: 6, xl: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ justifyContent: 'space-between' }}
                  >
                    <Chip label={statusLabels[exercise.status]} size="small" />
                    <Typography color="text.secondary" variant="caption">
                      {typeLabels[exercise.type]}
                    </Typography>
                  </Stack>
                  <Typography component="h2" sx={{ mt: 2 }} variant="h6">
                    {exercise.title}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'center',
                      color: 'text.secondary',
                      mt: 2,
                    }}
                  >
                    <CalendarMonthIcon fontSize="small" />
                    <Typography variant="body2">
                      {formatSchedule(
                        exercise.scheduled_start_time,
                        exercise.scheduled_end_time,
                      )}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog fullWidth maxWidth="md" onClose={closeForm} open={formOpen}>
        <Box component="form" onSubmit={createExercise}>
          <DialogTitle>Create exercise</DialogTitle>
          <DialogContent>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {steps.map((step) => (
                <Step key={step}>
                  <StepLabel>{step}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            {activeStep === 0 ? (
              <Stack spacing={2}>
                <TextField
                  autoFocus
                  fullWidth
                  label="Exercise title"
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value,
                    }))
                  }
                  required
                  value={form.title}
                />
                <FormControl>
                  <FormLabel>Exercise type</FormLabel>
                  <RadioGroup
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        type: event.target.value as ExerciseType,
                      }))
                    }
                    value={form.type}
                  >
                    <FormControlLabel
                      control={<Radio />}
                      label="Discussion"
                      value="discussion"
                    />
                    <FormHelperText sx={{ ml: 4 }}>
                      Participants discuss decisions, responsibilities, and procedures.
                    </FormHelperText>
                    <FormControlLabel
                      control={<Radio />}
                      label="Discussion and hands-on"
                      value="discussion_and_hands_on"
                    />
                    <FormHelperText sx={{ ml: 4 }}>
                      Participants also perform technical actions in a safe environment.
                    </FormHelperText>
                  </RadioGroup>
                </FormControl>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Scheduled start"
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          scheduledStartTime: event.target.value,
                        }))
                      }
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                      type="datetime-local"
                      value={form.scheduledStartTime}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Scheduled end"
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          scheduledEndTime: event.target.value,
                        }))
                      }
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                      type="datetime-local"
                      value={form.scheduledEndTime}
                    />
                  </Grid>
                </Grid>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Alert severity="info">
                  State the initial conditions. Include the time, affected environment,
                  and first observable problem. Do not describe the response.
                </Alert>
                <TextField
                  autoFocus
                  fullWidth
                  helperText="Example: At 0400, unknown outbound network activity was observed from the production environment."
                  label="Scenario"
                  minRows={7}
                  multiline
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      scenario: event.target.value,
                    }))
                  }
                  required
                  value={form.scenario}
                />
                <Typography color="text.secondary" variant="body2">
                  After creation, you can add objectives, references, participants,
                  events, and injects to complete the exercise plan.
                </Typography>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
            <Box>
              {activeStep === 1 && (
                <Button
                  disabled={saving}
                  onClick={() => {
                    setFormError(null)
                    setActiveStep(0)
                  }}
                  startIcon={<ArrowBackIcon />}
                >
                  Back
                </Button>
              )}
            </Box>
            <Stack direction="row" spacing={1}>
              <Button color="inherit" disabled={saving} onClick={closeForm}>
                Cancel
              </Button>
              <Button
                disabled={saving}
                endIcon={activeStep === 0 ? <ArrowForwardIcon /> : undefined}
                type="submit"
                variant="contained"
              >
                {activeStep === 0
                  ? 'Continue'
                  : saving
                    ? 'Creating…'
                    : 'Create exercise'}
              </Button>
            </Stack>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  )
}
