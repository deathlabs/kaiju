import AddIcon from '@mui/icons-material/Add'
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
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

type ReferenceType = 'policy' | 'standard' | 'procedure' | 'guideline'

interface Reference {
  id: string
  exercise_count: number
  type: ReferenceType
  title: string
  url: string
  created_at: string
  updated_at: string
}

interface ReferenceForm {
  type: ReferenceType | ''
  title: string
  url: string
}

const referencesUrl = '/api/v1/references/'
const emptyForm: ReferenceForm = { type: '', title: '', url: '' }
const typeLabels: Record<ReferenceType, string> = {
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

export function ReferencesPage() {
  const [references, setReferences] = useState<Reference[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingReference, setEditingReference] = useState<Reference | null>(
    null,
  )
  const [form, setForm] = useState<ReferenceForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingReference, setDeletingReference] =
    useState<Reference | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadReferences = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setPageError(null)

    try {
      const response = await fetch(referencesUrl, { signal })

      if (!response.ok) throw new Error(await getErrorMessage(response))

      setReferences((await response.json()) as Reference[])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return

      setPageError(
        error instanceof Error ? error.message : 'Could not load references.',
      )
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadReferences(controller.signal)

    return () => controller.abort()
  }, [loadReferences])

  const openCreateForm = () => {
    setEditingReference(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  const openEditForm = (reference: Reference) => {
    setEditingReference(reference)
    setForm({ type: reference.type, title: reference.title, url: reference.url })
    setFormError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    if (!saving) setFormOpen(false)
  }

  const openDeleteConfirmation = () => {
    if (!editingReference) return

    setDeletingReference(editingReference)
    setFormOpen(false)
  }

  const closeDeleteConfirmation = () => {
    if (deleting) return

    setDeletingReference(null)
    setFormOpen(true)
  }

  const saveReference = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)

    try {
      const url = editingReference
        ? `${referencesUrl}${editingReference.id}/`
        : referencesUrl
      const response = await fetch(url, {
        method: editingReference ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          url: form.url.trim(),
        }),
      })

      if (!response.ok) throw new Error(await getErrorMessage(response))

      const savedReference = (await response.json()) as Reference
      setReferences((currentReferences) =>
        editingReference
          ? currentReferences.map((reference) =>
              reference.id === savedReference.id ? savedReference : reference,
            )
          : [...currentReferences, savedReference],
      )
      setFormOpen(false)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not save the reference.',
      )
    } finally {
      setSaving(false)
    }
  }

  const deleteReference = async () => {
    if (!deletingReference) return

    setDeleting(true)
    setPageError(null)

    try {
      const response = await fetch(
        `${referencesUrl}${deletingReference.id}/`,
        { method: 'DELETE' },
      )

      if (!response.ok) throw new Error(await getErrorMessage(response))

      setReferences((currentReferences) =>
        currentReferences.filter(
          (reference) => reference.id !== deletingReference.id,
        ),
      )
      setDeletingReference(null)
      setEditingReference(null)
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : 'Could not delete the reference.',
      )
      setDeletingReference(null)
      setFormOpen(true)
    } finally {
      setDeleting(false)
    }
  }

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase()
  const filteredReferences = references.filter((reference) =>
    [typeLabels[reference.type], reference.title, reference.url]
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
          placeholder="Search by title, type, URL, etc."
          size="small"
          slotProps={{
            htmlInput: { 'aria-label': 'Search references' },
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
          Add reference
        </Button>
      </Box>

      {pageError && (
        <Alert
          action={
            <Button color="inherit" onClick={() => void loadReferences()}>
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
          <CircularProgress aria-label="Loading references" />
        </Box>
      ) : references.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">
          <Typography component="h2" gutterBottom variant="h6">
            No references
          </Typography>
          <Typography color="text.secondary">
            Add a reference to make it available for an exercise.
          </Typography>
        </Paper>
      ) : filteredReferences.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">
          <Typography component="h2" gutterBottom variant="h6">
            No references match your search
          </Typography>
          <Button color="inherit" onClick={() => setSearchQuery('')}>
            Clear search
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredReferences.map((reference) => (
            <Grid key={reference.id} size={{ xs: 12, md: 6, xl: 4 }}>
              <Card
                sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                variant="outlined"
              >
                <CardActionArea
                  aria-label={`Open ${reference.title}`}
                  onClick={() => openEditForm(reference)}
                  sx={{ alignItems: 'stretch', display: 'flex', flexGrow: 1 }}
                >
                  <CardContent
                    sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}
                  >
                    <Typography component="h2" variant="h6">
                      {reference.title}
                    </Typography>
                    <Box
                      sx={{
                        alignItems: 'center',
                        display: 'flex',
                        gap: 1,
                        mt: 'auto',
                        pt: 2,
                      }}
                    >
                      <Chip label={typeLabels[reference.type]} size="small" />
                      <Typography color="text.secondary">
                        Related to {reference.exercise_count}{' '}
                        {reference.exercise_count === 1
                          ? 'exercise'
                          : 'exercises'}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog fullWidth maxWidth="sm" onClose={closeForm} open={formOpen}>
        <Box component="form" onSubmit={saveReference}>
          <DialogTitle>
            {editingReference ? 'Edit reference' : 'Add reference'}
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
            <FormControl fullWidth margin="dense" required>
              <InputLabel id="reference-type-label">Type</InputLabel>
              <Select
                label="Type"
                labelId="reference-type-label"
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    type: event.target.value as ReferenceType,
                  }))
                }
                value={form.type}
              >
                {(Object.keys(typeLabels) as ReferenceType[]).map((type) => (
                  <MenuItem key={type} value={type}>
                    {typeLabels[type]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="URL"
              margin="dense"
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  url: event.target.value,
                }))
              }
              required
              type="url"
              value={form.url}
            />
          </DialogContent>
          <DialogActions
            sx={{
              justifyContent: editingReference ? 'space-between' : 'flex-start',
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
            {editingReference && (
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
        onClose={closeDeleteConfirmation}
        open={Boolean(deletingReference)}
      >
        <DialogTitle>Delete reference?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete “{deletingReference?.title}”? You cannot undo this action.
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
            onClick={() => void deleteReference()}
            variant="contained"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
