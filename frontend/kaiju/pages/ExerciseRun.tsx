import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { injectRoleLabels, type InjectRole } from './injectRoles'
import { InjectDeliveryMethod, type DeliveryMethod } from './InjectDeliveryMethod'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Alert, Box, Breadcrumbs, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Link, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'

type ParticipantRole = InjectRole | 'facilitator'
interface Participant { id: string; first_name: string; last_name: string; email: string | null; role: ParticipantRole }
interface Reply { id: string; created_at: string; type: 'response' | 'question'; text: string; participant: Participant }
interface Inject { id: string; number: string; delivery_method: DeliveryMethod; sender: InjectRole; recipient: InjectRole; message: string; expected_response: string; started_at: string | null; ended_at: string | null; responses: Reply[] }
interface Event { id: string; number: number; description: string; injects: Inject[] }
interface Finding { id: string; type: string; topic: string; observation: string; recommendation: string }
interface Objective { id: string; title: string; description: string }
interface Exercise { title: string; scenario: string; type: 'discussion' | 'discussion_and_hands_on'; scheduled_start_time: string; scheduled_end_time: string; facilitator_id: string | null; assistant_facilitator_ids: string[]; participants: Participant[]; objectives: Objective[]; events: Event[]; findings: Finding[] }
interface ChatMessage { id: string; author_name: string; created_at: string; text: string }
interface CurrentUser { email: string }

const participantRoleLabels: Record<ParticipantRole, string> = { facilitator: 'Facilitator', ...injectRoleLabels }

