import { injectRoleLabels, type InjectRole } from './injectRoles'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'

type DeliveryMethod = 'index_card' | 'phone_call' | 'email' | 'chat_message'
type ParticipantRole = InjectRole | 'facilitator'

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

interface Participant {
  id: string
  first_name: string
  last_name: string
  email: string | null
  role: ParticipantRole
}

interface SelectableUser {
  username: string
  display_name: string
  first_name: string
  last_name: string
}

interface Inject {
  id: string
  number: string
  scheduled_start_time: string
  delivery_method: DeliveryMethod
  sender: InjectRole
  recipient: InjectRole
  message: string
  expected_response: string
}

interface ExerciseEvent {
  id: string
  number: number
  description: string
  objectives: Objective[]
  injects: Inject[]
}

export interface ExerciseDetail {
  id: string
  title: string
  scenario: string
  scheduled_start_time: string
  scheduled_end_time: string
  objectives: Objective[]
  references: { id: string; title: string }[]
  participants: Participant[]
  events: ExerciseEvent[]
}

interface ExerciseWorkspaceProps {
  exerciseId: string | null
  form: ReactNode
  onClose: () => void
}

interface EventForm {
  number: string
  description: string
  newObjectives: NewObjective[]
  objectiveIds: string[]
}

interface InjectForm {
  number: string
  scheduledStartTime: string
  deliveryMethod: DeliveryMethod
  sender: InjectRole
  recipient: InjectRole
  message: string
  expectedResponse: string
}

const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  index_card: 'Index card',
  phone_call: 'Phone call',
  email: 'Email',
  chat_message: 'Chat message',
}

const participantRoleLabels: Record<ParticipantRole, string> = {
  facilitator: 'Facilitator',
  ...injectRoleLabels,
}

const createObjectiveValue = 'create-objective'
const newObjectiveValuePrefix = 'new-objective:'

