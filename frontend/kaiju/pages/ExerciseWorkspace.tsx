import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
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
import { useCallback, useEffect, useState, type FormEvent } from 'react'

type DeliveryMethod = 'index_card' | 'phone_call' | 'email' | 'chat_message'
type InjectRole = 'information_system_owner' | 'information_system_security_manager' | 'information_system_security_officer' | 'system_administrator' | 'user' | 'cybersecurity_service_provider' | 'opposing_force'

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
  role: string
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
  onClose: () => void
  onEdit: () => void
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

const injectRoleLabels: Record<InjectRole, string> = {
  information_system_owner: 'Information System Owner',
  information_system_security_manager: 'Information System Security Manager',
  information_system_security_officer: 'Information System Security Officer',
  system_administrator: 'System Administrator',
  user: 'User',
  cybersecurity_service_provider: 'Cybersecurity Service Provider',
  opposing_force: 'Opposing Force',
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

const participantName = (participant: Participant) =>
  `${participant.first_name} ${participant.last_name}`.trim() || participant.email || 'Unnamed participant'

export function ExerciseWorkspace({ exerciseId, onClose, onEdit }: ExerciseWorkspaceProps) {
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState(0)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ExerciseEvent | null>(null)
  const [eventForm, setEventForm] = useState<EventForm>({ number: '', description: '', newObjectives: [], objectiveIds: [] })
  const [newObjectiveDialogOpen, setNewObjectiveDialogOpen] = useState(false)
  const [newObjectiveDraft, setNewObjectiveDraft] = useState({ title: '', description: '' })
  const [newObjectiveError, setNewObjectiveError] = useState<string | null>(null)
  const [injectFormOpen, setInjectFormOpen] = useState(false)
  const [injectEvent, setInjectEvent] = useState<ExerciseEvent | null>(null)
  const [editingInject, setEditingInject] = useState<Inject | null>(null)
  const [injectForm, setInjectForm] = useState<InjectForm>({
    number: '', scheduledStartTime: '', deliveryMethod: 'email', sender: 'cybersecurity_service_provider', recipient: 'information_system_security_officer', message: '', expectedResponse: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    if (exerciseId) {
      setTab(0)
      void loadExercise()
    } else {
      setExercise(null)
    }
  }, [exerciseId, loadExercise])

  const openEventForm = (event?: ExerciseEvent) => {
    setEditingEvent(event ?? null)
    setEventForm({
      number: String(event?.number ?? ((exercise?.events.length ?? 0) + 1)),
      description: event?.description ?? '',
      newObjectives: [],
      objectiveIds: event?.objectives.map((objective) => objective.id) ?? [],
    })
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

  const openInjectForm = (event: ExerciseEvent, inject?: Inject) => {
    setInjectEvent(event)
    setEditingInject(inject ?? null)
    setInjectForm({
      number: inject?.number ?? `${event.number}${String.fromCharCode(65 + event.injects.length)}`,
      scheduledStartTime: formatDateTimeLocal(inject?.scheduled_start_time ?? exercise?.scheduled_start_time ?? new Date().toISOString()),
      deliveryMethod: inject?.delivery_method ?? 'email',
      sender: inject?.sender ?? 'cybersecurity_service_provider',
      recipient: inject?.recipient ?? 'information_system_security_officer',
      message: inject?.message ?? '',
      expectedResponse: inject?.expected_response ?? '',
    })
    setFormError(null)
    setInjectFormOpen(true)
  }

  const saveInject = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault()
    if (!exercise || !injectEvent) return
    setSaving(true)
    setFormError(null)
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
      setFormError(saveError instanceof Error ? saveError.message : 'Could not save the inject.')
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

  return (
    <>
      <Dialog fullWidth maxWidth="lg" onClose={onClose} open={Boolean(exerciseId)}>
        <DialogTitle>{exercise?.title ?? 'Exercise'}</DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : error ? (
            <Alert action={<Button color="inherit" onClick={() => void loadExercise()}>Retry</Button>} severity="error">{error}</Alert>
          ) : exercise ? (
            <>
              <Tabs onChange={(_, value: number) => setTab(value)} value={tab}>
                <Tab label="Overview" />
                <Tab label="Master Scenario Event List" />
              </Tabs>
              {tab === 0 && (
                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, pt: 3 }}>
                  <Stack spacing={3}>
                    <Box><Typography color="text.secondary" variant="overline">Facilitator</Typography><Typography>{exercise.participants.filter((participant) => participant.role === 'facilitator').map(participantName).join(', ') || 'No facilitator'}</Typography></Box>
                    <Box><Typography color="text.secondary" variant="overline">Participants</Typography><Typography>{exercise.participants.map(participantName).join(', ') || 'No participants'}</Typography></Box>
                  </Stack>
                  <Stack spacing={3}>
                    <Box><Typography color="text.secondary" variant="overline">References</Typography><Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>{exercise.references.map((reference) => <Chip key={reference.id} label={reference.title} />)}</Stack></Box>
                    <Box><Typography color="text.secondary" variant="overline">Objectives</Typography><Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>{exercise.objectives.map((objective) => <Chip key={objective.id} label={objective.title} />)}</Stack></Box>
                  </Stack>
                  <Stack spacing={3}>
                    <Box><Typography color="text.secondary" variant="overline">Schedule</Typography><Typography>{new Date(exercise.scheduled_start_time).toLocaleString()} – {new Date(exercise.scheduled_end_time).toLocaleString()}</Typography></Box>
                    <Box><Typography color="text.secondary" variant="overline">Scenario</Typography><Typography>{exercise.scenario}</Typography></Box>
                  </Stack>
                </Box>
              )}
              {tab === 1 && (
                <Stack spacing={2} sx={{ pt: 3 }}>
                  <Button onClick={() => openEventForm()} startIcon={<AddIcon />} sx={{ alignSelf: 'flex-start' }} variant="contained">Add event</Button>
                  {exercise.events.length === 0 ? <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">No events have been added.</Paper> : exercise.events.map((event) => (
                    <Paper key={event.id} sx={{ overflow: 'hidden' }} variant="outlined">
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', p: 2 }}>
                        <Typography variant="h6">Event {event.number}: {event.description}</Typography>
                        <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>{event.objectives.map((objective) => <Chip key={objective.id} label={objective.title} size="small" />)}</Stack>
                        <Button onClick={() => openInjectForm(event)} startIcon={<AddIcon />}>Add inject</Button>
                        <IconButton aria-label={`Edit event ${event.number}`} onClick={() => openEventForm(event)}><EditIcon /></IconButton>
                        <IconButton aria-label={`Delete event ${event.number}`} color="error" onClick={() => void deleteEvent(event)}><DeleteIcon /></IconButton>
                      </Stack>
                      <TableContainer>
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
        <DialogActions><Button onClick={onClose}>Close</Button>{exercise && <Button onClick={onEdit} startIcon={<EditIcon />} variant="contained">Edit exercise</Button>}</DialogActions>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" onClose={() => setEventFormOpen(false)} open={eventFormOpen}>
        <Box component="form" onSubmit={saveEvent}><DialogTitle>{editingEvent ? 'Edit event' : 'Add event'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{formError && <Alert severity="error">{formError}</Alert>}<TextField label="Event number" onChange={(event) => setEventForm((form) => ({ ...form, number: event.target.value }))} required type="number" value={eventForm.number} /><TextField label="Description" onChange={(event) => setEventForm((form) => ({ ...form, description: event.target.value }))} required value={eventForm.description} /><FormControl><InputLabel id="event-objectives-label">Objectives</InputLabel><Select label="Objectives" labelId="event-objectives-label" multiple onChange={(event) => {
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
        </Select></FormControl></Stack></DialogContent><DialogActions><Button disabled={saving} type="submit" variant="contained">{saving ? 'Saving…' : 'Save'}</Button><Button onClick={() => setEventFormOpen(false)}>Cancel</Button></DialogActions></Box>
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
        <Box component="form" onSubmit={saveInject}><DialogTitle>{editingInject ? 'Edit inject' : 'Add inject'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{formError && <Alert severity="error">{formError}</Alert>}<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Inject number" onChange={(event) => setInjectForm((form) => ({ ...form, number: event.target.value }))} required value={injectForm.number} /><TextField fullWidth label="Scheduled start" onChange={(event) => setInjectForm((form) => ({ ...form, scheduledStartTime: event.target.value }))} required slotProps={{ inputLabel: { shrink: true } }} type="datetime-local" value={injectForm.scheduledStartTime} /></Stack><FormControl><InputLabel id="delivery-method-label">Delivery method</InputLabel><Select label="Delivery method" labelId="delivery-method-label" onChange={(event) => setInjectForm((form) => ({ ...form, deliveryMethod: event.target.value as DeliveryMethod }))} value={injectForm.deliveryMethod}>{(Object.keys(deliveryMethodLabels) as DeliveryMethod[]).map((method) => <MenuItem key={method} value={method}>{deliveryMethodLabels[method]}</MenuItem>)}</Select></FormControl><FormControl required><InputLabel id="sender-label">From</InputLabel><Select label="From" labelId="sender-label" onChange={(event) => setInjectForm((form) => ({ ...form, sender: event.target.value as InjectRole }))} value={injectForm.sender}>{(Object.keys(injectRoleLabels) as InjectRole[]).map((role) => <MenuItem key={role} value={role}>{injectRoleLabels[role]}</MenuItem>)}</Select></FormControl><FormControl required><InputLabel id="recipient-label">To</InputLabel><Select label="To" labelId="recipient-label" onChange={(event) => setInjectForm((form) => ({ ...form, recipient: event.target.value as InjectRole }))} value={injectForm.recipient}>{(Object.keys(injectRoleLabels) as InjectRole[]).map((role) => <MenuItem key={role} value={role}>{injectRoleLabels[role]}</MenuItem>)}</Select></FormControl><TextField label="Message" minRows={4} multiline onChange={(event) => setInjectForm((form) => ({ ...form, message: event.target.value }))} required value={injectForm.message} /><TextField label="Expected response" minRows={3} multiline onChange={(event) => setInjectForm((form) => ({ ...form, expectedResponse: event.target.value }))} value={injectForm.expectedResponse} /></Stack></DialogContent><DialogActions><Button disabled={saving} type="submit" variant="contained">{saving ? 'Saving…' : 'Save'}</Button><Button onClick={() => setInjectFormOpen(false)}>Cancel</Button></DialogActions></Box>
      </Dialog>
    </>
  )
}
