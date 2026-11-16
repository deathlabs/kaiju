import { injectRoleLabels, type InjectRole } from './injectRoles'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Divider, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'

interface Participant { id: string; first_name: string; last_name: string; email: string | null; role: string }
interface Reply { id: string; created_at: string; type: 'response' | 'question'; text: string; participant: Participant }
interface Inject { id: string; number: string; sender: InjectRole; recipient: InjectRole; message: string; started_at: string | null; responses: Reply[] }
interface Event { id: string; number: number; description: string; injects: Inject[] }
interface Finding { id: string; type: string; topic: string; observation: string; recommendation: string }
interface Exercise { title: string; scenario: string; participants: Participant[]; events: Event[]; findings: Finding[] }
interface CurrentUser { email: string }

export function ExerciseRun({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)
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
  const participant = user?.email && exercise?.participants.find((item) => item.email?.toLowerCase() === user.email.toLowerCase())
  const facilitator = participant && participant.role === 'facilitator'
  const injects = exercise?.events.flatMap((event) => event.injects.map((inject) => ({ event, inject }))) ?? []
  const sent = injects.filter(({ inject }) => inject.started_at).sort((a, b) => a.inject.started_at!.localeCompare(b.inject.started_at!))
  const pending = injects.filter(({ inject }) => !inject.started_at)
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
  return <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5">{exercise?.title}</Typography>
        <Button onClick={onClose}>Back to exercises</Button>
      </Stack>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => void load()}>Retry</Button>}>{error}</Alert>}
      {loading && <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress /></Box>}
      {exercise && <>
        <Paper variant="outlined" sx={{ p: 2 }}><Typography variant="h6">Scenario</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{exercise.scenario}</Typography></Paper>
        {facilitator && <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
          <Typography variant="h6">Send an inject</Typography>
          {pending.length === 0 && <Typography color="text.secondary">No injects are waiting to be sent.</Typography>}
          {pending.map(({ event, inject }) => <Stack key={inject.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}><Box sx={{ flex: 1 }}><Typography>Event {event.number} · Inject {inject.number}</Typography><Typography color="text.secondary">{inject.message}</Typography></Box><Button disabled={saving} variant="contained" onClick={() => void post(`${url}events/${event.id}/injects/${inject.id}/send/`)}>Send card</Button></Stack>)}
        </Stack></Paper>}
        <Typography variant="h6">Exercise feed</Typography>
        {sent.length === 0 && <Alert severity="info">No inject cards have been sent yet.</Alert>}
        {sent.map(({ event, inject }) => <Paper key={inject.id} variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><Chip color="primary" size="small" label="Inject" /><Typography variant="subtitle1">Event {event.number} · Inject {inject.number}</Typography><Typography color="text.secondary" variant="caption">{new Date(inject.started_at!).toLocaleString()}</Typography></Stack>
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
      </>}
    </Stack>
}
