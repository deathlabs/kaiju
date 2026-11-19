import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import GroupsIcon from '@mui/icons-material/Groups'
import SearchIcon from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import InputAdornment from '@mui/material/InputAdornment'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

import blobbo from '../assets/blobbo.png'
import boulderback from '../assets/boulderback.png'
import crabzilla from '../assets/crabzilla.png'
import flutterwing from '../assets/flutterwing.png'
import frostfin from '../assets/frostfin.png'
import jellyfloat from '../assets/jellyfloat.png'
import mossback from '../assets/mossback.png'
import octobeast from '../assets/octobeast.png'
import shroomzilla from '../assets/shroomzilla.png'
import spiketus from '../assets/spiketus.png'
import { ExerciseWorkspace } from './ExerciseWorkspace'

type ExerciseType = 'discussion' | 'discussion_and_hands_on'
type ExerciseStatus = 'planned' | 'prepared' | 'in_progress' | 'completed'
type ReferenceType = 'policy' | 'standard' | 'procedure' | 'guideline'

interface ExerciseUser {
  username: string
  first_name: string
  last_name: string
}

interface SelectableUser {
  username: string
  display_name: string
  first_name: string
  last_name: string
}

interface ExerciseParticipant {
  id: string
  first_name: string
  last_name: string
  email: string | null
  role: string
}

