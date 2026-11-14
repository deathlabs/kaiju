import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

interface Reference {
  id: string
  title: string
  url: string
  created_at: string
  updated_at: string
}

interface ReferenceForm {
  title: string
  url: string
}

const referencesUrl = '/api/v1/references/'
const emptyForm: ReferenceForm = { title: '', url: '' }

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
    setForm({ title: reference.title, url: reference.url })
    setFormError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    if (!saving) setFormOpen(false)
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
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : 'Could not delete the reference.',
      )
      setDeletingReference(null)
    } finally {
      setDeleting(false)
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
          Manage the plans, policies, and resources used in exercises.
        </Typography>
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
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="References">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>URL</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {references.map((reference) => (
                <TableRow key={reference.id}>
                  <TableCell>{reference.title}</TableCell>
                  <TableCell>
                    <Link
                      href={reference.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {reference.url}
                    </Link>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton
                      aria-label={`Edit ${reference.title}`}
                      onClick={() => openEditForm(reference)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      aria-label={`Delete ${reference.title}`}
                      color="error"
                      onClick={() => setDeletingReference(reference)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
          <DialogActions sx={{ justifyContent: 'flex-start' }}>
            <Button disabled={saving} type="submit" variant="contained">
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              color="inherit"
              disabled={saving}
              onClick={closeForm}
              variant="outlined"
            >
              Cancel
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        onClose={() => !deleting && setDeletingReference(null)}
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
            disabled={deleting}
            onClick={() => setDeletingReference(null)}
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
