import {
  Users,
  Search,
  Clock,
  Send,
  Building2,
  BookOpen,
  X,
  MessageSquare,
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../components/ToastContext'

interface StudentProgressItem {
  id: string
  name: string
  email: string
  department: string
  courseTitle: string
  progress: number
  status: 'EN_COURS' | 'TERMINEE'
  lastActivity: string
}

const MOCK_STUDENTS: StudentProgressItem[] = []

export function InstructorStudentsPage() {
  const { showToast } = useToast()
  const [students] = useState<StudentProgressItem[]>(MOCK_STUDENTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState<StudentProgressItem | null>(null)
  const [messageText, setMessageText] = useState('')

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!messageText.trim() || !selectedStudentForMessage) return

    showToast('success', `Votre message a été transmis à l'apprenant ${selectedStudentForMessage.name}.`, 'Feedback envoyé !')

    setSelectedStudentForMessage(null)
    setMessageText('')
  }

  const filtered = students.filter((st) => {
    return (
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.department.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  return (
    <div className="space-y-6">
      {/* BANNIÈRE DE SUIVI DES APPRENANTS */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users size={22} className="text-indigo-500" />
            Suivi Individuel des Apprenants
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Consultez le % de progression de chaque élève inscrit à vos cours et envoyez des remarques pédagogiques.
          </p>
        </div>
      </div>

      {/* RECHERCHE ET BARRE DE FILTRE */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom, email, département..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* TABLEAU ERGONOMIQUE DU SUIVI */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Apprenant</th>
                <th className="px-6 py-4">Département</th>
                <th className="px-6 py-4">Formation suivie</th>
                <th className="px-6 py-4">Progression</th>
                <th className="px-6 py-4">Dernière activité</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-semibold text-slate-400">
                    Aucun apprenant trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-xs font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {st.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-slate-100">{st.name}</p>
                          <p className="text-[11px] text-slate-400 font-normal">{st.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Building2 size={12} className="text-slate-400" />
                        {st.department}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={13} className="text-indigo-500 shrink-0" />
                        {st.courseTitle}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="w-36 space-y-1">
                        <div className="flex justify-between text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                          <span>{st.progress}%</span>
                          <span className={st.status === 'TERMINEE' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                            {st.status === 'TERMINEE' ? 'Terminé' : 'En cours'}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              st.progress === 100
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-indigo-500 to-sky-500'
                            }`}
                            style={{ width: `${st.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock size={12} /> {st.lastActivity}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedStudentForMessage(st)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300"
                      >
                        <MessageSquare size={13} />
                        Feedback
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE D'ENVOI DE MESSAGE / FEEDBACK */}
      {selectedStudentForMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-md shadow-indigo-500/20">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Envoyer une recommandation à {selectedStudentForMessage.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Cours : {selectedStudentForMessage.courseTitle}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentForMessage(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Message / Remarque pédagogique
                </label>
                <textarea
                  rows={4}
                  required
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="ex: Bravo pour vos progrès sur le Module 2 ! N'hésitez pas à revoir la leçon sur les hooks..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForMessage(null)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:bg-indigo-700 active:scale-95"
                >
                  <Send size={15} />
                  <span>Envoyer le message</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