const formatDateTimeLocal = (value: string) => {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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

export function ExerciseWorkspace({ exerciseId, form, onClose }: ExerciseWorkspaceProps) {
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState(0)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ExerciseEvent | null>(null)
  const [eventForm, setEventForm] = useState<EventForm>({ number: '', description: '', newObjectives: [], objectiveIds: [] })
  const [newObjectiveDialogOpen, setNewObjectiveDialogOpen] = useState(false)
  const [newObjectiveDraft, setNewObjectiveDraft] = useState({ title: '', description: '' })
  const [newObjectiveError, setNewObjectiveError] = useState<string | null>(null)
  const [newInjects, setNewInjects] = useState<(InjectForm & { clientId: string })[]>([])
  const [injectError, setInjectError] = useState<string | null>(null)
  const [injectFormOpen, setInjectFormOpen] = useState(false)
  const [injectEvent, setInjectEvent] = useState<ExerciseEvent | null>(null)
  const [editingInject, setEditingInject] = useState<Inject | null>(null)
  const [injectForm, setInjectForm] = useState<InjectForm>({
    number: '', scheduledStartTime: '', deliveryMethod: 'email', sender: 'cybersecurity_service_provider', recipient: 'information_system_security_officer', message: '', expectedResponse: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [participantFormOpen, setParticipantFormOpen] = useState(false)
  const [users, setUsers] = useState<SelectableUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [participantForm, setParticipantForm] = useState<{ username: string; role: ParticipantRole }>({ username: '', role: 'information_system_owner' })
  const [participantError, setParticipantError] = useState<string | null>(null)
  const [updatingParticipantId, setUpdatingParticipantId] = useState<string | null>(null)

  const loadExercise = useCallback(async () => {
    if (!exerciseId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/v1/exercises/${exerciseId}/`)
      if (!response.ok) throw new Error(await getErrorMessage(response))
      setExercise((await response.json()) as ExerciseDetail)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the exercise.')
    } finally {
      setLoading(false)
    }
  }, [exerciseId])

  useEffect(() => {
    setParticipantError(null)
    setStartError(null)
    setParticipantFormOpen(false)
    if (exerciseId) {
      setTab(0)
      void loadExercise()
    } else {
      setExercise(null)
      setTab(0)
    }
  }, [exerciseId, loadExercise])

  const conductExercise = async () => {
    if (!exerciseId || starting) return
    setStarting(true)
    setStartError(null)
    try {
      const response = await fetch(`/api/v1/exercises/${exerciseId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      window.location.hash = `#exercises/${exerciseId}/run`
    } catch (startFailure) {
      setStartError(startFailure instanceof Error ? startFailure.message : 'Could not start the exercise.')
    } finally {
      setStarting(false)
    }
  }

  const openEventForm = (event?: ExerciseEvent) => {
    setEditingEvent(event ?? null)
    setEventForm({
      number: String(event?.number ?? (Math.max(0, ...(exercise?.events.map((item) => item.number) ?? [])) + 1)),
      description: event?.description ?? '',
      newObjectives: [],
      objectiveIds: event?.objectives.map((objective) => objective.id) ?? [],
    })
    setNewInjects([])
    setFormError(null)
    setEventFormOpen(true)
  }

  const openNewObjectiveDialog = () => {
    setNewObjectiveDraft({ title: '', description: '' })
    setNewObjectiveError(null)
    setNewObjectiveDialogOpen(true)
  }

  const addNewObjective = () => {
    const title = newObjectiveDraft.title.trim()
    const description = newObjectiveDraft.description.trim()

    if (!title || !description) {
      setNewObjectiveError('Enter a title and description.')
      return
    }

    setEventForm((currentForm) => ({
      ...currentForm,
      newObjectives: [
        ...currentForm.newObjectives,
        { clientId: crypto.randomUUID(), title, description },
      ],
    }))
    setNewObjectiveDialogOpen(false)
  }

  const saveEvent = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault()
    if (!exercise) return
    setSaving(true)
    setFormError(null)
    try {
      const url = editingEvent
        ? `/api/v1/exercises/${exercise.id}/events/${editingEvent.id}/`
        : `/api/v1/exercises/${exercise.id}/events/`
      const response = await fetch(url, {
        method: editingEvent ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: Number(eventForm.number),
          description: eventForm.description.trim(),
          new_objectives: eventForm.newObjectives.map((objective) => ({
            title: objective.title,
            description: objective.description,
          })),
          objective_ids: eventForm.objectiveIds,
          new_injects: newInjects.map((inject) => ({
            number: inject.number.trim(),
            scheduled_start_time: new Date(inject.scheduledStartTime).toISOString(),
            delivery_method: inject.deliveryMethod,
            sender: inject.sender,
            recipient: inject.recipient,
            message: inject.message.trim(),
            expected_response: inject.expectedResponse.trim(),
          })),
        }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      setEventFormOpen(false)
      await loadExercise()
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Could not save the event.')
    } finally {
      setSaving(false)
    }
  }

  const deleteEvent = async (event: ExerciseEvent) => {
    if (!exercise || !window.confirm(`Delete event ${event.number} and all of its injects?`)) return
    const response = await fetch(`/api/v1/exercises/${exercise.id}/events/${event.id}/`, { method: 'DELETE' })
    if (response.ok) await loadExercise()
    else setError(await getErrorMessage(response))
  }

  const reorderEvents = async (eventId: string, targetIndex: number) => {
    if (!exercise || reordering) return
    const sourceIndex = exercise.events.findIndex((event) => event.id === eventId)
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= exercise.events.length || sourceIndex === targetIndex) return
    const events = [...exercise.events]
    const [movedEvent] = events.splice(sourceIndex, 1)
    events.splice(targetIndex, 0, movedEvent)
    setReordering(true)
    setError(null)
    try {
      const response = await fetch(`/api/v1/exercises/${exercise.id}/events/order/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_ids: events.map((event) => event.id) }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      setExercise((current) => current?.id === exercise.id ? { ...current, events } : current)
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : 'Could not reorder events.')
    } finally {
      setReordering(false)
    }
  }

  const openInjectForm = (event: ExerciseEvent | null, inject?: Inject) => {
    setInjectEvent(event)
    const usedNumbers = new Set([...(event?.injects ?? []).map((item) => item.number), ...newInjects.map((item) => item.number)])
    let suffix = 0
    let defaultNumber = `${eventForm.number}${String.fromCharCode(65 + suffix)}`
    while (usedNumbers.has(defaultNumber)) {
      suffix += 1
      defaultNumber = `${eventForm.number}${suffix < 26 ? String.fromCharCode(65 + suffix) : suffix + 1}`
    }
    setEditingInject(inject ?? null)
    setInjectForm({
      number: inject?.number ?? defaultNumber,
      scheduledStartTime: formatDateTimeLocal(inject?.scheduled_start_time ?? exercise?.scheduled_start_time ?? new Date().toISOString()),
      deliveryMethod: inject?.delivery_method ?? 'email',
      sender: inject?.sender ?? 'cybersecurity_service_provider',
      recipient: inject?.recipient ?? 'information_system_security_officer',
      message: inject?.message ?? '',
      expectedResponse: inject?.expected_response ?? '',
    })
    setInjectError(null)
    setInjectFormOpen(true)
  }

  const saveInject = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault()
    if (!exercise) return
    const number = injectForm.number.trim()
    if (!number || number.length > 10 || !injectForm.message.trim()) {
      setInjectError('Enter an inject number of up to 10 characters and a message.')
      return
    }
    if (!editingInject) {
      if (newInjects.some((inject) => inject.number.trim() === number) || editingEvent?.injects.some((inject) => inject.number === number)) {
        setInjectError('Each inject number must be unique within the event.')
        return
      }
      setNewInjects((current) => [...current, { ...injectForm, number, clientId: crypto.randomUUID() }])
      setInjectFormOpen(false)
      return
    }
    if (!injectEvent) return
    setSaving(true)
    setInjectError(null)
    try {
      const url = editingInject
        ? `/api/v1/exercises/${exercise.id}/events/${injectEvent.id}/injects/${editingInject.id}/`
        : `/api/v1/exercises/${exercise.id}/events/${injectEvent.id}/injects/`
      const response = await fetch(url, {
        method: editingInject ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: injectForm.number.trim(),
          scheduled_start_time: new Date(injectForm.scheduledStartTime).toISOString(),
          delivery_method: injectForm.deliveryMethod,
          sender: injectForm.sender.trim(),
          recipient: injectForm.recipient,
          message: injectForm.message.trim(),
          expected_response: injectForm.expectedResponse.trim(),
        }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      setInjectFormOpen(false)
      await loadExercise()
    } catch (saveError) {
      setInjectError(saveError instanceof Error ? saveError.message : 'Could not save the inject.')
    } finally {
      setSaving(false)
    }
  }

  const deleteInject = async (event: ExerciseEvent, inject: Inject) => {
    if (!exercise || !window.confirm(`Delete inject ${inject.number}?`)) return
    const response = await fetch(`/api/v1/exercises/${exercise.id}/events/${event.id}/injects/${inject.id}/`, { method: 'DELETE' })
    if (response.ok) await loadExercise()
    else setError(await getErrorMessage(response))
  }

  const openParticipantForm = async () => {
    setParticipantForm({ username: '', role: 'information_system_owner' })
    setParticipantError(null)
    setUsers([])
    setParticipantFormOpen(true)
    setLoadingUsers(true)
    try {
      const response = await fetch('/api/v1/users')
      if (!response.ok) throw new Error(await getErrorMessage(response))
      const availableUsers = (await response.json()) as SelectableUser[]
      setUsers(availableUsers.sort((a, b) => (a.last_name || a.display_name).localeCompare(b.last_name || b.display_name) || a.first_name.localeCompare(b.first_name)))
    } catch (loadError) {
      setParticipantError(loadError instanceof Error ? loadError.message : 'Could not load users.')
    } finally {
      setLoadingUsers(false)
    }
  }

  const saveParticipant = async (event: FormEvent) => {
    event.preventDefault()
    if (!exercise) return
    const user = users.find((item) => item.username === participantForm.username)
    if (!user) {
      setParticipantError('Select a user.')
      return
    }
    setSaving(true)
    setParticipantError(null)
    try {
      const response = await fetch(`/api/v1/exercises/${exercise.id}/participants/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: user.first_name || user.display_name, last_name: user.last_name, role: participantForm.role }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      setParticipantFormOpen(false)
      await loadExercise()
    } catch (saveError) {
      setParticipantError(saveError instanceof Error ? saveError.message : 'Could not save the participant.')
    } finally {
      setSaving(false)
    }
  }

  const updateParticipantRole = async (participant: Participant, role: ParticipantRole) => {
    if (!exercise || role === participant.role) return
    setUpdatingParticipantId(participant.id)
    setParticipantError(null)
    try {
      const response = await fetch(`/api/v1/exercises/${exercise.id}/participants/${participant.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      await loadExercise()
    } catch (saveError) {
      setParticipantError(saveError instanceof Error ? saveError.message : 'Could not update the participant role.')
    } finally {
      setUpdatingParticipantId(null)
    }
  }

  const deleteParticipant = async (participant: Participant) => {
    if (!exercise || !window.confirm(`Remove ${participant.first_name} ${participant.last_name} and their recorded responses from this exercise?`)) return
    try {
      const response = await fetch(`/api/v1/exercises/${exercise.id}/participants/${participant.id}/`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await getErrorMessage(response))
      await loadExercise()
    } catch (deleteError) {
      setParticipantError(deleteError instanceof Error ? deleteError.message : 'Could not remove the participant.')
    }
  }

  return (
    <>
      <Dialog fullWidth maxWidth="lg" onClose={form ? undefined : onClose} open={Boolean(exerciseId || form)}>
        {startError && <Alert onClose={() => setStartError(null)} severity="error">{startError}</Alert>}
        {form && tab === 0 ? (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Exercise{exerciseId && <Button disabled={starting} onClick={() => void conductExercise()} variant="contained">{starting ? 'Starting…' : 'Conduct exercise'}</Button>}</DialogTitle>
            <Tabs onChange={(_, value: number) => setTab(value)} value={tab} sx={{ px: 3 }}>
              <Tab label="Overview" />
              <Tab disabled={!exerciseId} label="Participants" />
              <Tab disabled={!exerciseId} label="Master Scenario Event List" />
            </Tabs>
            {form}
          </>
        ) : (
          <>
        <DialogTitle>Exercise</DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : error ? (
            <Alert action={<Button color="inherit" onClick={() => void loadExercise()}>Retry</Button>} severity="error">{error}</Alert>
          ) : exercise ? (
            <>
              <Tabs onChange={(_, value: number) => setTab(value)} value={tab}>
                <Tab label="Overview" />
                <Tab label="Participants" />
                <Tab label="Master Scenario Event List" />
              </Tabs>
              {tab === 1 && (
                <Stack spacing={2} sx={{ pt: 3 }}>
                  {participantError && <Alert onClose={() => setParticipantError(null)} severity="error">{participantError}</Alert>}
                  <Button onClick={() => void openParticipantForm()} startIcon={<AddIcon />} sx={{ alignSelf: 'flex-end' }} variant="contained">Add participant</Button>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Role</TableCell><TableCell>Email</TableCell><TableCell /></TableRow></TableHead>
                      <TableBody>
                        {exercise.participants.map((participant) => <TableRow key={participant.id}>
                          <TableCell>{participant.first_name} {participant.last_name}</TableCell>
                          <TableCell><Box sx={{ display: 'inline-grid', maxWidth: '100%', '& > *': { gridArea: '1 / 1' } }}>
                            {Object.values(participantRoleLabels).map((label) => <Box aria-hidden key={label} sx={{ visibility: 'hidden', whiteSpace: 'nowrap', pl: '14px', pr: '32px' }}>{label}</Box>)}
                            <Select disabled={updatingParticipantId !== null} inputProps={{ 'aria-label': `Role for ${participant.first_name} ${participant.last_name}` }} onChange={(event) => void updateParticipantRole(participant, event.target.value as ParticipantRole)} size="small" sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 0 }, '& .MuiSelect-select:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } }} value={participant.role}>{(Object.keys(participantRoleLabels) as ParticipantRole[]).map((role) => <MenuItem key={role} value={role}>{participantRoleLabels[role]}</MenuItem>)}</Select>
                          </Box></TableCell>
                          <TableCell>{participant.email || '—'}</TableCell>
                          <TableCell><IconButton aria-label={`Remove ${participant.first_name} ${participant.last_name}`} color="error" onClick={() => void deleteParticipant(participant)}><DeleteIcon /></IconButton></TableCell>
                        </TableRow>)}
                        {exercise.participants.length === 0 && <TableRow><TableCell colSpan={4}>No participants have been added.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              )}
              {tab === 2 && (
                <Stack spacing={2} sx={{ pt: 3 }}>
                  <Button onClick={() => openEventForm()} startIcon={<AddIcon />} sx={{ alignSelf: 'flex-end' }} variant="contained">Add event</Button>
                  {exercise.events.length === 0 ? <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">No events have been added.</Paper> : exercise.events.map((event, index) => (
                    <Paper variant="outlined" key={event.id} sx={{ overflow: 'hidden' }}>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', p: 2 }}>
                        <Typography variant="h6">Event {event.number}</Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <IconButton aria-label={`Move event ${event.number} up`} disabled={reordering || index === 0} onClick={() => void reorderEvents(event.id, index - 1)} size="small"><ArrowUpwardIcon /></IconButton>
                        <IconButton aria-label={`Move event ${event.number} down`} disabled={reordering || index === exercise.events.length - 1} onClick={() => void reorderEvents(event.id, index + 1)} size="small"><ArrowDownwardIcon /></IconButton>
                        <IconButton aria-label={`Edit event ${event.number}`} onClick={() => openEventForm(event)}><EditIcon /></IconButton>
                        <IconButton aria-label={`Delete event ${event.number}`} color="error" onClick={() => void deleteEvent(event)}><DeleteIcon /></IconButton>
                      </Stack>
                      <Typography sx={{ px: 2, pb: 2 }}>{event.description}</Typography>
                      <TableContainer sx={{ border: 0, borderRadius: 0, '& tbody tr:last-child td': { borderBottom: 0 } }}>
                        <Table size="small">
                          <TableHead><TableRow><TableCell>Inject</TableCell><TableCell>Scheduled</TableCell><TableCell>Method</TableCell><TableCell>From</TableCell><TableCell>To</TableCell><TableCell>Message</TableCell><TableCell /></TableRow></TableHead>
                          <TableBody>
                            {event.injects.map((inject) => <TableRow key={inject.id}><TableCell>{inject.number}</TableCell><TableCell>{new Date(inject.scheduled_start_time).toLocaleString()}</TableCell><TableCell>{deliveryMethodLabels[inject.delivery_method]}</TableCell><TableCell>{injectRoleLabels[inject.sender]}</TableCell><TableCell>{injectRoleLabels[inject.recipient]}</TableCell><TableCell sx={{ maxWidth: 360 }}>{inject.message}</TableCell><TableCell><IconButton aria-label={`Edit inject ${inject.number}`} onClick={() => openInjectForm(event, inject)}><EditIcon /></IconButton><IconButton aria-label={`Delete inject ${inject.number}`} color="error" onClick={() => void deleteInject(event, inject)}><DeleteIcon /></IconButton></TableCell></TableRow>)}
                            {event.injects.length === 0 && <TableRow><TableCell colSpan={7}>No injects have been added.</TableCell></TableRow>}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  ))}
                </Stack>
              )}
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}><Button color="inherit" onClick={onClose}>Cancel</Button><Button disabled={!exercise || starting} onClick={() => void conductExercise()} variant="contained">{starting ? 'Starting…' : 'Conduct exercise'}</Button></DialogActions>
          </>
        )}
      </Dialog>

      <Dialog fullWidth maxWidth="sm" onClose={() => !saving && setParticipantFormOpen(false)} open={participantFormOpen}>
        <Box component="form" onSubmit={saveParticipant}>
          <DialogTitle>Add participant</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {participantError && <Alert severity="error">{participantError}</Alert>}
              <FormControl required><InputLabel id="participant-name-label">Name</InputLabel><Select disabled={loadingUsers} label="Name" labelId="participant-name-label" onChange={(event) => setParticipantForm((current) => ({ ...current, username: event.target.value }))} value={participantForm.username}>{users.map((user) => <MenuItem key={user.username} value={user.username}>{user.last_name && user.first_name ? `${user.last_name}, ${user.first_name}` : user.display_name}</MenuItem>)}</Select></FormControl>
              <FormControl><InputLabel id="participant-role-label">Role</InputLabel><Select label="Role" labelId="participant-role-label" onChange={(event) => setParticipantForm((current) => ({ ...current, role: event.target.value as ParticipantRole }))} value={participantForm.role}>{(Object.keys(participantRoleLabels) as ParticipantRole[]).map((role) => <MenuItem key={role} value={role}>{participantRoleLabels[role]}</MenuItem>)}</Select></FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'flex-start' }}><Button disabled={saving || loadingUsers} type="submit" variant="contained">Save</Button><Button color="inherit" disabled={saving} onClick={() => setParticipantFormOpen(false)}>Cancel</Button></DialogActions>
        </Box>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" onClose={() => setEventFormOpen(false)} open={eventFormOpen}>
        <Box component="form" onSubmit={saveEvent}><DialogTitle>{editingEvent ? 'Edit event' : 'Add event'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{formError && <Alert severity="error">{formError}</Alert>}{editingEvent && <TextField label="Event number" onChange={(event) => setEventForm((form) => ({ ...form, number: event.target.value }))} required type="number" value={eventForm.number} />}<TextField label="Description" onChange={(event) => setEventForm((form) => ({ ...form, description: event.target.value }))} required value={eventForm.description} /><FormControl><InputLabel id="event-objectives-label">Objectives</InputLabel><Select label="Objectives" labelId="event-objectives-label" multiple onChange={(event) => {
          const value = event.target.value
          const selectedValues = typeof value === 'string' ? value.split(',') : value
          if (selectedValues.includes(createObjectiveValue)) {
            openNewObjectiveDialog()
            return
          }
          setEventForm((currentForm) => ({
            ...currentForm,
            newObjectives: currentForm.newObjectives.filter((objective) => selectedValues.includes(`${newObjectiveValuePrefix}${objective.clientId}`)),
            objectiveIds: selectedValues.filter((selectedValue) => !selectedValue.startsWith(newObjectiveValuePrefix)),
          }))
        }} renderValue={(ids) => ids.map((id) => {
          if (id.startsWith(newObjectiveValuePrefix)) {
            const clientId = id.slice(newObjectiveValuePrefix.length)
            return eventForm.newObjectives.find((objective) => objective.clientId === clientId)?.title
          }
          return exercise?.objectives.find((objective) => objective.id === id)?.title
        }).filter(Boolean).join(', ')} value={[...eventForm.objectiveIds, ...eventForm.newObjectives.map((objective) => `${newObjectiveValuePrefix}${objective.clientId}`)]}>
          <MenuItem value={createObjectiveValue}><AddIcon fontSize="small" sx={{ mr: 1 }} />Create objective</MenuItem>
          {exercise?.objectives.map((objective) => <MenuItem key={objective.id} value={objective.id}><Checkbox checked={eventForm.objectiveIds.includes(objective.id)} /><ListItemText primary={objective.title} secondary={objective.description} /></MenuItem>)}
          {eventForm.newObjectives.map((objective) => <MenuItem key={objective.clientId} value={`${newObjectiveValuePrefix}${objective.clientId}`}><Checkbox checked /><ListItemText primary={objective.title} secondary={`${objective.description} (new)`} /></MenuItem>)}
        </Select></FormControl>
          <Box>
            <Typography sx={{ mb: 1 }}>Injects</Typography>
            <Stack spacing={1}>
              {editingEvent?.injects.map((inject) => <Typography key={inject.id} variant="body2">{inject.number}: {inject.message}</Typography>)}
              {newInjects.map((inject) => <Chip key={inject.clientId} label={`${inject.number}: ${inject.message} (new)`} onDelete={() => setNewInjects((current) => current.filter((item) => item.clientId !== inject.clientId))} />)}
              <Button onClick={() => openInjectForm(editingEvent)} startIcon={<AddIcon />} sx={{ alignSelf: 'flex-start' }}>Add inject</Button>
            </Stack>
          </Box>
        </Stack></DialogContent><DialogActions><Button disabled={saving} type="submit" variant="contained">{saving ? 'Saving…' : 'Save'}</Button><Button onClick={() => setEventFormOpen(false)}>Cancel</Button></DialogActions></Box>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" onClose={() => setNewObjectiveDialogOpen(false)} open={newObjectiveDialogOpen}>
        <DialogTitle>Add objective</DialogTitle>
        <DialogContent>
          {newObjectiveError && <Alert severity="error" sx={{ mb: 2 }}>{newObjectiveError}</Alert>}
          <TextField autoFocus fullWidth label="Title" margin="dense" onChange={(event) => setNewObjectiveDraft((draft) => ({ ...draft, title: event.target.value }))} required value={newObjectiveDraft.title} />
          <TextField fullWidth label="Description" margin="dense" minRows={4} multiline onChange={(event) => setNewObjectiveDraft((draft) => ({ ...draft, description: event.target.value }))} required value={newObjectiveDraft.description} />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-start' }}>
          <Button onClick={addNewObjective} variant="contained">Save</Button>
          <Button color="inherit" onClick={() => setNewObjectiveDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog fullWidth maxWidth="md" onClose={() => setInjectFormOpen(false)} open={injectFormOpen}>
        <Box component="form" onSubmit={saveInject}><DialogTitle>{editingInject ? 'Edit inject' : 'Add inject'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{injectError && <Alert severity="error">{injectError}</Alert>}<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Inject number" onChange={(event) => setInjectForm((form) => ({ ...form, number: event.target.value }))} required value={injectForm.number} /><TextField fullWidth label="Scheduled start" onChange={(event) => setInjectForm((form) => ({ ...form, scheduledStartTime: event.target.value }))} required slotProps={{ inputLabel: { shrink: true } }} type="datetime-local" value={injectForm.scheduledStartTime} /></Stack><FormControl><InputLabel id="delivery-method-label">Delivery method</InputLabel><Select label="Delivery method" labelId="delivery-method-label" onChange={(event) => setInjectForm((form) => ({ ...form, deliveryMethod: event.target.value as DeliveryMethod }))} value={injectForm.deliveryMethod}>{(Object.keys(deliveryMethodLabels) as DeliveryMethod[]).map((method) => <MenuItem key={method} value={method}>{deliveryMethodLabels[method]}</MenuItem>)}</Select></FormControl><FormControl required><InputLabel id="sender-label">From</InputLabel><Select label="From" labelId="sender-label" onChange={(event) => setInjectForm((form) => ({ ...form, sender: event.target.value as InjectRole }))} value={injectForm.sender}>{(Object.keys(injectRoleLabels) as InjectRole[]).map((role) => <MenuItem key={role} value={role}>{injectRoleLabels[role]}</MenuItem>)}</Select></FormControl><FormControl required><InputLabel id="recipient-label">To</InputLabel><Select label="To" labelId="recipient-label" onChange={(event) => setInjectForm((form) => ({ ...form, recipient: event.target.value as InjectRole }))} value={injectForm.recipient}>{(Object.keys(injectRoleLabels) as InjectRole[]).map((role) => <MenuItem key={role} value={role}>{injectRoleLabels[role]}</MenuItem>)}</Select></FormControl><TextField label="Message" minRows={4} multiline onChange={(event) => setInjectForm((form) => ({ ...form, message: event.target.value }))} required value={injectForm.message} /><TextField label="Expected response" minRows={3} multiline onChange={(event) => setInjectForm((form) => ({ ...form, expectedResponse: event.target.value }))} value={injectForm.expectedResponse} /></Stack></DialogContent><DialogActions><Button disabled={saving} type="submit" variant="contained">{saving ? 'Saving…' : 'Save'}</Button><Button onClick={() => setInjectFormOpen(false)}>Cancel</Button></DialogActions></Box>
      </Dialog>
    </>
  )
}