export function ExerciseRun({ exerciseId }: { exerciseId: string }) {
  const [scenarioOpen, setScenarioOpen] = useState(true)
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState('')
  const [editing, setEditing] = useState('')
  const [editText, setEditText] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)
  const [sendingChat, setSendingChat] = useState(false)
  const [replyTo, setReplyTo] = useState('')
  const [replyType, setReplyType] = useState<'response' | 'question'>('response')
  const [replyText, setReplyText] = useState('')
  const [finding, setFinding] = useState({ type: 'sustainment', topic: '', observation: '', recommendation: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const url = `/api/v1/exercises/${exerciseId}/`
  const load = useCallback(async () => {
    try {
      const [result, identity] = await Promise.all([fetch(url), fetch('/api/v1/me')])
      if (!result.ok || !identity.ok) throw new Error('Could not load the exercise feed.')
      setExercise(await result.json() as Exercise)
      setUser(await identity.json() as CurrentUser)
      setError(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load the exercise feed.') }
    finally { setLoading(false) }
  }, [url])
  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(timer)
  }, [load])
  useEffect(() => {
    setMessages([])
    const source = new EventSource(`${url}chat/stream/`)
    source.onmessage = (event) => { setMessages(JSON.parse(event.data) as ChatMessage[]); setChatError(null) }
    source.onerror = () => setChatError('Chat disconnected. Reconnecting…')
    return () => source.close()
  }, [url])
  const changeChat = async (method: string, path: string, text?: string) => {
    try {
      const result = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: text === undefined ? undefined : JSON.stringify({ text }) })
      if (!result.ok) {
        const body = await result.json().catch(() => ({})) as { message?: string; detail?: string }
        throw new Error(body.message || body.detail || `Could not update chat (${result.status}).`)
      }
      if (method === 'DELETE') {
        const messageId = path.split('/').filter(Boolean).at(-1)
        setMessages((current) => current.filter((message) => message.id !== messageId))
      } else {
        const message = await result.json() as ChatMessage
        setMessages((current) => [...current.filter((item) => item.id !== message.id), message].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)))
      }
      setChatError(null)
      return true
    } catch (err) { setChatError(err instanceof Error ? err.message : 'Could not update chat.'); return false }
  }
  const participant = user?.email && exercise?.participants.find((item) => item.email?.toLowerCase() === user.email.toLowerCase())
  const facilitator = participant && participant.role === 'facilitator'
  const availableEvents = exercise?.events.filter((_, index, events) => events.slice(0, index).every((event) => event.injects.length > 0 && event.injects.every((inject) => inject.started_at && inject.ended_at))) ?? []
  const selectedEvent = availableEvents.find((event) => event.id === selectedEventId) ?? availableEvents[0]
  const sent = (selectedEvent?.injects ?? []).filter((inject) => inject.started_at).sort((a, b) => a.started_at!.localeCompare(b.started_at!)).map((inject) => ({ event: selectedEvent!, inject }))
  const post = async (path: string, data?: object) => {
    setSaving(true)
    setError(null)
    try {
      const result = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data ?? {}) })
      if (!result.ok) {
        const body = await result.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message || `Could not save the card (${result.status}).`)
      }
      await load()
      return true
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save the card.'); return false }
    finally { setSaving(false) }
  }
  const sendChat = async () => {
    const text = chatText.trim()
    if (!text || sendingChat) return
    setSendingChat(true)
    try {
      if (await changeChat('POST', `${url}chat/`, text)) setChatText('')
    } finally { setSendingChat(false) }
  }
  const sendReply = async (event: FormEvent, eventId: string, injectId: string) => {
    event.preventDefault()
    if (!replyText.trim()) return
    if (await post(`${url}events/${eventId}/injects/${injectId}/cards/`, { type: replyType, text: replyText.trim() })) {
      setReplyText(''); setReplyTo(''); setReplyType('response')
    }
  }
  const saveFinding = async (event: FormEvent) => {
    event.preventDefault()
    if (!finding.topic.trim() || !finding.observation.trim() || !finding.recommendation.trim()) return
    if (await post(`${url}findings/`, { ...finding, topic: finding.topic.trim(), observation: finding.observation.trim(), recommendation: finding.recommendation.trim() })) setFinding({ type: 'sustainment', topic: '', observation: '', recommendation: '' })
  }
  return <Stack spacing={3}>
      <Breadcrumbs aria-label="Breadcrumb">
        <Link href="#exercises" underline="hover" color="inherit">Exercises</Link>
        <Typography color="text.primary" aria-current="page">{exercise?.title || 'Exercise run'}</Typography>
      </Breadcrumbs>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => void load()}>Retry</Button>}>{error}</Alert>}
      {loading && <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress /></Box>}
      {exercise && <>
        <Paper component="section" aria-label="Exercise Timeline" variant="outlined" sx={{ p: 2, minWidth: 0 }}>
          {exercise.events.length === 0 ? <Typography color="text.secondary">No events have been added.</Typography> :
            <Tabs value={selectedEvent?.id ?? false} onChange={(_, value: string) => { setSelectedEventId(value); setReplyTo('') }} variant="scrollable" scrollButtons="auto" aria-label="Exercise events" sx={{ '& .MuiTabs-list': { width: 'max-content', mx: 'auto' } }}>
              {exercise.events.map((event) => <Tab key={event.id} value={event.id} id={`event-tab-${event.id}`} aria-controls="event-feed-panel" disabled={!availableEvents.some((available) => available.id === event.id)} label={`Event ${event.number}`} />)}
            </Tabs>
          }
        </Paper>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)', lg: scenarioOpen ? 'minmax(220px, 0.8fr) minmax(0, 1.5fr) minmax(300px, 1fr)' : '48px minmax(0, 1.5fr) minmax(300px, 1fr)' }, gap: 2, alignItems: 'start' }}>
        <Paper component="section" aria-label="Exercise details" variant="outlined" sx={{ minWidth: 0, gridColumn: { md: '1 / -1', lg: 'auto' }, display: 'flex', flexDirection: 'column', minHeight: { lg: '55vh' }, justifySelf: { xs: scenarioOpen ? 'stretch' : 'start', lg: 'stretch' } }}>
          <Stack id="scenario-details" spacing={2} hidden={!scenarioOpen} sx={{ display: scenarioOpen ? 'flex' : 'none', p: 2 }}>
          <Box><Typography variant="subtitle2">Scenario</Typography><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{exercise.scenario}</Typography></Box>
          <Divider />
          <Box><Typography variant="subtitle2">Type</Typography><Typography>{exercise.type === 'discussion_and_hands_on' ? 'Discussion and Hands-On' : 'Discussion'}</Typography></Box>
          <Box><Typography variant="subtitle2">Start Time</Typography><Typography>{new Date(exercise.scheduled_start_time).toLocaleString()}</Typography></Box>
          <Box><Typography variant="subtitle2">End Time</Typography><Typography>{new Date(exercise.scheduled_end_time).toLocaleString()}</Typography></Box>
          <Box><Typography variant="subtitle2">Objectives</Typography>{exercise.objectives.length ? <Box component="ul" sx={{ m: 0, pl: 3 }}>{exercise.objectives.map((objective) => <li key={objective.id}><Link component="button" type="button" underline="hover" onClick={() => setSelectedObjective(objective)} sx={{ textAlign: 'left', overflowWrap: 'anywhere' }}>{objective.title}</Link></li>)}</Box> : <Typography color="text.secondary">None specified.</Typography>}</Box>
          {[
            { label: 'Facilitator', people: exercise.participants.filter((person) => person.id === exercise.facilitator_id) },
            { label: 'Assistant Facilitators', people: exercise.participants.filter((person) => exercise.assistant_facilitator_ids.includes(person.id)) },
            ...(Object.keys(injectRoleLabels) as InjectRole[]).map((role) => ({ label: participantRoleLabels[role], people: exercise.participants.filter((person) => person.role === role) })),
          ].filter(({ people }) => people.length > 0).map(({ label, people }) => <Box key={label}>
            <Typography variant="subtitle2">{label}</Typography>
            <Box component="ul" sx={{ m: 0, pl: 3, overflowWrap: 'anywhere' }}>{people.map((person) => <li key={person.id}>{person.first_name} {person.last_name}</li>)}</Box>
          </Box>)}
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton aria-label={scenarioOpen ? 'Collapse exercise details' : 'Expand exercise details'} aria-expanded={scenarioOpen} aria-controls="scenario-details" onClick={() => setScenarioOpen((open) => !open)} sx={{ alignSelf: 'flex-start', borderRadius: 999, justifyContent: 'flex-start', m: 0.25, width: scenarioOpen ? 'calc(100% - 4px)' : 40 }}>{scenarioOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}</IconButton>
        </Paper>
        <Paper component="section" id="event-feed-panel" role="tabpanel" aria-labelledby={selectedEvent ? `event-tab-${selectedEvent.id}` : 'exercise-feed-heading'} variant="outlined" sx={{ p: 2, minWidth: 0 }}><Stack spacing={2}>
        <Typography id="exercise-feed-heading" variant="h6">Feed</Typography>
        {facilitator && <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
          <Typography variant="h6">Events and injects</Typography>
          <Typography color="text.secondary">Make an inject visible to show it and its event in the exercise feed.</Typography>
          {exercise.events.length === 0 && <Typography color="text.secondary">No events have been added.</Typography>}
          {selectedEvent && [selectedEvent].map((event) => <Paper key={event.id} variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
            <Box><Typography variant="subtitle1">Event {event.number}</Typography><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{event.description}</Typography></Box>
            {event.injects.length === 0 && <Typography color="text.secondary">No injects have been added to this event.</Typography>}
            {event.injects.map((inject) => <Paper key={inject.id} variant="outlined" sx={{ p: 2, position: 'relative' }}><Box sx={{ position: 'absolute', top: 16, right: 16 }}><InjectDeliveryMethod method={inject.delivery_method} /></Box><Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', pr: 4 }}><Typography variant="subtitle2">Inject {inject.number}</Typography><Chip size="small" color={inject.ended_at && inject.started_at ? 'success' : 'default'} label={inject.ended_at && inject.started_at ? 'Resolved' : inject.started_at ? 'Visible in feed' : 'Not in feed'} /></Stack>
              <Typography color="text.secondary">From: {injectRoleLabels[inject.sender]} · To: {injectRoleLabels[inject.recipient]}</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{inject.message}</Typography>
              {inject.expected_response && <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>Expected response: {inject.expected_response}</Typography>}
              {!inject.started_at && <Button disabled={saving} variant="contained" sx={{ alignSelf: 'flex-start' }} onClick={() => void post(`${url}events/${event.id}/injects/${inject.id}/send/`)}>Make visible</Button>}
              {inject.started_at && !inject.ended_at && <Button disabled={saving} variant="contained" sx={{ alignSelf: 'flex-start' }} onClick={() => void post(`${url}events/${event.id}/injects/${inject.id}/resolve/`)}>Mark resolved</Button>}
            </Stack></Paper>)}
          </Stack></Paper>)}
        </Stack></Paper>}
        {selectedEvent && sent.length === 0 && <Alert severity="info">No inject cards have been sent for this event yet.</Alert>}
        {sent.map(({ event, inject }) => <Paper key={inject.id} variant="outlined" sx={{ p: 2, position: 'relative' }}><Box sx={{ position: 'absolute', top: 16, right: 16 }}><InjectDeliveryMethod method={inject.delivery_method} /></Box><Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', pr: 4 }}><Chip color="primary" size="small" label="Inject" /><Typography variant="subtitle1">Event {event.number} · Inject {inject.number}</Typography><Typography color="text.secondary" variant="caption">{new Date(inject.started_at!).toLocaleString()}</Typography></Stack>
          <Typography color="text.secondary">{event.description}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 3 }}>
            <Typography><strong>From:</strong> {injectRoleLabels[inject.sender]}</Typography>
            <Typography><strong>To:</strong> {injectRoleLabels[inject.recipient]}</Typography>
          </Stack>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{inject.message}</Typography>
          <Divider />
          {inject.responses.map((reply) => <Paper key={reply.id} variant="outlined" sx={{ p: 2, ml: { sm: 3 } }}><Stack spacing={1}><Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><Chip size="small" label={reply.type === 'question' ? 'Question' : 'Response'} /><Typography variant="subtitle2">{reply.participant.first_name} {reply.participant.last_name}</Typography><Typography color="text.secondary" variant="caption">{new Date(reply.created_at).toLocaleString()}</Typography></Stack><Typography sx={{ whiteSpace: 'pre-wrap' }}>{reply.text}</Typography></Stack></Paper>)}
          {replyTo !== inject.id && <Button sx={{ alignSelf: 'flex-start' }} onClick={() => { setReplyTo(inject.id); setReplyText(''); setReplyType('response') }}>Reply to card</Button>}
          {replyTo === inject.id && <Box component="form" onSubmit={(e) => void sendReply(e, event.id, inject.id)}><Stack spacing={2}><TextField select label="Card type" value={replyType} onChange={(e) => setReplyType(e.target.value as 'response' | 'question')}><MenuItem value="response">Response</MenuItem><MenuItem value="question">Question</MenuItem></TextField><TextField required multiline minRows={2} label="Message" value={replyText} onChange={(e) => setReplyText(e.target.value)} /><Stack direction="row" spacing={1}><Button type="submit" variant="contained" disabled={saving || !replyText.trim()}>Send reply</Button><Button onClick={() => setReplyTo('')}>Cancel</Button></Stack></Stack></Box>}
        </Stack></Paper>)}
        {facilitator && <><Typography variant="h6">Findings</Typography>
          {exercise.findings.length === 0 && <Typography color="text.secondary">No findings recorded.</Typography>}
          {exercise.findings.map((item) => <Paper key={item.id} variant="outlined" sx={{ p: 2 }}><Typography variant="subtitle1">{item.topic} · {item.type === 'sustainment' ? 'Sustainment' : 'Improvement'}</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>Observation: {item.observation}</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>Recommendation: {item.recommendation}</Typography></Paper>)}
          <Box component="form" onSubmit={(event) => void saveFinding(event)}><Stack spacing={2}><Typography variant="subtitle1">Record a finding</Typography><TextField select label="Type" value={finding.type} onChange={(event) => setFinding({ ...finding, type: event.target.value })}><MenuItem value="sustainment">Sustainment</MenuItem><MenuItem value="improvement">Improvement</MenuItem></TextField><TextField required label="Topic" slotProps={{ htmlInput: { maxLength: 50 } }} value={finding.topic} onChange={(event) => setFinding({ ...finding, topic: event.target.value })} /><TextField required multiline label="Observation" value={finding.observation} onChange={(event) => setFinding({ ...finding, observation: event.target.value })} /><TextField required multiline label="Recommendation" value={finding.recommendation} onChange={(event) => setFinding({ ...finding, recommendation: event.target.value })} /><Button disabled={saving || !finding.topic.trim() || !finding.observation.trim() || !finding.recommendation.trim()} type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>Record finding</Button></Stack></Box>
        </>}
        </Stack></Paper>
        <Paper component="section" aria-labelledby="exercise-chat-heading" variant="outlined" sx={{ p: 2, minWidth: 0 }}><Stack spacing={2}>
          <Typography id="exercise-chat-heading" variant="h6">Chat</Typography>
          {chatError && <Alert severity="warning">{chatError}</Alert>}
          <Stack spacing={2} sx={{ maxHeight: { xs: 360, lg: "55vh" }, overflowY: "auto" }}>
          {messages.length === 0 && <Typography color="text.secondary">No messages yet.</Typography>}
          {messages.map((message) => <Paper key={message.id} variant="outlined" sx={{ p: 2 }}><Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><Typography variant="subtitle2">{message.author_name}</Typography><Typography variant="caption" color="text.secondary">{new Date(message.created_at).toLocaleString()}</Typography></Stack>
            {editing === message.id ? <><TextField multiline value={editText} onChange={(event) => setEditText(event.target.value)} slotProps={{ htmlInput: { maxLength: 10000 } }} /><Stack direction="row"><Button disabled={!editText.trim()} onClick={() => void changeChat('PATCH', `${url}chat/${message.id}/`, editText).then((ok) => { if (ok) setEditing('') })}>Save</Button><Button onClick={() => setEditing('')}>Cancel</Button></Stack></> : <><Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.text}</Typography>{facilitator && <Stack direction="row"><Button onClick={() => { setEditing(message.id); setEditText(message.text) }}>Edit</Button><Button onClick={() => { if (window.confirm('Delete this message?')) void changeChat('DELETE', `${url}chat/${message.id}/`) }}>Delete</Button></Stack>}</>}
          </Stack></Paper>)}
          </Stack>
          <Box component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); void sendChat() }}><Stack spacing={1}><TextField label="Message everyone" multiline value={chatText} onChange={(event) => setChatText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendChat() } }} helperText="Press Enter to send or Shift+Enter for a new line." slotProps={{ htmlInput: { maxLength: 10000 } }} /><Button type="submit" variant="contained" disabled={!chatText.trim() || sendingChat} sx={{ alignSelf: 'flex-start' }}>{sendingChat ? 'Sending…' : 'Send message'}</Button></Stack></Box>
        </Stack></Paper>
        </Box>
      </>}
      <Dialog open={selectedObjective !== null} onClose={() => setSelectedObjective(null)} fullWidth maxWidth="sm" aria-labelledby="objective-dialog-title">
        <DialogTitle id="objective-dialog-title">{selectedObjective?.title}</DialogTitle>
        <DialogContent><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selectedObjective?.description}</Typography></DialogContent>
        <DialogActions><Button onClick={() => setSelectedObjective(null)}>Close</Button></DialogActions>
      </Dialog>
    </Stack>
}
