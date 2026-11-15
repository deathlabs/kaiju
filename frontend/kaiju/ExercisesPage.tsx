import AddIcon from '@mui/icons-material/Add'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import DeleteIcon from '@mui/icons-material/Delete'
import GroupsIcon from '@mui/icons-material/Groups'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

type ExerciseType = 'discussion' | 'discussion_and_hands_on'
type ExerciseStatus = 'planned' | 'prepared' | 'in_progress' | 'completed'

interface ExerciseUser {
  username: string
  first_name: string
  last_name: string
}

interface Exercise {
  id: string
  created_by: ExerciseUser
  updated_by: ExerciseUser
  scheduled_start_time: string
  scheduled_end_time: string
  type: ExerciseType
  title: string
  status: ExerciseStatus
}

interface ExerciseDetails extends Exercise {
  objectives: Objective[]
  scenario: string
}

interface Objective {
  id: string
  title: string
  description: string
}

interface NewObjective {
  clientId: string
  title: string
  description: string
}

interface ExerciseForm {
  newObjectives: NewObjective[]
  objectiveIds: string[]
  title: string
  type: ExerciseType
  scheduledStartTime: string
  scheduledEndTime: string
  scenario: string
}

const exercisesUrl = '/api/v1/exercises/'
const objectivesUrl = '/api/v1/objectives/'
const createObjectiveValue = 'create-objective'
const newObjectiveValuePrefix = 'new-objective:'
const defaultTitle = 'Unknown Outbound Network Activity'
const defaultScenario =
  'At 0400, unknown outbound network activity was observed from the production environment.'
