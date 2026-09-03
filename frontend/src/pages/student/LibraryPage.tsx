import {
  Library,
  Search,
  BookOpen,
  FileText,
  Download,
  Eye,
  Filter,
  Tag,
  Clock,
  X,
  CheckCircle2,
  Bookmark,
  Plus,
  UploadCloud,
  Sparkles,
  FileCheck,
  User,
  ShieldCheck,
  Check,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'

interface DocumentItem {
  id: string
  title: string
  category: string
  format: 'PDF' | 'EPUB' | 'FICHE' | 'GUIDE'
  pages: number
  readTime: string
  fileSize: string
  description: string
  contentPreview: string
  author: string
  rating: number
  coverTheme: 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'dark'
  createdAt: string
  uploadedByRole?: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
  status: 'SOUMISE' | 'PUBLIEE' | 'REFUSEE'
}

const CATEGORIES = [
  'Toutes les catégories',
  'Intelligence Artificielle',
  'Développement Web',
  'Data Science',
  'Cybersécurité',
  'UX/UI Design',
  'Management & Agilité',
]

const COVER_GRADIENTS: Record<DocumentItem['coverTheme'], string> = {
  sky: 'from-sky-600 via-sky-700 to-slate-900 text-white',
  indigo: 'from-indigo-600 via-indigo-800 to-slate-950 text-white',
  emerald: 'from-emerald-600 via-teal-800 to-slate-900 text-white',
  amber: 'from-amber-500 via-orange-600 to-slate-900 text-white',
  rose: 'from-rose-600 via-rose-800 to-slate-950 text-white',
  dark: 'from-slate-800 via-slate-900 to-black text-slate-100',
}

export function LibraryPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const isInstructor = user?.role === 'INSTRUCTOR'
  const canUpload = isAdmin || isInstructor

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem('ai_learning_library_docs')
    if (saved) {
      try {
        const parsed: DocumentItem[] = JSON.parse(saved)
        const cleaned = parsed.filter((d) => !['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-5'].includes(d.id))
        localStorage.setItem('ai_learning_library_docs', JSON.stringify(cleaned))
        return cleaned
      } catch {
        return []
      }
    }
    return []
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Toutes les catégories')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SOUMISE' | 'PUBLIEE'>('ALL')
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [bookmarkedDocs, setBookmarkedDocs] = useState<string[]>([])
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null)

  // ÉTAT DU FORMULAIRE D'UPLOAD / DE DÉPÔT DE DOCUMENT
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Intelligence Artificielle')
  const [newFormat, setNewFormat] = useState<'PDF' | 'EPUB' | 'FICHE' | 'GUIDE'>('PDF')
  const [newCoverTheme, setNewCoverTheme] = useState<DocumentItem['coverTheme']>('sky')
  const [newDescription, setNewDescription] = useState('')
  const [newPreview, setNewPreview] = useState('')
  const [newPages, setNewPages] = useState(24)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null)

  // Persistance dans localStorage
  useEffect(() => {
    localStorage.setItem('ai_learning_library_docs', JSON.stringify(documents))
  }, [documents])

  // Filtrage dynamique des documents selon les droits du rôle connecté
  const visibleDocs = documents.filter((doc) => {
    // Les élèves ne voient QUE les documents publiés
    if (!isAdmin && !isInstructor && doc.status !== 'PUBLIEE') return false

    // Les formateurs voient les publiés + leurs propres soumis
    if (isInstructor && doc.status !== 'PUBLIEE' && doc.author !== (user?.email || 'Formateur')) {
      // Autoriser la consultation globale
    }

    if (statusFilter === 'SOUMISE' && doc.status !== 'SOUMISE') return false
    if (statusFilter === 'PUBLIEE' && doc.status !== 'PUBLIEE') return false

    const matchesCategory = selectedCategory === 'Toutes les catégories' || doc.category === selectedCategory
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.author.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const pendingCount = documents.filter((d) => d.status === 'SOUMISE').length

  function toggleBookmark(docId: string) {
    setBookmarkedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    )
  }

  function handleDownload(doc: DocumentItem) {
    setDownloadSuccess(`Le document "${doc.title}" a été téléchargé avec succès.`)
    setTimeout(() => setDownloadSuccess(null), 3500)
  }

  function handleValidateDocument(docId: string) {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: 'PUBLIEE' as const } : d))
    )
    setUploadSuccessMsg('Document vérifié et publié avec succès dans la bibliothèque.')
    setTimeout(() => setUploadSuccessMsg(null), 4000)
  }

  function handleRefuseDocument(docId: string) {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: 'REFUSEE' as const } : d))
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (!newTitle) {
        setNewTitle(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  function handleAddDocument(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    const authorName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email : 'Formateur AI Learning'

    // Si l'utilisateur est ADMIN, la publication est directe. Si FORMATEUR, il est SOUMISE pour validation admin !
    const initialStatus: DocumentItem['status'] = isAdmin ? 'PUBLIEE' : 'SOUMISE'

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      format: newFormat,
      pages: Number(newPages) || 15,
      readTime: `${Math.max(5, Math.round(Number(newPages) * 0.7))} min`,
      fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '3.2 MB',
      description: newDescription || 'Document pédagogique partagé par l’équipe d’enseignement.',
      contentPreview: newPreview || `Document officiel : ${newTitle}\n\nAuteur : ${authorName}\nCatégorie : ${newCategory}\n\nConsultez le fichier complet téléchargé pour accéder à l’intégralité des modules et exercices.`,
      author: authorName,
      rating: 5.0,
      coverTheme: newCoverTheme,
      createdAt: new Date().toISOString().split('T')[0],
      uploadedByRole: (user?.role as 'ADMIN' | 'INSTRUCTOR') || 'INSTRUCTOR',
      status: initialStatus,
    }

    setDocuments([newDoc, ...documents])
    setIsUploadOpen(false)

    if (isAdmin) {
      setUploadSuccessMsg(`Le document "${newTitle}" a été publié directement dans la bibliothèque.`)
    } else {
      setUploadSuccessMsg(`Le document "${newTitle}" a été soumis pour vérification à l'administrateur. Il apparaîtra dans la bibliothèque après validation.`)
    }

    // Réinitialisation form
    setNewTitle('')
    setNewDescription('')
    setNewPreview('')
    setSelectedFile(null)

    setTimeout(() => setUploadSuccessMsg(null), 5000)
  }

  return (
    <div className="space-y-8">
      {/* BANNIÈRE DE LA BIBLIOTHÈQUE NUMÉRIQUE */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/50 bg-gradient-to-br from-slate-900 via-sky-900 to-indigo-900 p-6 text-white shadow-xl shadow-sky-500/10 sm:p-8 dark:border-sky-500/20">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-100 backdrop-blur-md">
              <Library size={14} className="text-sky-300" />
              <span>Bibliothèque Numérique D'Apprentissage</span>
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Ressources & Documents à lire
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-sky-100/90 sm:text-sm">
              Accédez à une sélection de manuels, guides pratiques et fiches de synthèse avec page de garde interactive, vérifiés et validés par la direction pédagogique.
            </p>
          </div>

          {canUpload && (
            <div className="shrink-0">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-sky-500/30 transition-all hover:from-sky-500 hover:to-sky-600 active:scale-95"
              >
                <Plus size={16} />
                <span>Uploader un document</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RAPPEL SUR LES DOCUMENTS EN ATTENTE DE VALIDATION POUR L'ADMIN */}
      {isAdmin && pendingCount > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-900 shadow-md dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} className="text-amber-500 shrink-0" />
            <span>Vous avez {pendingCount} document(s) soumis par les formateurs en attente de vérification.</span>
          </div>
          <button
            onClick={() => setStatusFilter(statusFilter === 'SOUMISE' ? 'ALL' : 'SOUMISE')}
            className="shrink-0 rounded-2xl bg-amber-600 px-4 py-2 text-xs text-white hover:bg-amber-700 shadow-sm"
          >
            {statusFilter === 'SOUMISE' ? 'Voir tous' : `Examiner (${pendingCount}) →`}
          </button>
        </div>
      )}

      {/* ALERTE SUCCÈS PUBLICATION / MODÉRATION */}
      {uploadSuccessMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 shadow-md dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-200">
          <FileCheck size={20} className="text-emerald-500 shrink-0" />
          <span>{uploadSuccessMsg}</span>
        </div>
      )}

      {/* ALERTE TÉLÉCHARGEMENT SUCCÈS */}
      {downloadSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* RECHERCHE ET FILTRES PAR CATÉGORIE */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un document, auteur, mot-clé..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Filter size={16} className="text-slate-400 shrink-0 hidden sm:block" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-2xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${selectedCategory === cat
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLE DE DOCUMENTS AVEC APERÇU PAGE DE GARDE */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen size={18} className="text-sky-500" />
            Documents répertoriés ({visibleDocs.length})
          </h2>
        </div>

        {visibleDocs.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">Aucun document disponible</h3>
            <p className="mt-1 text-xs text-slate-400">Aucun document ne correspond à vos critères de recherche.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDocs.map((doc) => {
              const isBookmarked = bookmarkedDocs.includes(doc.id)

              return (
                <div
                  key={doc.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-500/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-sky-500/30"
                >
                  {/* APERÇU PAGE DE GARDE DÉDIÉE */}
                  <div
                    onClick={() => setSelectedDoc(doc)}
                    className={`relative cursor-pointer overflow-hidden bg-gradient-to-br ${COVER_GRADIENTS[doc.coverTheme]
                      } p-5 transition-transform group-hover:scale-[1.02] border-b border-white/10`}
                  >
                    {/* Tranche 3D */}
                    <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/20 border-r border-white/20 shadow-inner" />

                    <div className="pl-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase text-white backdrop-blur-md">
                          {doc.format} • {doc.pages} Pages
                        </span>
                        <span className="text-[10px] font-bold text-sky-200 opacity-90">
                          {doc.category}
                        </span>
                      </div>

                      {/* TITRE ET AUTEUR DE LA PAGE DE GARDE */}
                      <div className="my-5 min-h-[4.5rem]">
                        <p className="text-[9px] font-black uppercase tracking-widest text-sky-200/80">
                          Ouvrage Pédagogique
                        </p>
                        <h4 className="text-sm font-black leading-snug tracking-tight text-white line-clamp-2 mt-0.5">
                          {doc.title}
                        </h4>
                      </div>

                      {/* PIED DE GARDE */}
                      <div className="flex items-center justify-between border-t border-white/15 pt-2.5 text-[10px] font-semibold text-white/90">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-sky-300" />
                          {doc.author}
                        </span>
                        <span className="rounded bg-black/30 px-1.5 py-0.5 text-[9px] font-bold">
                          AI LEARNING
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CORPS DE CARTE & STATUTS */}
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                          <Tag size={12} />
                          {doc.category}
                        </span>

                        {doc.status === 'SOUMISE' && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900">
                            ⏳ En vérification
                          </span>
                        )}

                        {doc.status === 'PUBLIEE' && (
                          <button
                            onClick={() => toggleBookmark(doc.id)}
                            className={`rounded-xl p-1.5 transition-colors ${isBookmarked
                                ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10'
                                : 'text-slate-300 hover:text-amber-500 dark:text-slate-600'
                              }`}
                          >
                            <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
                          </button>
                        )}
                      </div>

                      <p className="text-xs leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400">
                        {doc.description}
                      </p>
                    </div>

                    {/* METADATA & ACTIONS DE MODÉRATION / LECTURE */}
                    <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {doc.readTime}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-bold">
                          {doc.fileSize}
                        </span>
                      </div>

                      {isAdmin && doc.status === 'SOUMISE' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleValidateDocument(doc.id)}
                            className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95"
                          >
                            <Check size={14} />
                            Valider & Publier
                          </button>
                          <button
                            onClick={() => handleRefuseDocument(doc.id)}
                            className="flex items-center justify-center gap-1.5 rounded-2xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 active:scale-95"
                          >
                            <XCircle size={14} />
                            Refuser
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedDoc(doc)}
                            className="flex items-center justify-center gap-1.5 rounded-2xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-sky-700 active:scale-95"
                          >
                            <Eye size={14} />
                            Aperçu / Lire
                          </button>

                          <button
                            onClick={() => handleDownload(doc)}
                            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 active:scale-95 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                          >
                            <Download size={14} />
                            Télécharger
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODALE D'UPLOAD PAR L'ENSEIGNANT OU L'ADMIN */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* EN-TÊTE MODALE */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Ajouter / Uploader un document
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {isAdmin ? 'Publication immédiate' : 'Soumission obligatoire pour vérification Admin'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsUploadOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORMULAIRE */}
            <form onSubmit={handleAddDocument} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Fichier du document (PDF, EPUB) *
                </label>
                <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-5 text-center hover:bg-sky-50 transition-colors dark:border-sky-800/80 dark:bg-sky-950/20">
                  <UploadCloud size={28} className="text-sky-500 mb-1" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedFile ? selectedFile.name : 'Glissez votre fichier ici ou cliquez pour parcourir'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Formats acceptés : PDF, EPUB jusqu'à 50 Mo</p>
                  <input
                    type="file"
                    accept=".pdf,.epub,.doc,.docx"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Titre du document *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ex: Guide des meilleures pratiques de SecOps..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {CATEGORIES.filter((c) => c !== 'Toutes les catégories').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Format
                  </label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as any)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="PDF">PDF</option>
                    <option value="EPUB">EPUB</option>
                    <option value="FICHE">FICHE SYNTHÈSE</option>
                    <option value="GUIDE">GUIDE PRATIQUE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thème visuel de la Page de Garde
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {(['sky', 'indigo', 'emerald', 'amber', 'rose', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewCoverTheme(t)}
                      className={`h-9 rounded-xl border-2 transition-all ${newCoverTheme === t ? 'border-sky-500 scale-105 shadow-md' : 'border-transparent'
                        } bg-gradient-to-br ${COVER_GRADIENTS[t]}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de pages
                </label>
                <input
                  type="number"
                  min={1}
                  value={newPages}
                  onChange={(e) => setNewPages(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description succincte
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Résumé rapide pour les apprenants..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-700 active:scale-95"
                >
                  <Plus size={16} />
                  <span>{isAdmin ? 'Publier le document' : 'Soumettre pour validation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DE LECTURE DU DOCUMENT */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
                  <BookOpen size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    {selectedDoc.category} • {selectedDoc.format}
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {selectedDoc.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedDoc(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div
                className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${COVER_GRADIENTS[selectedDoc.coverTheme]
                  } p-6 shadow-lg border border-white/10`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-white/90">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                    <Sparkles size={12} />
                    {selectedDoc.format} Officiel
                  </span>
                  <span>{selectedDoc.pages} Pages • {selectedDoc.fileSize}</span>
                </div>

                <div className="my-6 max-w-lg">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-200">
                    Édition AI Learning
                  </span>
                  <h2 className="text-xl font-black text-white sm:text-2xl mt-1 leading-tight">
                    {selectedDoc.title}
                  </h2>
                  <p className="text-xs text-white/80 mt-2 font-medium">
                    Par {selectedDoc.author}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-sky-50/70 p-4 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/40">
                <h4 className="text-xs font-bold text-sky-900 dark:text-sky-300">À propos de cet ouvrage :</h4>
                <p className="mt-1 text-xs text-sky-800/90 dark:text-sky-400 leading-relaxed">
                  {selectedDoc.description}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Extrait du contenu :</h4>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 font-mono text-xs leading-relaxed text-slate-700 whitespace-pre-line dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  {selectedDoc.contentPreview}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
              <span className="text-xs font-semibold text-slate-500">Auteur : {selectedDoc.author}</span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    handleDownload(selectedDoc)
                    setSelectedDoc(null)
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-sky-700 active:scale-95"
                >
                  <Download size={15} />
                  Télécharger le document complet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
