import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

/** Lien de retour vers la liste des outils — présent en haut de chaque
 * outil (jamais dans une vue « éditeur » imbriquée, qui a déjà son propre
 * retour vers la liste de l'outil lui-même). */
export function BackToToolsLink() {
  return (
    <Link
      to="/apprenant/outils"
      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
    >
      <ArrowLeft size={14} />
      Retour aux outils
    </Link>
  )
}
