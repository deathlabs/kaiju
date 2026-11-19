import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import { injectRoleLabels, type InjectRole } from './injectRoles'
import { InjectDeliveryMethod, type DeliveryMethod } from './InjectDeliveryMethod'
import { DeathlabsPageHeader } from '../components/DeathlabsPageHeader'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControl, FormControlLabel, Dialog, DialogActions, DialogContent, DialogTitle, Divider, InputAdornment, InputLabel, Link, ListItemText, MenuItem, Paper, Select, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Tabs, TextField, Tooltip, Typography } from '@mui/material'

type ParticipantRole = InjectRole | 'facilitator'
interface Participant { id: string; first_name: string; last_name: string; email: string | null; role: ParticipantRole }
interface Reply { id: string; created_at: string; type: 'response' | 'question'; text: string; participant: Participant }
interface Inject { id: string; number: string; delivery_method: DeliveryMethod; sender: InjectRole; recipient: InjectRole; message: string; expected_response: string; started_at: string | null; is_visible: boolean; ended_at: string | null; responses: Reply[] }
interface Event { id: string; number: number; description: string; injects: Inject[] }
interface Finding { id: string; type: string; topic: string; observation: string; recommendation: string; created_by: { first_name: string; last_name: string; username: string } }
type FindingSortField = 'topic' | 'type' | 'observation' | 'recommendation' | 'author'
interface Objective { id: string; title: string; description: string }
interface Exercise { title: string; scenario: string; type: 'discussion' | 'discussion_and_hands_on'; scheduled_start_time: string; scheduled_end_time: string; facilitator_id: string | null; assistant_facilitator_ids: string[]; participants: Participant[]; references: { id: string; title: string; url: string }[]; objectives: Objective[]; events: Event[]; findings: Finding[] }
interface ChatMessage { id: string; author_name: string; created_at: string; text: string }
interface CurrentUser { email: string }

const participantRoleLabels: Record<ParticipantRole, string> = { facilitator: 'Facilitator', ...injectRoleLabels }
const findingTopicOptions = ['Policy', 'Standard', 'Procedure', 'Guideline'] as const
const findingAuthor = (finding: Finding) => [finding.created_by.first_name, finding.created_by.last_name].filter(Boolean).join(' ') || finding.created_by.username
const stakeholderRoleLabels: Partial<Record<InjectRole, string>> = {
  information_system_security_officer: 'Information System Security Officers',
  system_administrator: 'System Administrators',
  user: 'Users',
}