const emptyForm: ExerciseForm = {
  newObjectives: [],
  objectiveIds: [],
  title: '',
  type: 'discussion_and_hands_on',
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

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const formatUserName = (user: ExerciseUser) => {
  const fullName = `${user.first_name} ${user.last_name}`.trim()

  return fullName || user.username
}

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingExercise, setEditingExercise] =
    useState<ExerciseDetails | null>(null)
  const [form, setForm] = useState<ExerciseForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newObjectiveDialogOpen, setNewObjectiveDialogOpen] = useState(false)
  const [newObjectiveDraft, setNewObjectiveDraft] = useState({
    title: '',
    description: '',
  })
  const [newObjectiveError, setNewObjectiveError] = useState<string | null>(null)
  const [deletingExercise, setDeletingExercise] =
    useState<ExerciseDetails | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadExercises = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setPageError(null)

    try {
      const [exercisesResponse, objectivesResponse] = await Promise.all([
        fetch(exercisesUrl, { signal }),
        fetch(objectivesUrl, { signal }),
      ])

      if (!exercisesResponse.ok) {
        throw new Error(await getErrorMessage(exercisesResponse))
      }
      if (!objectivesResponse.ok) {
        throw new Error(await getErrorMessage(objectivesResponse))
      }

      setExercises((await exercisesResponse.json()) as Exercise[])
      setObjectives((await objectivesResponse.json()) as Objective[])
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
    const scheduledStart = new Date()

    setEditingExercise(null)
    setForm({
      ...emptyForm,
      scheduledStartTime: formatDateTimeLocal(scheduledStart),
      scheduledEndTime: formatDateTimeLocal(
        new Date(scheduledStart.getTime() + 24 * 60 * 60 * 1000),
      ),
    })
    setFormError(null)
    setFormOpen(true)
  }

  const openEditForm = async (exercise: Exercise) => {
    setPageError(null)

    try {
      const response = await fetch(`${exercisesUrl}${exercise.id}/`)

      if (!response.ok) throw new Error(await getErrorMessage(response))

      const exerciseDetails = (await response.json()) as ExerciseDetails
      setEditingExercise(exerciseDetails)
      setForm({
        newObjectives: [],
        objectiveIds: exerciseDetails.objectives.map(
          (objective) => objective.id,
        ),
        title: exerciseDetails.title,
        type: exerciseDetails.type,
        scheduledStartTime: formatDateTimeLocal(
          new Date(exerciseDetails.scheduled_start_time),
        ),
        scheduledEndTime: formatDateTimeLocal(
          new Date(exerciseDetails.scheduled_end_time),
        ),
        scenario: exerciseDetails.scenario,
      })
      setFormError(null)
      setFormOpen(true)
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Could not load the exercise.',
      )
    }
  }

  const closeForm = () => {
    if (!saving) setFormOpen(false)
  }

  const openNewObjectiveDialog = () => {
    setNewObjectiveDraft({ title: '', description: '' })
    setNewObjectiveError(null)
    setNewObjectiveDialogOpen(true)
  }

  const closeNewObjectiveDialog = () => {
    setNewObjectiveDialogOpen(false)
  }

  const addNewObjective = () => {
    const title = newObjectiveDraft.title.trim()
    const description = newObjectiveDraft.description.trim()

    if (!title || !description) {
      setNewObjectiveError('Enter a title and description.')
      return
    }

    setForm((currentForm) => ({
      ...currentForm,
      newObjectives: [
        ...currentForm.newObjectives,
        { clientId: crypto.randomUUID(), title, description },
      ],
    }))
    setNewObjectiveDialogOpen(false)
  }

  const openDeleteConfirmation = () => {
    if (!editingExercise) return

    setDeletingExercise(editingExercise)
    setFormOpen(false)
  }

  const closeDeleteConfirmation = () => {
    if (deleting) return

    setDeletingExercise(null)
    setFormOpen(true)
  }

  const deleteExercise = async () => {
    if (!deletingExercise) return

    setDeleting(true)
    setPageError(null)

    try {
      const response = await fetch(`${exercisesUrl}${deletingExercise.id}/`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error(await getErrorMessage(response))

      setExercises((currentExercises) =>
        currentExercises.filter(
          (exercise) => exercise.id !== deletingExercise.id,
        ),
      )
      setDeletingExercise(null)
      setEditingExercise(null)
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Could not delete the exercise.',
      )
      setDeletingExercise(null)
    } finally {
      setDeleting(false)
    }
  }

  const saveExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.scheduledStartTime || !form.scheduledEndTime) {
      setFormError('Enter a start time and end time.')
      return
    }

    if (new Date(form.scheduledEndTime) <= new Date(form.scheduledStartTime)) {
      setFormError('Set the end time after the start time.')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      const url = editingExercise
        ? `${exercisesUrl}${editingExercise.id}/`
        : exercisesUrl
      const response = await fetch(url, {
        method: editingExercise ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_objectives: form.newObjectives.map((objective) => ({
            title: objective.title.trim(),
            description: objective.description.trim(),
          })),
          objective_ids: form.objectiveIds,
          title: form.title.trim() || defaultTitle,
          type: form.type,
          scheduled_start_time: new Date(form.scheduledStartTime).toISOString(),
          scheduled_end_time: new Date(form.scheduledEndTime).toISOString(),
          scenario: form.scenario.trim() || defaultScenario,
        }),
      })

      if (!response.ok) throw new Error(await getErrorMessage(response))

      const savedExercise = (await response.json()) as ExerciseDetails
      setObjectives((currentObjectives) => [
        ...currentObjectives,
        ...savedExercise.objectives.filter(
          (savedObjective) =>
            !currentObjectives.some(
              (objective) => objective.id === savedObjective.id,
            ),
        ),
      ])
      setExercises((currentExercises) =>
        editingExercise
          ? currentExercises.map((exercise) =>
              exercise.id === savedExercise.id ? savedExercise : exercise,
            )
          : [...currentExercises, savedExercise],
      )
      setFormOpen(false)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not save the exercise.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mb: 3,
        }}
      >
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
                <CardActionArea
                  aria-label={`Edit ${exercise.title}`}
                  onClick={() => void openEditForm(exercise)}
                >
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
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Typography
                        color="text.secondary"
                        sx={{ flex: 1 }}
                        variant="caption"
                      >
                        Created by {formatUserName(exercise.created_by)}
                      </Typography>
                      <Typography
                        color="text.secondary"
                        sx={{ flex: 1 }}
                        variant="caption"
                      >
                        Last modified by {formatUserName(exercise.updated_by)}
                      </Typography>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog fullWidth maxWidth="md" onClose={closeForm} open={formOpen}>
        <Box component="form" onSubmit={saveExercise}>
          <DialogTitle>
            {editingExercise ? 'Edit exercise' : 'Create exercise'}
          </DialogTitle>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <Stack spacing={2} sx={{ pt: 1 }}>
                <TextField
                  autoFocus
                  fullWidth
                  label="Title"
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value,
                    }))
                  }
                  placeholder={defaultTitle}
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={form.title}
                />
                <FormControl>
                  <InputLabel id="exercise-type-label">Type</InputLabel>
                  <Select
                    label="Type"
                    labelId="exercise-type-label"
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        type: event.target.value as ExerciseType,
                      }))
                    }
                    value={form.type}
                  >
                    <MenuItem value="discussion_and_hands_on">
                      Discussion and hands-on
                    </MenuItem>
                    <MenuItem value="discussion">Discussion</MenuItem>
                  </Select>
                </FormControl>
                <FormControl>
                  <InputLabel id="exercise-objectives-label">
                    Objectives
                  </InputLabel>
                  <Select
                    label="Objectives"
                    labelId="exercise-objectives-label"
                    multiple
                    onChange={(event) => {
                      const value = event.target.value
                      const selectedValues =
                        typeof value === 'string' ? value.split(',') : value

                      if (selectedValues.includes(createObjectiveValue)) {
                        openNewObjectiveDialog()
                        return
                      }

                      setForm((currentForm) => ({
                        ...currentForm,
                        newObjectives: currentForm.newObjectives.filter(
                          (objective) =>
                            selectedValues.includes(
                              `${newObjectiveValuePrefix}${objective.clientId}`,
                            ),
                        ),
                        objectiveIds: selectedValues.filter(
                          (selectedValue) =>
                            !selectedValue.startsWith(newObjectiveValuePrefix),
                        ),
                      }))
                    }}
                    renderValue={(selectedIds) =>
                      selectedIds
                        .map((selectedId) => {
                          if (selectedId.startsWith(newObjectiveValuePrefix)) {
                            const clientId = selectedId.slice(
                              newObjectiveValuePrefix.length,
                            )
                            return form.newObjectives.find(
                              (objective) => objective.clientId === clientId,
                            )?.title
                          }

                          return objectives.find(
                            (objective) => objective.id === selectedId,
                          )?.title
                        })
                        .filter(Boolean)
                        .join(', ')
                    }
                    value={[
                      ...form.objectiveIds,
                      ...form.newObjectives.map(
                        (objective) =>
                          `${newObjectiveValuePrefix}${objective.clientId}`,
                      ),
                    ]}
                  >
                    <MenuItem value={createObjectiveValue}>
                      <AddIcon fontSize="small" sx={{ mr: 1 }} />
                      Add new objective…
                    </MenuItem>
                    {objectives.map((objective) => (
                      <MenuItem key={objective.id} value={objective.id}>
                        <Checkbox
                          checked={form.objectiveIds.includes(objective.id)}
                        />
                        <ListItemText
                          primary={objective.title}
                          secondary={objective.description}
                        />
                      </MenuItem>
                    ))}
                    {form.newObjectives.map((objective) => (
                      <MenuItem
                        key={objective.clientId}
                        value={`${newObjectiveValuePrefix}${objective.clientId}`}
                      >
                        <Checkbox checked />
                        <ListItemText
                          primary={objective.title}
                          secondary={`${objective.description} (new)`}
                        />
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Select existing objectives or add a new objective.
                  </FormHelperText>
                </FormControl>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Scheduled Start"
                      onChange={(event) => {
                        const scheduledStartTime = event.target.value
                        const scheduledEndTime = scheduledStartTime
                          ? formatDateTimeLocal(
                              new Date(
                                new Date(scheduledStartTime).getTime() +
                                  24 * 60 * 60 * 1000,
                              ),
                            )
                          : ''

                        setForm((currentForm) => ({
                          ...currentForm,
                          scheduledEndTime,
                          scheduledStartTime,
                        }))
                      }}
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                      type="datetime-local"
                      value={form.scheduledStartTime}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Scheduled End"
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
                <TextField
                  fullWidth
                  label="Scenario"
                  minRows={7}
                  multiline
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      scenario: event.target.value,
                    }))
                  }
                  placeholder={defaultScenario}
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={form.scenario}
                />
            </Stack>
          </DialogContent>
          <DialogActions
            sx={{
              justifyContent: editingExercise ? 'space-between' : 'flex-start',
              px: 3,
              pb: 3,
            }}
          >
            <Stack direction="row" spacing={1}>
              <Button
                disabled={saving}
                type="submit"
                variant="contained"
              >
                {saving
                  ? 'Saving…'
                  : 'Save'}
              </Button>
              <Button color="inherit" disabled={saving} onClick={closeForm}>
                Cancel
              </Button>
            </Stack>
            {editingExercise && (
              <Button
                color="error"
                disabled={saving}
                onClick={openDeleteConfirmation}
                startIcon={<DeleteIcon />}
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
        onClose={closeNewObjectiveDialog}
        open={newObjectiveDialogOpen}
      >
        <DialogTitle>Add new objective</DialogTitle>
        <DialogContent>
          {newObjectiveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {newObjectiveError}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="Title"
            margin="dense"
            onChange={(event) =>
              setNewObjectiveDraft((currentDraft) => ({
                ...currentDraft,
                title: event.target.value,
              }))
            }
            value={newObjectiveDraft.title}
          />
          <TextField
            fullWidth
            label="Description"
            margin="dense"
            minRows={4}
            multiline
            onChange={(event) =>
              setNewObjectiveDraft((currentDraft) => ({
                ...currentDraft,
                description: event.target.value,
              }))
            }
            value={newObjectiveDraft.description}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={closeNewObjectiveDialog}>
            Cancel
          </Button>
          <Button onClick={addNewObjective} variant="contained">
            Add objective
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        onClose={closeDeleteConfirmation}
        open={Boolean(deletingExercise)}
      >
        <DialogTitle>Delete exercise?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete “{deletingExercise?.title}”? You cannot undo this action.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={deleting} onClick={closeDeleteConfirmation}>
            Cancel
          </Button>
          <Button
            color="error"
            disabled={deleting}
            onClick={() => void deleteExercise()}
            variant="contained"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
