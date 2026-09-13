// Laboratoire de réactions — catalogue CURATÉ de réactions chimiques
// réelles et classiques (niveau lycée/1er cycle), volontairement fermé :
// mélanger deux réactifs qui ne figurent pas ensemble dans ce catalogue
// n'affiche jamais un résultat inventé, juste "réaction non répertoriée".
// Toutes les données (équation, observations, couleurs) sont réelles.

export interface ReactifChimie {
  formule: string
  nom: string
  // Couleur de la solution/du réactif tel qu'il apparaît avant mélange.
  couleur: string
}

export type TypeReaction = 'acide-base' | 'précipitation' | 'combustion' | 'oxydo-réduction' | 'décomposition'

export interface ReactionChimie {
  id: string
  nom: string
  equation: string
  reactifs: [ReactifChimie, ReactifChimie]
  produits: string
  type: TypeReaction
  observations: string
  exothermique: boolean
  degageGaz: boolean
  formePrecipite: boolean
  // Couleur de la solution une fois la réaction terminée.
  couleurResultat: string
}

export const REACTIONS_CHIMIE: ReactionChimie[] = [
  {
    id: 'neutralisation-hcl-naoh',
    nom: 'Neutralisation acide-base',
    equation: 'HCl + NaOH → NaCl + H₂O',
    reactifs: [
      { formule: 'HCl', nom: 'Acide chlorhydrique', couleur: '#e0f2fe' },
      { formule: 'NaOH', nom: 'Hydroxyde de sodium (soude)', couleur: '#f0fdf4' },
    ],
    produits: 'Chlorure de sodium (sel) + eau',
    type: 'acide-base',
    observations:
      'Réaction de neutralisation classique : un acide fort et une base forte réagissent pour former un sel neutre (NaCl) et de l\'eau. Dégagement de chaleur perceptible si les concentrations sont élevées.',
    exothermique: true,
    degageGaz: false,
    formePrecipite: false,
    couleurResultat: '#f8fafc',
  },
  {
    id: 'vinaigre-bicarbonate',
    nom: 'Vinaigre et bicarbonate de soude',
    equation: 'CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂↑',
    reactifs: [
      { formule: 'CH₃COOH', nom: "Acide acétique (vinaigre)", couleur: '#fefce8' },
      { formule: 'NaHCO₃', nom: 'Bicarbonate de soude', couleur: '#ffffff' },
    ],
    produits: 'Acétate de sodium + eau + dioxyde de carbone',
    type: 'acide-base',
    observations:
      "L'expérience classique de l'éruption effervescente : le CO₂ gazeux produit forme immédiatement des bulles. Réaction légèrement endothermique (la solution se refroidit un peu).",
    exothermique: false,
    degageGaz: true,
    formePrecipite: false,
    couleurResultat: '#fefce8',
  },
  {
    id: 'precipitation-agno3-nacl',
    nom: 'Précipitation du chlorure d\'argent',
    equation: 'AgNO₃ + NaCl → AgCl↓ + NaNO₃',
    reactifs: [
      { formule: 'AgNO₃', nom: 'Nitrate d\'argent', couleur: '#f8fafc' },
      { formule: 'NaCl', nom: 'Chlorure de sodium', couleur: '#f8fafc' },
    ],
    produits: 'Chlorure d\'argent (précipité) + nitrate de sodium',
    type: 'précipitation',
    observations:
      "Réaction de précipitation instantanée : le chlorure d'argent, insoluble dans l'eau, apparaît sous forme d'un précipité blanc caillouteux qui noircit à la lumière — test classique de reconnaissance des ions chlorure.",
    exothermique: false,
    degageGaz: false,
    formePrecipite: true,
    couleurResultat: '#f1f5f9',
  },
  {
    id: 'precipitation-pb-ki',
    nom: "Précipitation de l'iodure de plomb",
    equation: 'Pb(NO₃)₂ + 2 KI → PbI₂↓ + 2 KNO₃',
    reactifs: [
      { formule: 'Pb(NO₃)₂', nom: 'Nitrate de plomb', couleur: '#ffffff' },
      { formule: 'KI', nom: 'Iodure de potassium', couleur: '#ffffff' },
    ],
    produits: 'Iodure de plomb (précipité) + nitrate de potassium',
    type: 'précipitation',
    observations:
      "L'une des réactions les plus visuellement spectaculaires de la chimie de collège/lycée : un précipité jaune vif se forme instantanément (« pluie d'or »).",
    exothermique: false,
    degageGaz: false,
    formePrecipite: true,
    couleurResultat: '#facc15',
  },
  {
    id: 'precipitation-cuso4-naoh',
    nom: "Précipitation de l'hydroxyde de cuivre",
    equation: 'CuSO₄ + 2 NaOH → Cu(OH)₂↓ + Na₂SO₄',
    reactifs: [
      { formule: 'CuSO₄', nom: 'Sulfate de cuivre', couleur: '#38bdf8' },
      { formule: 'NaOH', nom: 'Hydroxyde de sodium (soude)', couleur: '#f0fdf4' },
    ],
    produits: 'Hydroxyde de cuivre (précipité) + sulfate de sodium',
    type: 'précipitation',
    observations:
      "La solution bleue caractéristique du cuivre (II) forme un précipité bleu pâle floconneux d'hydroxyde de cuivre — test classique de reconnaissance des ions cuivre.",
    exothermique: false,
    degageGaz: false,
    formePrecipite: true,
    couleurResultat: '#7dd3fc',
  },
  {
    id: 'zinc-acide-chlorhydrique',
    nom: 'Attaque du zinc par l\'acide chlorhydrique',
    equation: 'Zn + 2 HCl → ZnCl₂ + H₂↑',
    reactifs: [
      { formule: 'Zn', nom: 'Zinc (métal)', couleur: '#94a3b8' },
      { formule: 'HCl', nom: 'Acide chlorhydrique', couleur: '#e0f2fe' },
    ],
    produits: 'Chlorure de zinc + dihydrogène',
    type: 'oxydo-réduction',
    observations:
      "Réaction d'oxydo-réduction classique : le zinc se dissout en dégageant de nombreuses bulles de dihydrogène gazeux, avec un léger échauffement de la solution.",
    exothermique: true,
    degageGaz: true,
    formePrecipite: false,
    couleurResultat: '#e2e8f0',
  },
  {
    id: 'fer-acide-sulfurique',
    nom: 'Attaque du fer par l\'acide sulfurique dilué',
    equation: 'Fe + H₂SO₄ → FeSO₄ + H₂↑',
    reactifs: [
      { formule: 'Fe', nom: 'Fer (métal)', couleur: '#71717a' },
      { formule: 'H₂SO₄', nom: 'Acide sulfurique dilué', couleur: '#f8fafc' },
    ],
    produits: 'Sulfate de fer (II) + dihydrogène',
    type: 'oxydo-réduction',
    observations:
      'Le fer se dissout progressivement, la solution incolore verdit légèrement (ions Fe²⁺) et des bulles de dihydrogène se dégagent.',
    exothermique: true,
    degageGaz: true,
    formePrecipite: false,
    couleurResultat: '#bbf7d0',
  },
  {
    id: 'eau-de-chaux-co2',
    nom: "Test à l'eau de chaux",
    equation: 'Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O',
    reactifs: [
      { formule: 'Ca(OH)₂', nom: 'Eau de chaux', couleur: '#f8fafc' },
      { formule: 'CO₂', nom: 'Dioxyde de carbone (dissous)', couleur: '#f0fdf4' },
    ],
    produits: 'Carbonate de calcium (précipité) + eau',
    type: 'précipitation',
    observations:
      "Le test de reconnaissance du CO₂ enseigné dans toutes les classes : l'eau de chaux, limpide, se trouble instantanément (précipité blanc de carbonate de calcium) au contact du dioxyde de carbone.",
    exothermique: false,
    degageGaz: false,
    formePrecipite: true,
    couleurResultat: '#f8fafc',
  },
  {
    id: 'decomposition-peroxyde',
    nom: "Décomposition de l'eau oxygénée",
    equation: '2 H₂O₂ → 2 H₂O + O₂↑ (catalyseur : MnO₂)',
    reactifs: [
      { formule: 'H₂O₂', nom: "Eau oxygénée (peroxyde d'hydrogène)", couleur: '#f8fafc' },
      { formule: 'MnO₂', nom: 'Dioxyde de manganèse (catalyseur)', couleur: '#27272a' },
    ],
    produits: 'Eau + dioxygène',
    type: 'décomposition',
    observations:
      "En présence du catalyseur MnO₂ (non consommé par la réaction), l'eau oxygénée se décompose vigoureusement en libérant du dioxygène — effervescence intense, parfois appelée « dentifrice d'éléphant » à plus haute concentration.",
    exothermique: true,
    degageGaz: true,
    formePrecipite: false,
    couleurResultat: '#f8fafc',
  },
  {
    id: 'sodium-eau',
    nom: "Réaction du sodium avec l'eau",
    equation: '2 Na + 2 H₂O → 2 NaOH + H₂↑',
    reactifs: [
      { formule: 'Na', nom: 'Sodium (métal)', couleur: '#e2e8f0' },
      { formule: 'H₂O', nom: 'Eau', couleur: '#e0f2fe' },
    ],
    produits: 'Hydroxyde de sodium + dihydrogène',
    type: 'oxydo-réduction',
    observations:
      "Réaction très exothermique et spectaculaire (uniquement en démonstration filmée/encadrée en réalité) : le sodium fond au contact de l'eau, se déplace à sa surface et libère du dihydrogène, parfois inflammable au contact de l'air.",
    exothermique: true,
    degageGaz: true,
    formePrecipite: false,
    couleurResultat: '#f0fdf4',
  },
  {
    id: 'combustion-methane',
    nom: 'Combustion du méthane',
    equation: 'CH₄ + 2 O₂ → CO₂ + 2 H₂O',
    reactifs: [
      { formule: 'CH₄', nom: 'Méthane', couleur: '#f8fafc' },
      { formule: 'O₂', nom: 'Dioxygène', couleur: '#e0f2fe' },
    ],
    produits: 'Dioxyde de carbone + eau',
    type: 'combustion',
    observations:
      "Combustion complète caractéristique d'une flamme bleue (celle d'un bec Bunsen ou d'une gazinière) — fortement exothermique, produisant uniquement du CO₂ et de l'eau.",
    exothermique: true,
    degageGaz: true,
    formePrecipite: false,
    couleurResultat: '#f8fafc',
  },
  {
    id: 'combustion-carbone',
    nom: 'Combustion du carbone',
    equation: 'C + O₂ → CO₂',
    reactifs: [
      { formule: 'C', nom: 'Carbone (charbon)', couleur: '#18181b' },
      { formule: 'O₂', nom: 'Dioxygène', couleur: '#e0f2fe' },
    ],
    produits: 'Dioxyde de carbone',
    type: 'combustion',
    observations:
      'Combustion du charbon en oxygène pur : réaction vive et exothermique, incandescence caractéristique.',
    exothermique: true,
    degageGaz: true,
    formePrecipite: false,
    couleurResultat: '#f8fafc',
  },
]

// Réactifs uniques dérivés du catalogue (dédupliqués par formule) — sert à
// peupler les deux sélecteurs "réactif A" / "réactif B" du laboratoire.
export const REACTIFS_DISPONIBLES: ReactifChimie[] = Array.from(
  new Map(REACTIONS_CHIMIE.flatMap((r) => r.reactifs).map((r) => [r.formule, r])).values(),
)

/** Cherche la réaction curatée correspondant à une paire de réactifs
 * (ordre indifférent) — renvoie null si cette combinaison précise n'est
 * pas répertoriée, plutôt que d'inventer un résultat. */
export function trouverReaction(formuleA: string, formuleB: string): ReactionChimie | null {
  if (!formuleA || !formuleB || formuleA === formuleB) return null
  return (
    REACTIONS_CHIMIE.find((r) => {
      const formules = r.reactifs.map((x) => x.formule)
      return formules.includes(formuleA) && formules.includes(formuleB)
    }) ?? null
  )
}