interface ExerciseSummary {
  id: string
  created_by: ExerciseUser
  updated_by: ExerciseUser
  scheduled_start_time: string
  scheduled_end_time: string
  objectives: Objective[]
  references: Reference[]
  scenario: string
  type: ExerciseType
  title: string
  status: ExerciseStatus
  facilitator_id: string | null
  participants: ExerciseParticipant[]
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

interface Reference {
  id: string
  type: ReferenceType
  title: string
  url: string
}

interface NewReference {
  clientId: string
  type: ReferenceType
  title: string
  url: string
}

interface ExerciseForm {
  facilitatorUsername: string
  newObjectives: NewObjective[]
  newReferences: NewReference[]
  objectiveIds: string[]
  referenceIds: string[]
  title: string
  type: ExerciseType
  scheduledStartTime: string
  scheduledEndTime: string
  scenario: string
}

const exercisesUrl = '/api/v1/exercises/'
const objectivesUrl = '/api/v1/objectives/'
const referencesUrl = '/api/v1/references/'
const currentUserUrl = '/api/v1/me'
const usersUrl = '/api/v1/users'
const createObjectiveValue = 'create-objective'
const createReferenceValue = 'create-reference'
const newObjectiveValuePrefix = 'new-objective:'
const newReferenceValuePrefix = 'new-reference:'
const defaultTitle = 'Unknown Outbound Network Activity'
const defaultScenario =
  'At 0400, unknown outbound network activity was observed from the production environment.'
const exerciseImages = [mossback, blobbo, frostfin, boulderback, crabzilla, flutterwing, jellyfloat, octobeast, shroomzilla, spiketus]

const exerciseImage = (id: string) => {
  const value = Number.parseInt(id.replaceAll('-', '').slice(-8), 16)
  return exerciseImages[((value || 1) - 1) % exerciseImages.length]
}
const emptyForm: ExerciseForm = {
  facilitatorUsername: '',
  newObjectives: [],
  newReferences: [],
  objectiveIds: [],
  referenceIds: [],
  title: '',
  type: 'discussion_and_hands_on',
  scheduledStartTime: '',
  scheduledEndTime: '',
  scenario: '',
}

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

const statusColors: Record<ExerciseStatus, string> = {
  planned: 'text.secondary',
  prepared: 'info.main',
  in_progress: 'warning.main',
  completed: 'success.main',
}

const statusOrder: Record<ExerciseStatus, number> = {
  in_progress: 0,
  prepared: 1,
  planned: 2,
  completed: 3,
}

const referenceTypeLabels: Record<ReferenceType, string> = {
  policy: 'Policy',
  standard: 'Standard',
  procedure: 'Procedure',
  guideline: 'Guideline',
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
    hourCycle: 'h23',
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
  const [exercises, setExercises] = useState<ExerciseSummary[]>([])
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [users, setUsers] = useState<SelectableUser[]>([])
  const [currentUsername, setCurrentUsername] = useState('')
  const [currentEmail, setCurrentEmail] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilters, setTypeFilters] = useState<ExerciseType[]>([])
  const [objectiveFilterIds, setObjectiveFilterIds] = useState<string[]>([])
  const [referenceFilterIds, setReferenceFilterIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingExercise, setEditingExercise] =
    useState<ExerciseSummary | null>(null)
  const [workspaceExercise, setWorkspaceExercise] =
    useState<ExerciseSummary | null>(null)
  const [form, setForm] = useState<ExerciseForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newObjectiveDialogOpen, setNewObjectiveDialogOpen] = useState(false)
  const [newObjectiveDraft, setNewObjectiveDraft] = useState({
    title: '',
    description: '',
  })
  const [newObjectiveError, setNewObjectiveError] = useState<string | null>(null)
  const [newReferenceDialogOpen, setNewReferenceDialogOpen] = useState(false)
  const [newReferenceDraft, setNewReferenceDraft] = useState({
    type: '' as ReferenceType | '',
    title: '',
    url: '',
  })
  const [newReferenceError, setNewReferenceError] = useState<string | null>(null)
  const [deletingExercise, setDeletingExercise] =
    useState<ExerciseSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [startingExerciseId, setStartingExerciseId] = useState<string | null>(null)

  const loadExercises = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setPageError(null)

    try {
      const [
        exercisesResponse,
        objectivesResponse,
        referencesResponse,
        currentUserResponse,
        usersResponse,
      ] = await Promise.all([
        fetch(exercisesUrl, { signal }),
        fetch(objectivesUrl, { signal }),
        fetch(referencesUrl, { signal }),
        fetch(currentUserUrl, { signal }),
        fetch(usersUrl, { signal }),
      ])

      if (!exercisesResponse.ok) {
        throw new Error(await getErrorMessage(exercisesResponse))
      }
      if (!objectivesResponse.ok) {
        throw new Error(await getErrorMessage(objectivesResponse))
      }
      if (!referencesResponse.ok) {
        throw new Error(await getErrorMessage(referencesResponse))
      }
      if (!currentUserResponse.ok) {
        throw new Error(await getErrorMessage(currentUserResponse))
      }
      if (!usersResponse.ok) {
        throw new Error(await getErrorMessage(usersResponse))
      }

      setExercises((await exercisesResponse.json()) as ExerciseSummary[])
      setObjectives((await objectivesResponse.json()) as Objective[])
      setReferences((await referencesResponse.json()) as Reference[])
      const currentUser = (await currentUserResponse.json()) as SelectableUser & { email: string }
      setCurrentUsername(currentUser.username)
      setCurrentEmail(currentUser.email)
      setUsers((await usersResponse.json()) as SelectableUser[])
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
      facilitatorUsername: currentUsername,
      scheduledStartTime: formatDateTimeLocal(scheduledStart),
      scheduledEndTime: formatDateTimeLocal(
        new Date(scheduledStart.getTime() + 24 * 60 * 60 * 1000),
      ),
    })
    setFormError(null)
    setFormOpen(true)
  }

  const openEditForm = async (exercise: ExerciseSummary) => {
    setPageError(null)

    try {
      const response = await fetch(`${exercisesUrl}${exercise.id}/`)

      if (!response.ok) throw new Error(await getErrorMessage(response))

      const exerciseDetails = (await response.json()) as ExerciseSummary
      const facilitator = exerciseDetails.participants?.find(
        (participant) => participant.id === exerciseDetails.facilitator_id,
      )
      const facilitatorUser = users.find(
        (user) =>
          user.first_name === facilitator?.first_name &&
          user.last_name === facilitator?.last_name,
      )
      setEditingExercise(exerciseDetails)
      setWorkspaceExercise(exerciseDetails)
      setForm({
        facilitatorUsername: facilitatorUser?.username ?? '',
        newObjectives: [],
        newReferences: [],
        objectiveIds: exerciseDetails.objectives.map(
          (objective) => objective.id,
        ),
        referenceIds: exerciseDetails.references.map(
          (reference) => reference.id,
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
    if (!saving) {
      setFormOpen(false)
      setWorkspaceExercise(null)
      void loadExercises()
    }
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

  const openNewReferenceDialog = () => {
    setNewReferenceDraft({ type: '', title: '', url: '' })
    setNewReferenceError(null)
    setNewReferenceDialogOpen(true)
  }

  const closeNewReferenceDialog = () => {
    setNewReferenceDialogOpen(false)
  }

  const addNewReference = () => {
    const type = newReferenceDraft.type
    const title = newReferenceDraft.title.trim()
    const url = newReferenceDraft.url.trim()

    if (!type || !title || !url) {
      setNewReferenceError('Select a type and enter a title and URL.')
      return
    }

    try {
      const parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error()
    } catch {
      setNewReferenceError('Enter a valid HTTP or HTTPS URL.')
      return
    }

    setForm((currentForm) => ({
      ...currentForm,
      newReferences: [
        ...currentForm.newReferences,
        { clientId: crypto.randomUUID(), type, title, url },
      ],
    }))
    setNewReferenceDialogOpen(false)
  }

  const enterExercise = async (exercise: ExerciseSummary) => {
    if (exercise.status === 'in_progress' || exercise.status === 'completed') {
      window.location.hash = `#exercises/${exercise.id}/run`
      return
    }

    setStartingExerciseId(exercise.id)
    setPageError(null)
    try {
      const response = await fetch(`${exercisesUrl}${exercise.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      window.location.hash = `#exercises/${exercise.id}/run`
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not start the exercise.')
    } finally {
      setStartingExerciseId(null)
    }
  }

  const closeDeleteConfirmation = () => {
    if (deleting) return

    setDeletingExercise(null)
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
      setFormOpen(false)
      setWorkspaceExercise(null)
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
          new_references: form.newReferences.map((reference) => ({
            type: reference.type,
            title: reference.title.trim(),
            url: reference.url.trim(),
          })),
          objective_ids: form.objectiveIds,
          reference_ids: form.referenceIds,
          facilitator_username: form.facilitatorUsername,
          title: form.title.trim() || defaultTitle,
          type: form.type,
          scheduled_start_time: new Date(form.scheduledStartTime).toISOString(),
          scheduled_end_time: new Date(form.scheduledEndTime).toISOString(),
          scenario: form.scenario.trim() || defaultScenario,
        }),
      })

      if (!response.ok) throw new Error(await getErrorMessage(response))

      const savedExercise = (await response.json()) as ExerciseSummary
      setObjectives((currentObjectives) => [
        ...currentObjectives,
        ...savedExercise.objectives.filter(
          (savedObjective) =>
            !currentObjectives.some(
              (objective) => objective.id === savedObjective.id,
            ),
        ),
      ])
      setReferences((currentReferences) => [
        ...currentReferences,
        ...savedExercise.references.filter(
          (savedReference) =>
            !currentReferences.some(
              (reference) => reference.id === savedReference.id,
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
      setEditingExercise(savedExercise)
      setWorkspaceExercise(savedExercise)
      setForm((currentForm) => ({
        ...currentForm,
        title: savedExercise.title,
        scenario: savedExercise.scenario,
        objectiveIds: savedExercise.objectives.map((objective) => objective.id),
        referenceIds: savedExercise.references.map((reference) => reference.id),
        newObjectives: [],
        newReferences: [],
      }))
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not save the exercise.',
      )
    } finally {
      setSaving(false)
    }
  }

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase()
  const filteredExercises = exercises.filter(
    (exercise) => {
      const searchableText = [
        exercise.title,
        exercise.scenario,
        formatUserName(exercise.created_by),
        exercise.created_by.username,
        formatUserName(exercise.updated_by),
        exercise.updated_by.username,
        typeLabels[exercise.type],
        statusLabels[exercise.status],
        ...exercise.objectives.flatMap((objective) => [
          objective.title,
          objective.description,
        ]),
        ...exercise.references.flatMap((reference) => [
          referenceTypeLabels[reference.type],
          reference.title,
          reference.url,
        ]),
      ]
        .join(' ')
        .toLocaleLowerCase()

      return (
        (!normalizedSearchQuery ||
          searchableText.includes(normalizedSearchQuery)) &&
      (typeFilters.length === 0 || typeFilters.includes(exercise.type)) &&
      (objectiveFilterIds.length === 0 ||
        objectiveFilterIds.some((objectiveId) =>
          exercise.objectives.some((objective) => objective.id === objectiveId),
        )) &&
      (referenceFilterIds.length === 0 ||
        referenceFilterIds.some((referenceId) =>
          exercise.references.some((reference) => reference.id === referenceId),
        ))
      )
    },
  ).sort((first, second) => statusOrder[first.status] - statusOrder[second.status])

  const clearFilters = () => {
    setSearchQuery('')
    setTypeFilters([])
    setObjectiveFilterIds([])
    setReferenceFilterIds([])
  }

  return (
    <>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={2}
        sx={{
          alignItems: { lg: 'center' },
          mb: 3,
        }}
      >
        <TextField
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by title, scenario, author, etc."
          size="small"
          slotProps={{
            htmlInput: { 'aria-label': 'Search exercises' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flexGrow: 1, minWidth: { lg: 240 } }}
          value={searchQuery}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="type-filter-label" shrink>
            Type
          </InputLabel>
          <Select
            displayEmpty
            label="Type"
            labelId="type-filter-label"
            multiple
            onChange={(event) => {
              const value = event.target.value
              const selectedTypes =
                typeof value === 'string' ? value.split(',') : value
              setTypeFilters(
                selectedTypes.includes('all')
                  ? []
                  : (selectedTypes as ExerciseType[]),
              )
            }}
            renderValue={(selectedTypes) =>
              selectedTypes.length === 0
                ? 'All'
                : selectedTypes.map((type) => typeLabels[type]).join(', ')
            }
            value={typeFilters}
          >
            <MenuItem value="all">
              <Checkbox checked={typeFilters.length === 0} />
              <ListItemText primary="All" />
            </MenuItem>
            {(Object.keys(typeLabels) as ExerciseType[]).map((type) => (
              <MenuItem key={type} value={type}>
                <Checkbox checked={typeFilters.includes(type)} />
                <ListItemText primary={typeLabels[type]} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="objective-filter-label" shrink>
            Objective
          </InputLabel>
          <Select
            displayEmpty
            label="Objective"
            labelId="objective-filter-label"
            multiple
            onChange={(event) => {
              const value = event.target.value
              const selectedIds =
                typeof value === 'string' ? value.split(',') : value
              setObjectiveFilterIds(
                selectedIds.includes('all') ? [] : selectedIds,
              )
            }}
            renderValue={(selectedIds) =>
              selectedIds.length === 0
                ? 'All'
                : selectedIds
                    .map(
                      (selectedId) =>
                        objectives.find(
                          (objective) => objective.id === selectedId,
                        )?.title,
                    )
                    .filter(Boolean)
                    .join(', ')
            }
            value={objectiveFilterIds}
          >
            <MenuItem value="all">
              <Checkbox checked={objectiveFilterIds.length === 0} />
              <ListItemText primary="All" />
            </MenuItem>
            {objectives.map((objective) => (
              <MenuItem key={objective.id} value={objective.id}>
                <Checkbox checked={objectiveFilterIds.includes(objective.id)} />
                <ListItemText primary={objective.title} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="reference-filter-label" shrink>
            Reference
          </InputLabel>
          <Select
            displayEmpty
            label="Reference"
            labelId="reference-filter-label"
            multiple
            onChange={(event) => {
              const value = event.target.value
              const selectedIds =
                typeof value === 'string' ? value.split(',') : value
              setReferenceFilterIds(
                selectedIds.includes('all') ? [] : selectedIds,
              )
            }}
            renderValue={(selectedIds) =>
              selectedIds.length === 0
                ? 'All'
                : selectedIds
                    .map(
                      (selectedId) =>
                        references.find(
                          (reference) => reference.id === selectedId,
                        )?.title,
                    )
                    .filter(Boolean)
                    .join(', ')
            }
            value={referenceFilterIds}
          >
            <MenuItem value="all">
              <Checkbox checked={referenceFilterIds.length === 0} />
              <ListItemText primary="All" />
            </MenuItem>
            {references.map((reference) => (
              <MenuItem key={reference.id} value={reference.id}>
                <Checkbox checked={referenceFilterIds.includes(reference.id)} />
                <ListItemText primary={reference.title} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          onClick={openCreateForm}
          startIcon={<AddIcon />}
          sx={{ flexShrink: 0 }}
          variant="contained"
        >
          Create exercise
        </Button>
      </Stack>

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
          <Button
            onClick={openCreateForm}
            startIcon={<AddIcon />}
            variant="contained"
          >
            Create exercise
          </Button>
        </Paper>
      ) : filteredExercises.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">
          <Typography component="h2" gutterBottom variant="h6">
            No exercises match your filters
          </Typography>
          <Button color="inherit" onClick={clearFilters}>
            Clear filters
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredExercises.map((exercise) => (
            <Grid key={exercise.id} size={{ xs: 12, md: 6, xl: 4 }}>
              <Card variant="outlined" sx={{ position: 'relative' }}>
                <CardActionArea
                  aria-label={`Open ${exercise.title}, ${statusLabels[exercise.status]}`}
                  disabled={startingExerciseId !== null}
                  onClick={() => void enterExercise(exercise)}
                >
                  <CardContent sx={{ pb: '64px !important' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography component="h2" variant="h6">
                        {exercise.title}
                      </Typography>
                      <Tooltip title={statusLabels[exercise.status]}>
                        <Box aria-hidden="true" sx={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', color: statusColors[exercise.status], bgcolor: 'currentColor', boxShadow: '0 0 8px currentColor', animation: 'statusPulse 2.5s ease-in-out infinite', '@keyframes statusPulse': { '0%, 100%': { boxShadow: '0 0 4px currentColor', opacity: 0.7 }, '50%': { boxShadow: '0 0 10px currentColor', opacity: 1 } }, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }} />
                      </Tooltip>
                    </Stack>
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
                      <Typography color="text.secondary" sx={{ flex: 1 }} variant="body2">
                        Facilitator: {exercise.participants.filter((participant) => participant.id === exercise.facilitator_id).map((participant) => `${participant.first_name} ${participant.last_name}`.trim() || 'Unnamed facilitator').join(', ') || 'None'}
                      </Typography>
                    </Stack>
                    </Box>
                    <Box component="img" src={exerciseImage(exercise.id)} alt="" sx={{ width: { xs: 80, sm: 140 }, maxWidth: '100%' }} />
                    </Box>
                  </CardContent>
                </CardActionArea>
                {currentEmail && exercise.participants.some((participant) => participant.role === 'facilitator' && participant.email?.toLowerCase() === currentEmail.toLowerCase()) && <Stack direction="row" spacing={1} sx={{ position: 'absolute', right: 16, bottom: 8 }}>
                  <Tooltip title="Edit"><IconButton aria-label={`Edit ${exercise.title}`} onClick={() => void openEditForm(exercise)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton color="error" aria-label={`Delete ${exercise.title}`} onClick={() => setDeletingExercise(exercise)}><DeleteIcon /></IconButton></Tooltip>
                </Stack>}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <ExerciseWorkspace
        exerciseId={workspaceExercise?.id ?? null}
        form={formOpen ? (
        <Box component="form" id="exercise-overview-form" onSubmit={saveExercise}>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <Stack spacing={2} sx={{ pt: 1 }}>
                <FormControl required>
                    <InputLabel id="exercise-facilitator-label">
                      Facilitator
                    </InputLabel>
                    <Select
                      autoFocus
                      label="Facilitator"
                      labelId="exercise-facilitator-label"
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          facilitatorUsername: event.target.value,
                        }))
                      }
                      value={form.facilitatorUsername}
                    >
                      {users.map((user) => (
                        <MenuItem key={user.username} value={user.username}>
                          {user.display_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                <TextField
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
                      Discussion and Hands-On
                    </MenuItem>
                    <MenuItem value="discussion">Discussion</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ order: 2 }}>
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
                      Create objective
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
                </FormControl>
                <FormControl sx={{ order: 3 }}>
                  <InputLabel id="exercise-references-label">
                    References
                  </InputLabel>
                  <Select
                    label="References"
                    labelId="exercise-references-label"
                    multiple
                    onChange={(event) => {
                      const value = event.target.value
                      const selectedValues =
                        typeof value === 'string' ? value.split(',') : value

                      if (selectedValues.includes(createReferenceValue)) {
                        openNewReferenceDialog()
                        return
                      }

                      setForm((currentForm) => ({
                        ...currentForm,
                        newReferences: currentForm.newReferences.filter(
                          (reference) =>
                            selectedValues.includes(
                              `${newReferenceValuePrefix}${reference.clientId}`,
                            ),
                        ),
                        referenceIds: selectedValues.filter(
                          (selectedValue) =>
                            !selectedValue.startsWith(newReferenceValuePrefix),
                        ),
                      }))
                    }}
                    renderValue={(selectedIds) =>
                      selectedIds
                        .map((selectedId) => {
                          if (selectedId.startsWith(newReferenceValuePrefix)) {
                            const clientId = selectedId.slice(
                              newReferenceValuePrefix.length,
                            )
                            return form.newReferences.find(
                              (reference) => reference.clientId === clientId,
                            )?.title
                          }

                          return references.find(
                            (reference) => reference.id === selectedId,
                          )?.title
                        })
                        .filter(Boolean)
                        .join(', ')
                    }
                    value={[
                      ...form.referenceIds,
                      ...form.newReferences.map(
                        (reference) =>
                          `${newReferenceValuePrefix}${reference.clientId}`,
                      ),
                    ]}
                  >
                    <MenuItem value={createReferenceValue}>
                      <AddIcon fontSize="small" sx={{ mr: 1 }} />
                      Create reference
                    </MenuItem>
                    {references.map((reference) => (
                      <MenuItem key={reference.id} value={reference.id}>
                        <Checkbox
                          checked={form.referenceIds.includes(reference.id)}
                        />
                        <ListItemText
                          primary={reference.title}
                          secondary={`${referenceTypeLabels[reference.type]} · ${reference.url}`}
                        />
                      </MenuItem>
                    ))}
                    {form.newReferences.map((reference) => (
                      <MenuItem
                        key={reference.clientId}
                        value={`${newReferenceValuePrefix}${reference.clientId}`}
                      >
                        <Checkbox checked />
                        <ListItemText
                          primary={reference.title}
                          secondary={`${referenceTypeLabels[reference.type]} · ${reference.url} (new)`}
                        />
                      </MenuItem>
                    ))}
                  </Select>
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
                  sx={{ order: 1 }}
                  value={form.scenario}
                />
            </Stack>
          </DialogContent>
          <DialogActions
            sx={{
              justifyContent: 'space-between',
              px: 3,
              pb: 3,
            }}
          >
            <Button disabled={saving} type="submit" variant="contained">
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button color="inherit" disabled={saving} onClick={closeForm}>
              Cancel
            </Button>
          </DialogActions>
        </Box>
        ) : null}
        onClose={() => {
          setFormOpen(false)
          setWorkspaceExercise(null)
          void loadExercises()
        }}
      />

      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={closeNewObjectiveDialog}
        open={newObjectiveDialogOpen}
      >
        <DialogTitle>Add objective</DialogTitle>
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
            required
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
            required
            value={newObjectiveDraft.description}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-start' }}>
          <Button onClick={addNewObjective} variant="contained">
            Save
          </Button>
          <Button color="inherit" onClick={closeNewObjectiveDialog}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={closeNewReferenceDialog}
        open={newReferenceDialogOpen}
      >
        <DialogTitle>Add reference</DialogTitle>
        <DialogContent>
          {newReferenceError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {newReferenceError}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="Title"
            margin="dense"
            onChange={(event) =>
              setNewReferenceDraft((currentDraft) => ({
                ...currentDraft,
                title: event.target.value,
              }))
            }
            required
            value={newReferenceDraft.title}
          />
          <FormControl fullWidth margin="dense" required>
            <InputLabel id="new-reference-type-label">Type</InputLabel>
            <Select
              label="Type"
              labelId="new-reference-type-label"
              onChange={(event) =>
                setNewReferenceDraft((currentDraft) => ({
                  ...currentDraft,
                  type: event.target.value as ReferenceType,
                }))
              }
              value={newReferenceDraft.type}
            >
              {(Object.keys(referenceTypeLabels) as ReferenceType[]).map(
                (type) => (
                  <MenuItem key={type} value={type}>
                    {referenceTypeLabels[type]}
                  </MenuItem>
                ),
              )}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="URL"
            margin="dense"
            onChange={(event) =>
              setNewReferenceDraft((currentDraft) => ({
                ...currentDraft,
                url: event.target.value,
              }))
            }
            required
            type="url"
            value={newReferenceDraft.url}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-start' }}>
          <Button onClick={addNewReference} variant="contained">
            Save
          </Button>
          <Button color="inherit" onClick={closeNewReferenceDialog}>
            Cancel
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
