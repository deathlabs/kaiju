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

interface Objective {
  id: string
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
const emptyForm: ObjectiveForm = { title: '', description: '' }

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

export function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([])
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
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : 'Could not delete the objective.',
      )
      setDeletingObjective(null)
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
          Manage the reusable goals that exercises evaluate.
        </Typography>
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
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="Objectives">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {objectives.map((objective) => (
                <TableRow key={objective.id}>
                  <TableCell>{objective.title}</TableCell>
                  <TableCell>{objective.description}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton
                      aria-label={`Edit ${objective.title}`}
                      onClick={() => openEditForm(objective)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      aria-label={`Delete ${objective.title}`}
                      color="error"
                      onClick={() => setDeletingObjective(objective)}
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
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'flex-start' }}>
            <Button disabled={saving} type="submit" variant="contained">
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              color="inherit"
              disabled={saving}
              onClick={closeForm}
            >
              Cancel
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        onClose={() => !deleting && setDeletingObjective(null)}
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
            onClick={() => setDeletingObjective(null)}
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
