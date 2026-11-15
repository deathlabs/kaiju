import AddIcon from '@mui/icons-material/Add'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import SearchIcon from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

interface ObjectiveExercise {
  id: string
  title: string
}

type ExerciseType = 'discussion' | 'discussion_and_hands_on'
type ExerciseStatus = 'planned' | 'prepared' | 'in_progress' | 'completed'

interface ExerciseDetails extends ObjectiveExercise {
  scheduled_start_time: string
  scheduled_end_time: string
  scenario: string
  status: ExerciseStatus
  type: ExerciseType
}

interface Objective {
  id: string
  exercise_count: number
  exercises?: ObjectiveExercise[]
  title: string
  description: string
  created_at: string
  updated_at: string
}

interface ObjectiveForm {
  title: string
  description: string
}

const objectivesUrl = '/api/v1/objectives/'
const exercisesUrl = '/api/v1/exercises/'
const emptyForm: ObjectiveForm = { title: '', description: '' }

const typeLabels: Record<ExerciseType, string> = {
  discussion: 'Discussion',
  discussion_and_hands_on: 'Discussion and Hands-On',
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

export function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingObjective, setEditingObjective] = useState<Objective | null>(
    null,
  )
  const [form, setForm] = useState<ObjectiveForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingObjective, setDeletingObjective] = useState<Objective | null>(
    null,
  )
  const [deleting, setDeleting] = useState(false)
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseDetails | null>(null)
  const [exerciseDetailsOpen, setExerciseDetailsOpen] = useState(false)
  const [exerciseDetailsLoading, setExerciseDetailsLoading] = useState(false)
  const [exerciseDetailsError, setExerciseDetailsError] = useState<string | null>(
    null,
  )

  const loadObjectives = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setPageError(null)

    try {
      const response = await fetch(objectivesUrl, { signal })

      if (!response.ok) throw new Error(await getErrorMessage(response))

      setObjectives((await response.json()) as Objective[])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return

      setPageError(
        error instanceof Error ? error.message : 'Could not load objectives.',
      )
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadObjectives(controller.signal)

    return () => controller.abort()
  }, [loadObjectives])

  const openCreateForm = () => {
    setEditingObjective(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  const openEditForm = (objective: Objective) => {
    setEditingObjective(objective)
    setForm({
      title: objective.title,
      description: objective.description,
    })
    setFormError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    if (!saving) setFormOpen(false)
  }

  const openDeleteConfirmation = () => {
    if (!editingObjective) return

    setDeletingObjective(editingObjective)
    setFormOpen(false)
  }

  const closeDeleteConfirmation = () => {
    if (deleting) return

    setDeletingObjective(null)
    setFormOpen(true)
  }

  const openExerciseDetails = async (exercise: ObjectiveExercise) => {
    setSelectedExercise(null)
    setExerciseDetailsError(null)
    setExerciseDetailsLoading(true)
    setExerciseDetailsOpen(true)

    try {
      const response = await fetch(`${exercisesUrl}${exercise.id}/`)

      if (!response.ok) throw new Error(await getErrorMessage(response))

      setSelectedExercise((await response.json()) as ExerciseDetails)
    } catch (error) {
      setExerciseDetailsError(
        error instanceof Error
          ? error.message
          : 'Could not load the exercise.',
      )
    } finally {
      setExerciseDetailsLoading(false)
    }
  }

  const closeExerciseDetails = () => {
    if (!exerciseDetailsLoading) setExerciseDetailsOpen(false)
  }

  const saveObjective = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)

    try {
      const url = editingObjective
        ? `${objectivesUrl}${editingObjective.id}/`
        : objectivesUrl
      const response = await fetch(url, {
        method: editingObjective ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
        }),
      })

      if (!response.ok) throw new Error(await getErrorMessage(response))

      const savedObjective = (await response.json()) as Objective
      setObjectives((currentObjectives) =>
        editingObjective
          ? currentObjectives.map((objective) =>
              objective.id === savedObjective.id ? savedObjective : objective,
            )
          : [...currentObjectives, savedObjective],
      )
      setFormOpen(false)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not save the objective.',
      )
    } finally {
      setSaving(false)
    }
  }

  const deleteObjective = async () => {
    if (!deletingObjective) return

    setDeleting(true)
    setPageError(null)

    try {
      const response = await fetch(`${objectivesUrl}${deletingObjective.id}/`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error(await getErrorMessage(response))

      setObjectives((currentObjectives) =>
        currentObjectives.filter(
          (objective) => objective.id !== deletingObjective.id,
        ),
      )
      setDeletingObjective(null)
      setEditingObjective(null)
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : 'Could not delete the objective.',
      )
      setDeletingObjective(null)
      setFormOpen(true)
    } finally {
      setDeleting(false)
    }
  }

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase()
  const filteredObjectives = objectives.filter((objective) =>
    [
      objective.title,
      objective.description,
      ...(objective.exercises?.map((exercise) => exercise.title) ?? []),
    ]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedSearchQuery),
  )

  return (
    <>
      <Box
        sx={{
          alignItems: { sm: 'center' },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <TextField
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by title, description, exercise, etc."
          size="small"
          slotProps={{
            htmlInput: { 'aria-label': 'Search objectives' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flexGrow: 1, minWidth: { sm: 240 } }}
          value={searchQuery}
        />
        <Button
          onClick={openCreateForm}
          startIcon={<AddIcon />}
          variant="contained"
        >
          Add objective
        </Button>
      </Box>

      {pageError && (
        <Alert
          action={
            <Button color="inherit" onClick={() => void loadObjectives()}>
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
          <CircularProgress aria-label="Loading objectives" />
        </Box>
      ) : objectives.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">
          <Typography component="h2" gutterBottom variant="h6">
            No objectives
          </Typography>
          <Typography color="text.secondary">
            Add an objective to make it available for exercises.
          </Typography>
        </Paper>
      ) : filteredObjectives.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">
          <Typography component="h2" gutterBottom variant="h6">
            No objectives match your search
          </Typography>
          <Button color="inherit" onClick={() => setSearchQuery('')}>
            Clear search
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredObjectives.map((objective) => (
            <Grid key={objective.id} size={{ xs: 12, md: 6, xl: 4 }}>
              <Card sx={{ height: '100%' }} variant="outlined">
                <CardActionArea
                  aria-label={`Open ${objective.title}`}
                  onClick={() => openEditForm(objective)}
                  sx={{ alignItems: 'stretch', display: 'flex', height: '100%' }}
                >
                  <CardContent
                    sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}
                  >
                    <Typography component="h2" variant="h6">
                      {objective.title}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      {objective.description}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 'auto', pt: 2 }}>
                      Related to {objective.exercise_count}{' '}
                      {objective.exercise_count === 1 ? 'exercise' : 'exercises'}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog fullWidth maxWidth="sm" onClose={closeForm} open={formOpen}>
        <Box component="form" onSubmit={saveObjective}>
          <DialogTitle>
            {editingObjective ? 'Edit objective' : 'Add objective'}
          </DialogTitle>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <TextField
              autoFocus
              fullWidth
              label="Title"
              margin="dense"
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  title: event.target.value,
                }))
              }
              required
              value={form.title}
            />
            <TextField
              fullWidth
              label="Description"
              margin="dense"
              minRows={4}
              multiline
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  description: event.target.value,
                }))
              }
              required
              value={form.description}
            />
            {editingObjective && (
              <Box sx={{ mt: 2 }}>
                <Typography
                  color="text.secondary"
                  component="h3"
                  sx={{ mb: 1 }}
                  variant="caption"
                >
                  Related exercises
                </Typography>
                {editingObjective.exercises &&
                editingObjective.exercises.length > 0 ? (
                  <Stack spacing={1}>
                    {editingObjective.exercises.map((exercise) => (
                      <Card key={exercise.id} variant="outlined">
                        <CardActionArea
                          aria-label={`View ${exercise.title}`}
                          onClick={() => void openExerciseDetails(exercise)}
                        >
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="body2">
                              {exercise.title}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    None
                  </Typography>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              justifyContent: editingObjective ? 'space-between' : 'flex-start',
            }}
          >
            <Stack direction="row" spacing={1}>
              <Button disabled={saving} type="submit" variant="contained">
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button color="inherit" disabled={saving} onClick={closeForm}>
                Cancel
              </Button>
            </Stack>
            {editingObjective && (
              <Button
                color="error"
                disabled={saving}
                onClick={openDeleteConfirmation}
                variant="contained"
              >
                Delete
              </Button>
            )}
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={closeExerciseDetails}
        open={exerciseDetailsOpen}
      >
        <DialogTitle>Exercise information</DialogTitle>
        <DialogContent>
          {exerciseDetailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress aria-label="Loading exercise information" />
            </Box>
          ) : exerciseDetailsError ? (
            <Alert severity="error">{exerciseDetailsError}</Alert>
          ) : selectedExercise ? (
            <Stack spacing={2}>
              <Box>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  <Chip
                    label={statusLabels[selectedExercise.status]}
                    size="small"
                  />
                  <Chip
                    label={typeLabels[selectedExercise.type]}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Typography component="h3" variant="h6">
                  {selectedExercise.title}
                </Typography>
              </Box>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', color: 'text.secondary' }}
              >
                <CalendarMonthIcon fontSize="small" />
                <Typography variant="body2">
                  {formatSchedule(
                    selectedExercise.scheduled_start_time,
                    selectedExercise.scheduled_end_time,
                  )}
                </Typography>
              </Stack>
              <Box>
                <Typography component="h4" gutterBottom variant="subtitle2">
                  Scenario
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {selectedExercise.scenario}
                </Typography>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={exerciseDetailsLoading}
            onClick={closeExerciseDetails}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        onClose={closeDeleteConfirmation}
        open={Boolean(deletingObjective)}
      >
        <DialogTitle>Delete objective?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete “{deletingObjective?.title}”? You cannot undo this action.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={deleting}
            onClick={closeDeleteConfirmation}
          >
            Cancel
          </Button>
          <Button
            color="error"
            disabled={deleting}
            onClick={() => void deleteObjective()}
            variant="contained"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
