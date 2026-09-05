import { ArrowLeft, BookOpen, Loader2, NotebookPen, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import { DEFAULT_PAGE_SIZE, type Inscription, type PaginatedResponse, type PublicFormationDetail } from '../../api/types'
import { useConfirm } from '../../components/ConfirmContext'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/ToastContext'

interface NoteItem {
  id: string
  titre: string
  contenu: string
  lecon: string | null
  lecon_titre: string | null
  formation_titre: string | null
  created_at: string
  updated_at: string
}

interface LeconOption {
  id: string
  titre: string
  moduleTitle: string
}

export function NotesPage() {
  const confirm = useConfirm()
  const { showToast } = useToast()

  const [notes, setNotes] = useState<NoteItem[] | null>(null)
  const [notesCount, setNotesCount] = useState(0)
  const [notesPage, setNotesPage] = useState(1)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Note ouverte dans l'éditeur (undefined = vue liste, null = nouvelle note)
  const [openNote, setOpenNote] = useState<NoteItem | null | undefined>(undefined)
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Rattachement optionnel à une leçon (mêmes sources que le Coach IA)
  const [inscriptions, setInscriptions] = useState<Inscription[]>([])
  const [formationId, setFormationId] = useState('')
  const [lecons, setLecons] = useState<LeconOption[]>([])
  const [leconId, setLeconId] = useState('')

  useEffect(() => {
    apiFetch<PaginatedResponse<Inscription>>('/inscriptions/')
      .then((data) => setInscriptions(data.results))
      .catch(() => setInscriptions([]))
  }, [])

  useEffect(refreshList, [notesPage])

  useEffect(() => {
    if (!formationId) {
      setLecons([])
      return
    }
    apiFetch<PublicFormationDetail>(`/catalogue/formations/${formationId}/`)
      .then((data) => {
        setLecons(
          data.modules.flatMap((module) =>
            module.lecons.map((lecon) => ({ id: lecon.id, titre: lecon.titre, moduleTitle: module.titre })),
          ),
        )
      })
      .catch(() => setLecons([]))
  }, [formationId])

  function refreshList() {
    apiFetch<PaginatedResponse<NoteItem>>(`/notes/?page=${notesPage}`)
      .then((res) => {
        setNotes(res.results)
        setNotesCount(res.count)
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erreur inattendue.'))
  }

  function openEditor(note: NoteItem | null) {
    setOpenNote(note)
    setTitre(note?.titre ?? '')
    setContenu(note?.contenu ?? '')
    setLeconId(note?.lecon ?? '')
    setFormationId('')
    setIsDirty(false)
  }

  async function handleSave(options?: { silent?: boolean }) {
    if (!titre.trim()) {
      // En sauvegarde auto, une note encore sans titre attend simplement
      // le prochain passage — pas d'avertissement en boucle.
      if (!options?.silent) showToast('warning', 'Donnez un titre à votre note avant de l\'enregistrer.')
      return
    }
    setIsSaving(true)
    const body = { titre: titre.trim(), contenu, lecon: leconId || null }
    try {
      if (openNote) {
        await apiFetch<NoteItem>(`/notes/${openNote.id}/`, { method: 'PATCH', body })
      } else {
        const created = await apiFetch<NoteItem>('/notes/', { method: 'POST', body })
        setOpenNote(created)
      }
      setIsDirty(false)
      if (!options?.silent) showToast('success', 'Note enregistrée.')
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : "Impossible d'enregistrer la note.")
    } finally {
      setIsSaving(false)
    }
  }

  // Sauvegarde automatique 2,5 s après la dernière modification : un
  // brouillon survit à une navigation via la sidebar ou un rechargement.
  useEffect(() => {
    if (!isDirty || openNote === undefined || isSaving) return
    const timer = setTimeout(() => handleSave({ silent: true }), 2500)
    return () => clearTimeout(timer)
  }, [isDirty, titre, contenu, leconId, openNote])

  async function handleBack() {
    if (isDirty) {
      const leave = await confirm({
        title: 'Modifications non enregistrées',
        message: 'Cette note contient des modifications non enregistrées. Quitter sans sauvegarder ?',
        confirmLabel: 'Quitter sans sauvegarder',
        cancelLabel: 'Rester',
        danger: true,
      })
      if (!leave) return
    }
    setOpenNote(undefined)
    refreshList()
  }

  async function handleDelete(note: NoteItem) {
    const ok = await confirm({
      title: 'Supprimer cette note',
      message: `La note « ${note.titre} » sera définitivement supprimée. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      await apiFetch(`/notes/${note.id}/`, { method: 'DELETE' })
      showToast('success', `La note « ${note.titre} » a été supprimée.`)
      refreshList()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Impossible de supprimer.')
    }
  }

  if (loadError) {
    return <p className="text-red-600 dark:text-red-400">{loadError}</p>
  }

  if (!notes) {
    return <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
  }

  // ---- Vue éditeur ----
  if (openNote !== undefined) {
    return (
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleBack}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Retour à mes notes"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={() => handleSave()}
            disabled={isSaving || !isDirty}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-700 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Enregistrement...' : isDirty ? 'Enregistrer' : 'Enregistré'}
          </button>
        </div>

        <input
          value={titre}
          onChange={(event) => {
            setTitre(event.target.value)
            setIsDirty(true)
          }}
          placeholder="Titre de la note..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base font-bold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />

        {inscriptions.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={formationId}
              onChange={(event) => {
                setFormationId(event.target.value)
                setLeconId('')
                setIsDirty(true)
              }}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">
                {openNote?.lecon_titre
                  ? `Leçon actuelle : ${openNote.lecon_titre}`
                  : 'Rattacher à une formation (optionnel)...'}
              </option>
              {inscriptions.map((inscription) => (
                <option key={inscription.formation} value={inscription.formation}>
                  {inscription.formation_titre}
                </option>
              ))}
            </select>
            <select
              value={leconId}
              onChange={(event) => {
                setLeconId(event.target.value)
                setIsDirty(true)
              }}
              disabled={lecons.length === 0}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Choisir une leçon...</option>
              {lecons.map((lecon) => (
                <option key={lecon.id} value={lecon.id}>
                  {lecon.moduleTitle} — {lecon.titre}
                </option>
              ))}
            </select>
          </div>
        )}

        <textarea
          value={contenu}
          onChange={(event) => {
            setContenu(event.target.value)
            setIsDirty(true)
          }}
          placeholder="Écrivez votre note ici..."
          className="min-h-72 flex-1 resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        />
      </div>
    )
  }

  // ---- Vue liste ----
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <NotebookPen size={18} className="text-sky-500" />
          Mes notes ({notesCount})
        </h2>
        <button
          onClick={() => openEditor(null)}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-700 active:scale-95"
        >
          <Plus size={16} />
          Nouvelle note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-14 text-center dark:border-slate-800">
          <NotebookPen size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucune note pour l'instant.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Créez une note libre, ou rattachez-la à une leçon pour la retrouver facilement.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/30"
            >
              <button onClick={() => openEditor(note)} className="text-left">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{note.titre}</p>
                </div>
                {note.contenu && (
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {note.contenu}
                  </p>
                )}
              </button>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="min-w-0">
                  {note.lecon_titre ? (
                    <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
                      <BookOpen size={10} className="shrink-0" />
                      <span className="truncate">{note.formation_titre} — {note.lecon_titre}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Modifiée le {new Date(note.updated_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(note)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-500/10"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <Pagination count={notesCount} page={notesPage} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setNotesPage} />
      )}
    </div>
  )
}
