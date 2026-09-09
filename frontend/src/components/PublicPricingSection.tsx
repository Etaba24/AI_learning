import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Sparkles, Crown, Building2, User, ArrowRight, HelpCircle, Zap } from 'lucide-react'
import { apiFetch } from '../api/client'
import type { PaginatedResponse, PlanAbonnement } from '../api/types'

export function PublicPricingSection() {
  const [activeTab, setActiveTab] = useState<'INDIVIDUEL' | 'ETABLISSEMENT'>('INDIVIDUEL')
  const [dbPlans, setDbPlans] = useState<PlanAbonnement[]>([])

  useEffect(() => {
    apiFetch<PaginatedResponse<PlanAbonnement>>('/plans/publics/')
      .then((res) => {
        setDbPlans(res.results || [])
      })
      .catch(() => setDbPlans([]))
  }, [])

  const dbIndividuels = dbPlans.filter((p) => p.type === 'INDIVIDUEL')
  const dbEtablissements = dbPlans.filter((p) => p.type === 'ETABLISSEMENT')

  return (
    <section id="abonnements" className="relative overflow-hidden bg-slate-50/70 py-24 dark:bg-slate-950">
      {/* Arrière-plan décoratif léger */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-sky-200/40 to-amber-200/40 blur-3xl dark:from-sky-950/20 dark:to-amber-950/20" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* En-tête de section */}
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <span className="inline-block rounded-full bg-sky-100 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
            ✦ Tarifs & Formules
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
            Des forfaits simples et transparents
          </h2>
          <p className="text-base text-slate-600 sm:text-lg dark:text-slate-400">
            Débloquez la puissance de l'apprentissage guidé par l'IA. Choisissez l'offre adaptée à vos ambitions personnelles ou à votre établissement.
          </p>

          {/* SÉLECTEUR DE TYPE (TOGGLE PILL SWITCHER STYLE CHATGPT) */}
          <div className="pt-6 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-200/60 p-1.5 shadow-inner dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setActiveTab('INDIVIDUEL')}
                className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-200 ${
                  activeTab === 'INDIVIDUEL'
                    ? 'bg-white text-slate-900 shadow-md dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <User size={16} className={activeTab === 'INDIVIDUEL' ? 'text-sky-500' : ''} />
                <span>Apprenant</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ETABLISSEMENT')}
                className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-200 ${
                  activeTab === 'ETABLISSEMENT'
                    ? 'bg-white text-slate-900 shadow-md dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Building2 size={16} className={activeTab === 'ETABLISSEMENT' ? 'text-sky-500' : ''} />
                <span>Établissement</span>
              </button>
            </div>
          </div>
        </div>

        {/* GRILLE DE CARTE DE TARIF (STYLE CHATGPT PRICING) */}
        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {activeTab === 'INDIVIDUEL' ? (
            <>
              {/* Carte 1: Gratuit */}
              <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Gratuit</h3>
                  </div>

                  <h4 className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-200">Découvrir AI Learning</h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Explorez la plateforme et accédez aux formations et outils de base.
                  </p>

                  <div className="mt-6 flex items-baseline">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">0 FCFA</span>
                    <span className="ml-2 text-xs font-semibold text-slate-400">/ mois</span>
                  </div>

                  <Link
                    to="/register"
                    className="mt-6 block w-full rounded-full border border-slate-300 bg-slate-50 py-3 text-center text-sm font-bold text-slate-800 transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Commencer gratuitement
                  </Link>

                  <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Ce qui est inclus :</p>
                    <ul className="mt-4 space-y-3">
                      <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                        <span>Accès au catalogue des formations gratuites</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                        <span>Tuteur IA pédagogique disponible sur chaque leçon</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                        <span>Suivi de votre progression en temps réel</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Plans issus de la base ou fallback */}
              {dbIndividuels.length > 0 ? (
                dbIndividuels.map((plan, idx) => {
                  const isFeatured = idx === 0 || plan.nom.toLowerCase().includes('pro') || plan.nom.toLowerCase().includes('plus')
                  return (
                    <div
                      key={plan.id}
                      className={`flex flex-col justify-between rounded-3xl p-7 transition-all ${
                        isFeatured
                          ? 'relative border-2 border-sky-500 bg-white shadow-xl shadow-sky-500/10 ring-4 ring-sky-500/10 dark:bg-slate-900 dark:ring-sky-500/20'
                          : 'border border-slate-200/80 bg-white shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Crown size={18} className="text-amber-500" />
                            {plan.nom}
                          </h3>
                          {isFeatured && (
                            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-600 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
                              ✦ RECOMMANDÉ
                            </span>
                          )}
                        </div>

                        <h4 className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-200">Formule Apprenant</h4>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {plan.description || "Débloquez tout le potentiel de la plateforme avec un accès complet."}
                        </p>

                        <div className="mt-6 flex items-baseline">
                          <span className="text-4xl font-black text-slate-900 dark:text-white">
                            {Number(plan.prix_mensuel).toLocaleString('fr-FR')} FCFA
                          </span>
                          <span className="ml-2 text-xs font-semibold text-slate-400">/ mois</span>
                        </div>

                        <Link
                          to="/register"
                          className={`mt-6 flex items-center justify-center gap-2 w-full rounded-full py-3 text-center text-sm font-bold transition-all ${
                            isFeatured
                              ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-md shadow-sky-500/30'
                              : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500'
                          }`}
                        >
                          <span>S'abonner à {plan.nom}</span>
                          <ArrowRight size={16} />
                        </Link>

                        <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Tout ce qui est dans Gratuit, plus :</p>
                          <ul className="mt-4 space-y-3">
                            {plan.avantages && plan.avantages.length > 0 ? (
                              plan.avantages.map((av) => (
                                <li key={av} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                  <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                                  <span>{av}</span>
                                </li>
                              ))
                            ) : (
                              <>
                                <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                  <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                                  <span>Accès à toutes les formations premium</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                  <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                                  <span>Tuteur IA contextualisé sans limite</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                  <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                                  <span>Tous les outils interactifs (IDE, Tableur, Notes, 3D)</span>
                                </li>
                              </>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                /* Fallback Plan Apprenant Pro si aucun plan en base */
                <div className="relative flex flex-col justify-between rounded-3xl border-2 border-sky-500 bg-white p-7 shadow-xl shadow-sky-500/10 ring-4 ring-sky-500/10 dark:bg-slate-900 dark:ring-sky-500/20">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Crown size={18} className="text-amber-500" />
                        Apprenant Premium
                      </h3>
                      <span className="rounded-full bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-600 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
                        ✦ RECOMMANDÉ
                      </span>
                    </div>

                    <h4 className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-200">Accès Total & IA Avancée</h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      Profitez d'un accès illimité à l'intégralité du contenu, des outils et du tuteur IA.
                    </p>

                    <div className="mt-6 flex items-baseline">
                      <span className="text-4xl font-black text-slate-900 dark:text-white">5 000 FCFA</span>
                      <span className="ml-2 text-xs font-semibold text-slate-400">/ mois</span>
                    </div>

                    <Link
                      to="/register"
                      className="mt-6 flex items-center justify-center gap-2 w-full rounded-full bg-sky-500 py-3 text-center text-sm font-bold text-white shadow-md shadow-sky-500/30 transition-all hover:bg-sky-600"
                    >
                      <span>✦ Obtenir le Pass Premium</span>
                      <ArrowRight size={16} />
                    </Link>

                    <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Tout ce qui est dans Gratuit, plus :</p>
                      <ul className="mt-4 space-y-3">
                        <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                          <Sparkles size={16} className="mt-0.5 shrink-0 text-sky-500" />
                          <span>Formations premium & cours interactifs illimités</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                          <Zap size={16} className="mt-0.5 shrink-0 text-sky-500" />
                          <span>Tuteur IA contextualisé haute précision sans limite</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                          <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                          <span>Accès complet aux outils (IDE, Tableur, Notes, Tableau Blanc, 3D)</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                          <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                          <span>Exercices pratiques & quiz corrigés automatiquement</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* TAB ÉTABLISSEMENT */
            <>
              {dbEtablissements.length > 0 ? (
                dbEtablissements.map((plan, idx) => {
                  const isFeatured = idx === 0 || plan.nom.toLowerCase().includes('pro') || plan.nom.toLowerCase().includes('campus')
                  return (
                    <div
                      key={plan.id}
                      className={`flex flex-col justify-between rounded-3xl p-7 transition-all ${
                        isFeatured
                          ? 'relative border-2 border-sky-500 bg-white shadow-xl shadow-sky-500/10 ring-4 ring-sky-500/10 dark:bg-slate-900 dark:ring-sky-500/20'
                          : 'border border-slate-200/80 bg-white shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 size={18} className="text-sky-500" />
                            {plan.nom}
                          </h3>
                          {isFeatured && (
                            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-600 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
                              ✦ OFFRE POPULAIRE
                            </span>
                          )}
                        </div>

                        <h4 className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-200">Pour Organisations & Écoles</h4>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {plan.description || "Equipez votre établissement avec des comptes centralisés et une administration simplifiée."}
                        </p>

                        <div className="mt-6 flex items-baseline">
                          <span className="text-4xl font-black text-slate-900 dark:text-white">
                            {Number(plan.prix_mensuel).toLocaleString('fr-FR')} FCFA
                          </span>
                          <span className="ml-2 text-xs font-semibold text-slate-400">/ mois</span>
                        </div>

                        <a
                          href="#contact"
                          className={`mt-6 flex items-center justify-center gap-2 w-full rounded-full py-3 text-center text-sm font-bold transition-all ${
                            isFeatured
                              ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-md shadow-sky-500/30'
                              : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500'
                          }`}
                        >
                          <span>Souscrire pour mon établissement</span>
                          <ArrowRight size={16} />
                        </a>

                        <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Inclus dans la formule :</p>
                          <ul className="mt-4 space-y-3">
                            {plan.max_membres && (
                              <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-bold text-sky-600 dark:text-sky-400">
                                <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                                <span>Jusqu'à {plan.max_membres} comptes apprenants rattachés</span>
                              </li>
                            )}
                            {plan.avantages && plan.avantages.length > 0 ? (
                              plan.avantages.map((av) => (
                                <li key={av} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                  <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                                  <span>{av}</span>
                                </li>
                              ))
                            ) : (
                              <>
                                <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                  <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                                  <span>Code d'invitation établissement unique</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                  <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                                  <span>Gestion centralisée des étudiants & rapports</span>
                                </li>
                              </>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                /* Fallback Formules Établissement si non créées en base */
                <>
                  <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building2 size={18} className="text-sky-500" />
                          Pack École & Lycée
                        </h3>
                      </div>

                      <h4 className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-200">Pour 50 Étudiants</h4>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        Solution idéale pour les lycées, instituts et petits centres de formation.
                      </p>

                      <div className="mt-6 flex items-baseline">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">45 000 FCFA</span>
                        <span className="ml-2 text-xs font-semibold text-slate-400">/ mois</span>
                      </div>

                      <a
                        href="#contact"
                        className="mt-6 block w-full rounded-full bg-slate-900 py-3 text-center text-sm font-bold text-white transition-all hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
                      >
                        Demander une convention
                      </a>

                      <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Ce qui est inclus :</p>
                        <ul className="mt-4 space-y-3">
                          <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                            <span>Jusqu'à 50 comptes apprenants rattachés</span>
                          </li>
                          <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                            <span>Code d'invitation personnalisé pour votre école</span>
                          </li>
                          <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                            <span>Accès complet à tous les cours et outils IA</span>
                          </li>
                          <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                            <span>Facturation groupée et attestation administrative</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex flex-col justify-between rounded-3xl border-2 border-sky-500 bg-white p-7 shadow-xl shadow-sky-500/10 ring-4 ring-sky-500/10 dark:bg-slate-900 dark:ring-sky-500/20">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building2 size={18} className="text-sky-500" />
                          Pack Campus Pro
                        </h3>
                        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-600 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
                          ✦ OFFRE RECOMMANDÉE
                        </span>
                      </div>

                      <h4 className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-200">Pour 300+ Étudiants</h4>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        La formule globale pour universités, grands campus et réseaux éducatifs.
                      </p>

                      <div className="mt-6 flex items-baseline">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">150 000 FCFA</span>
                        <span className="ml-2 text-xs font-semibold text-slate-400">/ mois</span>
                      </div>

                      <a
                        href="#contact"
                        className="mt-6 flex items-center justify-center gap-2 w-full rounded-full bg-sky-500 py-3 text-center text-sm font-bold text-white shadow-md shadow-sky-500/30 transition-all hover:bg-sky-600"
                      >
                        <span>Contacter l'équipe Partenariats</span>
                        <ArrowRight size={16} />
                      </a>

                      <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Tout ce qui est dans Pack École, plus :</p>
                        <ul className="mt-4 space-y-3">
                          <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <Sparkles size={16} className="mt-0.5 shrink-0 text-sky-500" />
                            <span>Jusqu'à 300 comptes apprenants & formateurs</span>
                          </li>
                          <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                            <span>Tableau de bord d'analyse de progression globale</span>
                          </li>
                          <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                            <span>Création de parcours et leçons réservées à l'établissement</span>
                          </li>
                          <li className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <Check size={16} className="mt-0.5 shrink-0 text-sky-500" />
                            <span>Accompagnement & Support technique prioritaire 7j/7</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Note d'information de paiement */}
        <div className="mt-12 mx-auto max-w-3xl rounded-2xl border border-sky-100 bg-sky-50/70 p-5 text-center text-xs leading-relaxed text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
          <p className="flex items-center justify-center gap-2 font-bold mb-1">
            <HelpCircle size={15} className="text-sky-600 dark:text-sky-400" />
            Mode de souscription & Paiement
          </p>
          <p>
            Le paiement en ligne (Carte bancaire & Mobile Money) est en cours de déploiement. Pour souscrire dès aujourd'hui ou faire bénéficier votre établissement d'un compte partenaire, contactez notre équipe ou renseignez votre <strong>code d'invitation établissement</strong> lors de l'inscription.
          </p>
        </div>

      </div>
    </section>
  )
}