export function ExerciseRun({ exerciseId }: { exerciseId: string }) {
  const showChat = false
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null)
  const [selectedRole, setSelectedRole] = useState<InjectRole | null>(null)
  const [facilitatorOpen, setFacilitatorOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>('introduction')
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
  const [findingOpen, setFindingOpen] = useState(false)
  const [findingSearch, setFindingSearch] = useState('')
  const [findingTypes, setFindingTypes] = useState<string[]>([])
  const [findingTopics, setFindingTopics] = useState<string[]>([])
  const [findingSort, setFindingSort] = useState<{ field: FindingSortField; direction: 'asc' | 'desc' }>({ field: 'topic', direction: 'asc' })
  const [finding, setFinding] = useState({ type: 'improvement', topic: '', observation: '', recommendation: '' })
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
    if (!showChat) return
    setMessages([])
    const source = new EventSource(`${url}chat/stream/`)
    source.onmessage = (event) => { setMessages(JSON.parse(event.data) as ChatMessage[]); setChatError(null) }
    source.onerror = () => setChatError('Chat disconnected. Reconnecting…')
    return () => source.close()
  }, [url, showChat])
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
  const availableEvents = exercise?.events.filter((event, index, events) => (event.injects.length > 0 && event.injects.every((inject) => inject.ended_at)) || events.slice(0, index).every((previous) => previous.injects.length > 0 && previous.injects.every((inject) => inject.started_at && inject.ended_at))) ?? []
  const selectableEvents = facilitator ? exercise?.events ?? [] : availableEvents
  const introductionSelected = selectedEventId === 'introduction'
  const findingsSelected = selectedEventId === 'findings'
  const selectedEvent = introductionSelected || findingsSelected ? undefined : selectableEvents.find((event) => event.id === selectedEventId) ?? selectableEvents[0]
  const sent = (selectedEvent?.injects ?? []).filter((inject) => facilitator || inject.is_visible).map((inject) => ({ event: selectedEvent!, inject }))
  const filteredFindings = (exercise?.findings ?? []).filter((item) => {
    const author = findingAuthor(item)
    return (!findingTypes.length || findingTypes.includes(item.type)) && (!findingTopics.length || findingTopics.includes(item.topic)) && [item.type, item.topic, item.observation, item.recommendation, author].join(' ').toLocaleLowerCase().includes(findingSearch.trim().toLocaleLowerCase())
  }).sort((a, b) => {
    const first = findingSort.field === 'author' ? findingAuthor(a) : a[findingSort.field]
    const second = findingSort.field === 'author' ? findingAuthor(b) : b[findingSort.field]
    return first.localeCompare(second, undefined, { sensitivity: 'base' }) * (findingSort.direction === 'asc' ? 1 : -1)
  })
  const post = async (path: string, data?: object, method = 'POST') => {
    setSaving(true)
    setError(null)
    try {
      const result = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data ?? {}) })
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
    if (await post(`${url}findings/`, { ...finding, topic: finding.topic.trim(), observation: finding.observation.trim(), recommendation: finding.recommendation.trim() })) {
      setFinding({ type: 'improvement', topic: '', observation: '', recommendation: '' })
      setFindingOpen(false)
    }
  }
  return <Stack spacing={3}>
      <Box sx={{ display: 'grid', gridTemplateAreas: '"breadcrumbs action"', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 2 }}>
        <Box component="nav" aria-label="Breadcrumb" sx={{ gridArea: 'breadcrumbs', minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
          <DeathlabsPageHeader gutterBottom={false}><Link href="#exercises" color="inherit" underline="hover">Exercises</Link></DeathlabsPageHeader>
          {exercise && <><Typography aria-hidden="true" color="text.secondary" variant="h4">›</Typography><Typography component="span" variant="h4" color="text.primary" aria-current="page">{exercise.title}</Typography></>}
        </Box>
        {exercise && <>
        <Button onClick={() => { setError(null); setFindingOpen(true) }} startIcon={<AddIcon />} variant="contained" sx={{ gridArea: 'action', justifySelf: 'end', whiteSpace: 'nowrap' }}>Add finding</Button>
        </>}
      </Box>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => void load()}>Retry</Button>}>{error}</Alert>}
      {loading && <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress /></Box>}
      {exercise && <>
        <Box sx={{ display: 'grid', gridTemplateColumns: showChat ? { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)' } : 'minmax(0, 1fr)', gap: 2, alignItems: 'start' }}>
        <Box component="section" aria-label="Feed" sx={{ p: 2, minWidth: 0 }}><Stack spacing={2}>
        <Box component="section" aria-label="Exercise Timeline" sx={{ minWidth: 0, overflowX: 'auto' }}>
          <Box sx={{ overflowX: 'auto' }}><Box sx={{ width: 'max-content', minWidth: '100%' }}>
          <Tabs value={introductionSelected ? 'introduction' : findingsSelected ? 'findings' : selectedEvent?.id ?? 'introduction'} onChange={(_, value: string) => { setSelectedEventId(value); setReplyTo('') }} variant="standard" aria-label="Exercise timeline" sx={{ '& .MuiTabs-list': { width: 'max-content', mx: 'auto' } }}>
              <Tab value="introduction" id="introduction-tab" aria-controls="event-feed-panel" label={<Typography component="span" role="heading" aria-level={2} variant="h6">Introduction</Typography>} sx={{ minWidth: 0, px: 2, color: 'text.primary' }} />
              {exercise.events.map((event) => <Tab key={event.id} value={event.id} id={`event-tab-${event.id}`} aria-controls="event-feed-panel" disabled={!selectableEvents.some((available) => available.id === event.id)} label={<Typography component="span" role="heading" aria-level={2} variant="h6" sx={{ whiteSpace: 'nowrap' }}>Event {event.number}</Typography>} sx={{ minWidth: 0, px: 2, color: 'text.primary', '&.Mui-disabled': { color: 'text.disabled' } }} />)}
              <Tab value="findings" id="findings-tab" aria-controls="event-feed-panel" label={<Typography component="span" role="heading" aria-level={2} variant="h6">Conclusion</Typography>} sx={{ minWidth: 0, px: 2, color: 'text.primary' }} />
            </Tabs>
          </Box></Box>
        </Box>
        <Box id="event-feed-panel" role="tabpanel" aria-labelledby={introductionSelected ? 'introduction-tab' : findingsSelected ? 'findings-tab' : selectedEvent ? `event-tab-${selectedEvent.id}` : undefined} aria-label={introductionSelected || findingsSelected || selectedEvent ? undefined : "Feed"} sx={{ pt: 2 }}><Stack spacing={2}>
        {introductionSelected && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 5fr)' }, gap: 3 }}>
          <Paper component="section" aria-label="Scenario details" variant="outlined" sx={{ p: 2, minWidth: 0 }}><Stack spacing={2}>
            <Typography component="h2" variant="h6">Details</Typography>
            <Box><Typography variant="subtitle2">Scenario</Typography><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{exercise.scenario}</Typography></Box>
            <Box><Typography variant="subtitle2">Type</Typography><Typography>{exercise.type === 'discussion_and_hands_on' ? 'Discussion and Hands-On' : 'Discussion'}</Typography></Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
              <Box><Typography variant="subtitle2">Start Time</Typography><Typography>{new Date(exercise.scheduled_start_time).toLocaleString()}</Typography></Box>
              <Box><Typography variant="subtitle2">End Time</Typography><Typography>{new Date(exercise.scheduled_end_time).toLocaleString()}</Typography></Box>
            </Box>
            <Box><Typography variant="subtitle2">References</Typography>{exercise.references.length ? <Box component="ul" sx={{ m: 0, pl: 3, overflowWrap: 'anywhere' }}>{exercise.references.map((reference) => <li key={reference.id}><Link href={reference.url} target="_blank" rel="noopener noreferrer">{reference.title}</Link></li>)}</Box> : <Typography color="text.secondary">None specified.</Typography>}</Box>
            <Box><Typography variant="subtitle2">Objectives</Typography>{exercise.objectives.length ? <Box component="ul" sx={{ m: 0, pl: 3 }}>{exercise.objectives.map((objective) => <li key={objective.id}><Link component="button" type="button" underline="hover" onClick={() => setSelectedObjective(objective)} sx={{ textAlign: 'left', overflowWrap: 'anywhere' }}>{objective.title}</Link></li>)}</Box> : <Typography color="text.secondary">None specified.</Typography>}</Box>
          </Stack></Paper>
          <Paper component="section" aria-labelledby="facilitators-heading" variant="outlined" sx={{ p: 2, minWidth: 0 }}><Stack spacing={2}>
            <Typography id="facilitators-heading" component="h2" variant="h6">Facilitators</Typography>
            {[
              { label: 'Primary Facilitator', people: exercise.participants.filter((person) => person.id === exercise.facilitator_id) },
              { label: 'Assistant Facilitators', people: exercise.participants.filter((person) => exercise.assistant_facilitator_ids.includes(person.id)) },
            ].filter(({ people }) => people.length > 0).map(({ label, people }) => <Box key={label}>
              <Typography variant="subtitle2">{label}</Typography>
              <Box component="ul" sx={{ m: 0, pl: 3, overflowWrap: 'anywhere' }}>{people.map((person) => <li key={person.id}>{person.first_name} {person.last_name}</li>)}</Box>
            </Box>)}
          </Stack></Paper>
          <Paper component="section" aria-labelledby="participants-heading" variant="outlined" sx={{ p: 2, minWidth: 0, overflowX: 'auto' }}><Typography id="participants-heading" component="h2" variant="h6" sx={{ mb: 2 }}>Participants</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'max-content', sm: 'repeat(2, max-content)', lg: 'repeat(4, max-content)' }, rowGap: 3, columnGap: 3, alignContent: 'start' }}>
          {[
              { title: 'Internal Stakeholders', roles: ['information_system_owner', 'information_system_security_manager', 'information_system_security_officer'] as InjectRole[] },
              { title: 'System Administrators and Users', roles: ['system_administrator', 'user'] as InjectRole[] },
              { title: 'Cybersecurity Service Provider', roles: ['cybersecurity_service_provider'] as InjectRole[] },
              { title: 'Red Team', roles: ['opposing_force'] as InjectRole[] },
          ].map(({ title, roles }) => ({ title, groups: roles.map((role) => ({ label: stakeholderRoleLabels[role] ?? participantRoleLabels[role], people: exercise.participants.filter((person) => person.role === role) })) })).map(({ title, groups }) => <Stack key={title} component="section" aria-label={title} spacing={2} sx={{ minWidth: 0 }}>
            {groups.every(({ people }) => people.length === 0) && <Typography color="text.secondary">None specified.</Typography>}
            {groups.filter(({ people }) => people.length > 0).map(({ label, people }) => <Box key={label}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>{label}</Typography>
              <Box component="ul" sx={{ m: 0, pl: 3, overflowWrap: 'anywhere' }}>{people.map((person) => <li key={person.id}>{person.first_name} {person.last_name}</li>)}</Box>
            </Box>)}
          </Stack>)}
          </Box></Paper>
        </Box>}
        {selectedEvent && sent.length === 0 && <Alert severity="info">The <Link component="button" type="button" onClick={() => setFacilitatorOpen(true)} sx={{ verticalAlign: 'baseline' }}>facilitator</Link> has not started this event yet.</Alert>}
        {sent.map(({ event, inject }) => <Paper key={inject.id} variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><InjectDeliveryMethod method={inject.delivery_method} /><Typography variant="subtitle1">Inject {inject.number}</Typography></Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', ml: 'auto !important' }}>
              {inject.started_at && <Typography color="text.secondary" variant="caption">{new Date(inject.started_at).toLocaleString()}</Typography>}
              <Chip size="small" label={inject.ended_at ? 'Resolved' : 'Unresolved'} color={inject.ended_at ? 'success' : 'default'} />
            </Stack>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography><strong>From:</strong> <Link component="button" type="button" underline="hover" onClick={() => setSelectedRole(inject.sender)}>{injectRoleLabels[inject.sender]}</Link></Typography>
            <Typography><strong>To:</strong> <Link component="button" type="button" underline="hover" onClick={() => setSelectedRole(inject.recipient)}>{injectRoleLabels[inject.recipient]}</Link></Typography>
          </Stack>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{inject.message}</Typography>
          {facilitator && inject.expected_response && <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>Expected response: {inject.expected_response}</Typography>}
          {facilitator && <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><Tooltip describeChild title="Show or hide this inject in the participant feed"><FormControlLabel label="Visible?" control={<Switch checked={inject.is_visible} disabled={saving} onChange={(e) => void post(`${url}events/${event.id}/injects/${inject.id}/`, { is_visible: e.target.checked }, 'PATCH')} />} /></Tooltip><FormControlLabel label="Resolved?" control={<Switch checked={!!inject.ended_at} disabled={saving} onChange={(e) => void post(`${url}events/${event.id}/injects/${inject.id}/`, { ended_at: e.target.checked ? new Date().toISOString() : null, ...(e.target.checked ? { is_visible: true } : {}) }, 'PATCH')} />} /></Stack>}
          {inject.started_at && <>
          <Divider />
          {inject.responses.map((reply) => <Paper key={reply.id} variant="outlined" sx={{ p: 2, ml: { sm: 3 } }}><Stack spacing={1}><Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><Chip size="small" label={reply.type === 'question' ? 'Question' : 'Response'} /><Typography variant="subtitle2">{reply.participant.first_name} {reply.participant.last_name}</Typography><Typography color="text.secondary" variant="caption">{new Date(reply.created_at).toLocaleString()}</Typography></Stack><Typography sx={{ whiteSpace: 'pre-wrap' }}>{reply.text}</Typography></Stack></Paper>)}
          {replyTo !== inject.id && <Button sx={{ alignSelf: 'flex-start' }} onClick={() => { setReplyTo(inject.id); setReplyText(''); setReplyType('response') }}>Reply to card</Button>}
          {replyTo === inject.id && <Box component="form" onSubmit={(e) => void sendReply(e, event.id, inject.id)}><Stack spacing={2}><TextField select label="Card type" value={replyType} onChange={(e) => setReplyType(e.target.value as 'response' | 'question')}><MenuItem value="response">Response</MenuItem><MenuItem value="question">Question</MenuItem></TextField><TextField required multiline minRows={2} label="Message" value={replyText} onChange={(e) => setReplyText(e.target.value)} /><Stack direction="row" spacing={1}><Button type="submit" variant="contained" disabled={saving || !replyText.trim()}>Send reply</Button><Button onClick={() => setReplyTo('')}>Cancel</Button></Stack></Stack></Box>}
          </>}
        </Stack></Paper>)}
        {findingsSelected && <>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <TextField size="small" placeholder="Search by type, topic, observation, recommendation, or author" value={findingSearch} onChange={(event) => setFindingSearch(event.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Search findings' }, input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }} sx={{ flexGrow: 1, minWidth: { sm: 240 } }} />
            <FormControl size="small" sx={{ minWidth: 180 }}><InputLabel id="finding-type-filter-label" shrink>Type</InputLabel><Select multiple displayEmpty label="Type" labelId="finding-type-filter-label" value={findingTypes} onChange={(event) => { const value = event.target.value; const types = typeof value === 'string' ? value.split(',') : value; setFindingTypes(types.includes('all') ? [] : types) }} renderValue={(types) => types.length ? types.map((type) => type === 'sustainment' ? 'Sustainment' : 'Improvement').join(', ') : 'All'}>
              <MenuItem value="all"><Checkbox checked={findingTypes.length === 0} /><ListItemText primary="All" /></MenuItem>
              {['sustainment', 'improvement'].map((type) => <MenuItem key={type} value={type}><Checkbox checked={findingTypes.includes(type)} /><ListItemText primary={type === 'sustainment' ? 'Sustainment' : 'Improvement'} /></MenuItem>)}
            </Select></FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}><InputLabel id="finding-topic-filter-label" shrink>Topic</InputLabel><Select multiple displayEmpty label="Topic" labelId="finding-topic-filter-label" value={findingTopics.map((topic) => `topic:${topic}`)} onChange={(event) => { const value = event.target.value; const topics = typeof value === 'string' ? value.split(',') : value; setFindingTopics(topics.includes('all') ? [] : topics.map((topic) => topic.slice(6))) }} renderValue={(topics) => topics.length ? topics.map((topic) => topic.slice(6)).join(', ') : 'All'}>
              <MenuItem value="all"><Checkbox checked={findingTopics.length === 0} /><ListItemText primary="All" /></MenuItem>
              {[...new Set(exercise.findings.map((item) => item.topic))].sort((a, b) => a.localeCompare(b)).map((topic) => <MenuItem key={topic} value={`topic:${topic}`}><Checkbox checked={findingTopics.includes(topic)} /><ListItemText primary={topic} /></MenuItem>)}
            </Select></FormControl>
          </Box>
          <TableContainer component={Paper} variant="outlined"><Table aria-label="Findings"><TableHead><TableRow>{([['type', 'Type'], ['topic', 'Topic'], ['author', 'Author'], ['observation', 'Observation'], ['recommendation', 'Recommendation']] as const).map(([field, label]) => <TableCell key={field} sortDirection={findingSort.field === field ? findingSort.direction : false}><TableSortLabel active={findingSort.field === field} direction={findingSort.field === field ? findingSort.direction : 'asc'} onClick={() => setFindingSort((current) => ({ field, direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc' }))}>{label}</TableSortLabel></TableCell>)}</TableRow></TableHead><TableBody>
            {filteredFindings.map((item) => <TableRow key={item.id}><TableCell>{item.type === 'sustainment' ? 'Sustainment' : 'Improvement'}</TableCell><TableCell>{item.topic}</TableCell><TableCell>{findingAuthor(item)}</TableCell><TableCell sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.observation}</TableCell><TableCell sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.recommendation}</TableCell></TableRow>)}
            {filteredFindings.length === 0 && <TableRow><TableCell colSpan={5}>{exercise.findings.length ? 'No findings match your filters.' : 'No findings recorded.'}</TableCell></TableRow>}
          </TableBody></Table></TableContainer>
        </>}
        </Stack></Box>
        </Stack></Box>
        {showChat && <Paper component="section" aria-labelledby="exercise-chat-heading" variant="outlined" sx={{ p: 2, minWidth: 0 }}><Stack spacing={2}>
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
        </Stack></Paper>}
        </Box>
      </>}
      <Dialog open={findingOpen} onClose={() => { if (!saving) setFindingOpen(false) }} fullWidth maxWidth="sm" aria-labelledby="finding-dialog-title">
        <Box component="form" onSubmit={(event) => void saveFinding(event)}>
          <DialogTitle id="finding-dialog-title">Add finding</DialogTitle>
          <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{error && <Alert severity="error">{error}</Alert>}<TextField select label="Type" value={finding.type} onChange={(event) => setFinding({ ...finding, type: event.target.value })}><MenuItem value="sustainment">Sustainment</MenuItem><MenuItem value="improvement">Improvement</MenuItem></TextField><TextField select required label="Topic" value={finding.topic} onChange={(event) => setFinding({ ...finding, topic: event.target.value })}>{findingTopicOptions.map((topic) => <MenuItem key={topic} value={topic}>{topic}</MenuItem>)}</TextField><TextField required multiline label="Observation" value={finding.observation} onChange={(event) => setFinding({ ...finding, observation: event.target.value })} /><TextField required multiline label="Recommendation" value={finding.recommendation} onChange={(event) => setFinding({ ...finding, recommendation: event.target.value })} /></Stack></DialogContent>
          <DialogActions sx={{ justifyContent: 'flex-start' }}><Button disabled={saving || !finding.topic.trim() || !finding.observation.trim() || !finding.recommendation.trim()} type="submit" variant="contained">Save</Button><Button color="inherit" disabled={saving} onClick={() => setFindingOpen(false)}>Cancel</Button></DialogActions>
        </Box>
      </Dialog>
      <Dialog open={facilitatorOpen} onClose={() => setFacilitatorOpen(false)} fullWidth maxWidth="sm" aria-labelledby="facilitator-dialog-title">
        <DialogTitle id="facilitator-dialog-title">Facilitator</DialogTitle>
        <DialogContent>{exercise?.participants.filter((person) => person.id === exercise.facilitator_id).map((person) => <Typography key={person.id}>{person.first_name} {person.last_name}</Typography>)}{!exercise?.participants.some((person) => person.id === exercise.facilitator_id) && <Typography color="text.secondary">No facilitator is assigned.</Typography>}</DialogContent>
        <DialogActions><Button onClick={() => setFacilitatorOpen(false)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog open={selectedRole !== null} onClose={() => setSelectedRole(null)} fullWidth maxWidth="sm" aria-labelledby="role-dialog-title">
        <DialogTitle id="role-dialog-title">{selectedRole ? injectRoleLabels[selectedRole] : ''}</DialogTitle>
        <DialogContent>
          {exercise?.participants.some((person) => person.role === selectedRole) ? <Box component="ul" sx={{ m: 0, pl: 3 }}>{exercise.participants.filter((person) => person.role === selectedRole).map((person) => <li key={person.id}>{person.first_name} {person.last_name}</li>)}</Box> : <Typography color="text.secondary">No participants are assigned to this role.</Typography>}
        </DialogContent>
        <DialogActions><Button onClick={() => setSelectedRole(null)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog open={selectedObjective !== null} onClose={() => setSelectedObjective(null)} fullWidth maxWidth="sm" aria-labelledby="objective-dialog-title">
        <DialogTitle id="objective-dialog-title">{selectedObjective?.title}</DialogTitle>
        <DialogContent><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selectedObjective?.description}</Typography></DialogContent>
        <DialogActions><Button onClick={() => setSelectedObjective(null)}>Close</Button></DialogActions>
      </Dialog>
    </Stack>
}
