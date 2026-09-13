// Table périodique complète (118 éléments) — données réelles (numéro
// atomique, symbole, nom, masse atomique standard IUPAC arrondie,
// catégorie, position dans la grille). Utilisée pour la table périodique
// interactive de l'outil "Laboratoire de chimie 3D".

export type CategorieElement =
  | 'alcalin'
  | 'alcalino-terreux'
  | 'métal de transition'
  | 'métal pauvre'
  | 'métalloïde'
  | 'non-métal'
  | 'halogène'
  | 'gaz noble'
  | 'lanthanide'
  | 'actinide'
  | 'inconnu'

export interface ElementChimique {
  numero: number
  symbole: string
  nom: string
  masse: number
  categorie: CategorieElement
  // Position dans la grille standard de la table périodique (18 colonnes,
  // lanthanides/actinides détachés sur 2 lignes en bas).
  periode: number
  groupe: number
}

export const ELEMENTS: ElementChimique[] = [
  { numero: 1, symbole: 'H', nom: 'Hydrogène', masse: 1.008, categorie: 'non-métal', periode: 1, groupe: 1 },
  { numero: 2, symbole: 'He', nom: 'Hélium', masse: 4.003, categorie: 'gaz noble', periode: 1, groupe: 18 },
  { numero: 3, symbole: 'Li', nom: 'Lithium', masse: 6.94, categorie: 'alcalin', periode: 2, groupe: 1 },
  { numero: 4, symbole: 'Be', nom: 'Béryllium', masse: 9.012, categorie: 'alcalino-terreux', periode: 2, groupe: 2 },
  { numero: 5, symbole: 'B', nom: 'Bore', masse: 10.81, categorie: 'métalloïde', periode: 2, groupe: 13 },
  { numero: 6, symbole: 'C', nom: 'Carbone', masse: 12.011, categorie: 'non-métal', periode: 2, groupe: 14 },
  { numero: 7, symbole: 'N', nom: 'Azote', masse: 14.007, categorie: 'non-métal', periode: 2, groupe: 15 },
  { numero: 8, symbole: 'O', nom: 'Oxygène', masse: 15.999, categorie: 'non-métal', periode: 2, groupe: 16 },
  { numero: 9, symbole: 'F', nom: 'Fluor', masse: 18.998, categorie: 'halogène', periode: 2, groupe: 17 },
  { numero: 10, symbole: 'Ne', nom: 'Néon', masse: 20.18, categorie: 'gaz noble', periode: 2, groupe: 18 },
  { numero: 11, symbole: 'Na', nom: 'Sodium', masse: 22.99, categorie: 'alcalin', periode: 3, groupe: 1 },
  { numero: 12, symbole: 'Mg', nom: 'Magnésium', masse: 24.305, categorie: 'alcalino-terreux', periode: 3, groupe: 2 },
  { numero: 13, symbole: 'Al', nom: 'Aluminium', masse: 26.982, categorie: 'métal pauvre', periode: 3, groupe: 13 },
  { numero: 14, symbole: 'Si', nom: 'Silicium', masse: 28.085, categorie: 'métalloïde', periode: 3, groupe: 14 },
  { numero: 15, symbole: 'P', nom: 'Phosphore', masse: 30.974, categorie: 'non-métal', periode: 3, groupe: 15 },
  { numero: 16, symbole: 'S', nom: 'Soufre', masse: 32.06, categorie: 'non-métal', periode: 3, groupe: 16 },
  { numero: 17, symbole: 'Cl', nom: 'Chlore', masse: 35.45, categorie: 'halogène', periode: 3, groupe: 17 },
  { numero: 18, symbole: 'Ar', nom: 'Argon', masse: 39.948, categorie: 'gaz noble', periode: 3, groupe: 18 },
  { numero: 19, symbole: 'K', nom: 'Potassium', masse: 39.098, categorie: 'alcalin', periode: 4, groupe: 1 },
  { numero: 20, symbole: 'Ca', nom: 'Calcium', masse: 40.078, categorie: 'alcalino-terreux', periode: 4, groupe: 2 },
  { numero: 21, symbole: 'Sc', nom: 'Scandium', masse: 44.956, categorie: 'métal de transition', periode: 4, groupe: 3 },
  { numero: 22, symbole: 'Ti', nom: 'Titane', masse: 47.867, categorie: 'métal de transition', periode: 4, groupe: 4 },
  { numero: 23, symbole: 'V', nom: 'Vanadium', masse: 50.942, categorie: 'métal de transition', periode: 4, groupe: 5 },
  { numero: 24, symbole: 'Cr', nom: 'Chrome', masse: 51.996, categorie: 'métal de transition', periode: 4, groupe: 6 },
  { numero: 25, symbole: 'Mn', nom: 'Manganèse', masse: 54.938, categorie: 'métal de transition', periode: 4, groupe: 7 },
  { numero: 26, symbole: 'Fe', nom: 'Fer', masse: 55.845, categorie: 'métal de transition', periode: 4, groupe: 8 },
  { numero: 27, symbole: 'Co', nom: 'Cobalt', masse: 58.933, categorie: 'métal de transition', periode: 4, groupe: 9 },
  { numero: 28, symbole: 'Ni', nom: 'Nickel', masse: 58.693, categorie: 'métal de transition', periode: 4, groupe: 10 },
  { numero: 29, symbole: 'Cu', nom: 'Cuivre', masse: 63.546, categorie: 'métal de transition', periode: 4, groupe: 11 },
  { numero: 30, symbole: 'Zn', nom: 'Zinc', masse: 65.38, categorie: 'métal de transition', periode: 4, groupe: 12 },
  { numero: 31, symbole: 'Ga', nom: 'Gallium', masse: 69.723, categorie: 'métal pauvre', periode: 4, groupe: 13 },
  { numero: 32, symbole: 'Ge', nom: 'Germanium', masse: 72.63, categorie: 'métalloïde', periode: 4, groupe: 14 },
  { numero: 33, symbole: 'As', nom: 'Arsenic', masse: 74.922, categorie: 'métalloïde', periode: 4, groupe: 15 },
  { numero: 34, symbole: 'Se', nom: 'Sélénium', masse: 78.971, categorie: 'non-métal', periode: 4, groupe: 16 },
  { numero: 35, symbole: 'Br', nom: 'Brome', masse: 79.904, categorie: 'halogène', periode: 4, groupe: 17 },
  { numero: 36, symbole: 'Kr', nom: 'Krypton', masse: 83.798, categorie: 'gaz noble', periode: 4, groupe: 18 },
  { numero: 37, symbole: 'Rb', nom: 'Rubidium', masse: 85.468, categorie: 'alcalin', periode: 5, groupe: 1 },
  { numero: 38, symbole: 'Sr', nom: 'Strontium', masse: 87.62, categorie: 'alcalino-terreux', periode: 5, groupe: 2 },
  { numero: 39, symbole: 'Y', nom: 'Yttrium', masse: 88.906, categorie: 'métal de transition', periode: 5, groupe: 3 },
  { numero: 40, symbole: 'Zr', nom: 'Zirconium', masse: 91.224, categorie: 'métal de transition', periode: 5, groupe: 4 },
  { numero: 41, symbole: 'Nb', nom: 'Niobium', masse: 92.906, categorie: 'métal de transition', periode: 5, groupe: 5 },
  { numero: 42, symbole: 'Mo', nom: 'Molybdène', masse: 95.95, categorie: 'métal de transition', periode: 5, groupe: 6 },
  { numero: 43, symbole: 'Tc', nom: 'Technétium', masse: 98, categorie: 'métal de transition', periode: 5, groupe: 7 },
  { numero: 44, symbole: 'Ru', nom: 'Ruthénium', masse: 101.07, categorie: 'métal de transition', periode: 5, groupe: 8 },
  { numero: 45, symbole: 'Rh', nom: 'Rhodium', masse: 102.906, categorie: 'métal de transition', periode: 5, groupe: 9 },
  { numero: 46, symbole: 'Pd', nom: 'Palladium', masse: 106.42, categorie: 'métal de transition', periode: 5, groupe: 10 },
  { numero: 47, symbole: 'Ag', nom: 'Argent', masse: 107.868, categorie: 'métal de transition', periode: 5, groupe: 11 },
  { numero: 48, symbole: 'Cd', nom: 'Cadmium', masse: 112.414, categorie: 'métal de transition', periode: 5, groupe: 12 },
  { numero: 49, symbole: 'In', nom: 'Indium', masse: 114.818, categorie: 'métal pauvre', periode: 5, groupe: 13 },
  { numero: 50, symbole: 'Sn', nom: 'Étain', masse: 118.71, categorie: 'métal pauvre', periode: 5, groupe: 14 },
  { numero: 51, symbole: 'Sb', nom: 'Antimoine', masse: 121.76, categorie: 'métalloïde', periode: 5, groupe: 15 },
  { numero: 52, symbole: 'Te', nom: 'Tellure', masse: 127.6, categorie: 'métalloïde', periode: 5, groupe: 16 },
  { numero: 53, symbole: 'I', nom: 'Iode', masse: 126.904, categorie: 'halogène', periode: 5, groupe: 17 },
  { numero: 54, symbole: 'Xe', nom: 'Xénon', masse: 131.293, categorie: 'gaz noble', periode: 5, groupe: 18 },
  { numero: 55, symbole: 'Cs', nom: 'Césium', masse: 132.905, categorie: 'alcalin', periode: 6, groupe: 1 },
  { numero: 56, symbole: 'Ba', nom: 'Baryum', masse: 137.327, categorie: 'alcalino-terreux', periode: 6, groupe: 2 },
  { numero: 57, symbole: 'La', nom: 'Lanthane', masse: 138.905, categorie: 'lanthanide', periode: 8, groupe: 3 },
  { numero: 58, symbole: 'Ce', nom: 'Cérium', masse: 140.116, categorie: 'lanthanide', periode: 8, groupe: 4 },
  { numero: 59, symbole: 'Pr', nom: 'Praséodyme', masse: 140.908, categorie: 'lanthanide', periode: 8, groupe: 5 },
  { numero: 60, symbole: 'Nd', nom: 'Néodyme', masse: 144.242, categorie: 'lanthanide', periode: 8, groupe: 6 },
  { numero: 61, symbole: 'Pm', nom: 'Prométhium', masse: 145, categorie: 'lanthanide', periode: 8, groupe: 7 },
  { numero: 62, symbole: 'Sm', nom: 'Samarium', masse: 150.36, categorie: 'lanthanide', periode: 8, groupe: 8 },
  { numero: 63, symbole: 'Eu', nom: 'Europium', masse: 151.964, categorie: 'lanthanide', periode: 8, groupe: 9 },
  { numero: 64, symbole: 'Gd', nom: 'Gadolinium', masse: 157.25, categorie: 'lanthanide', periode: 8, groupe: 10 },
  { numero: 65, symbole: 'Tb', nom: 'Terbium', masse: 158.925, categorie: 'lanthanide', periode: 8, groupe: 11 },
  { numero: 66, symbole: 'Dy', nom: 'Dysprosium', masse: 162.5, categorie: 'lanthanide', periode: 8, groupe: 12 },
  { numero: 67, symbole: 'Ho', nom: 'Holmium', masse: 164.93, categorie: 'lanthanide', periode: 8, groupe: 13 },
  { numero: 68, symbole: 'Er', nom: 'Erbium', masse: 167.259, categorie: 'lanthanide', periode: 8, groupe: 14 },
  { numero: 69, symbole: 'Tm', nom: 'Thulium', masse: 168.934, categorie: 'lanthanide', periode: 8, groupe: 15 },
  { numero: 70, symbole: 'Yb', nom: 'Ytterbium', masse: 173.045, categorie: 'lanthanide', periode: 8, groupe: 16 },
  { numero: 71, symbole: 'Lu', nom: 'Lutécium', masse: 174.967, categorie: 'lanthanide', periode: 8, groupe: 17 },
  { numero: 72, symbole: 'Hf', nom: 'Hafnium', masse: 178.49, categorie: 'métal de transition', periode: 6, groupe: 4 },
  { numero: 73, symbole: 'Ta', nom: 'Tantale', masse: 180.948, categorie: 'métal de transition', periode: 6, groupe: 5 },
  { numero: 74, symbole: 'W', nom: 'Tungstène', masse: 183.84, categorie: 'métal de transition', periode: 6, groupe: 6 },
  { numero: 75, symbole: 'Re', nom: 'Rhénium', masse: 186.207, categorie: 'métal de transition', periode: 6, groupe: 7 },
  { numero: 76, symbole: 'Os', nom: 'Osmium', masse: 190.23, categorie: 'métal de transition', periode: 6, groupe: 8 },
  { numero: 77, symbole: 'Ir', nom: 'Iridium', masse: 192.217, categorie: 'métal de transition', periode: 6, groupe: 9 },
  { numero: 78, symbole: 'Pt', nom: 'Platine', masse: 195.084, categorie: 'métal de transition', periode: 6, groupe: 10 },
  { numero: 79, symbole: 'Au', nom: 'Or', masse: 196.967, categorie: 'métal de transition', periode: 6, groupe: 11 },
  { numero: 80, symbole: 'Hg', nom: 'Mercure', masse: 200.592, categorie: 'métal de transition', periode: 6, groupe: 12 },
  { numero: 81, symbole: 'Tl', nom: 'Thallium', masse: 204.38, categorie: 'métal pauvre', periode: 6, groupe: 13 },
  { numero: 82, symbole: 'Pb', nom: 'Plomb', masse: 207.2, categorie: 'métal pauvre', periode: 6, groupe: 14 },
  { numero: 83, symbole: 'Bi', nom: 'Bismuth', masse: 208.98, categorie: 'métal pauvre', periode: 6, groupe: 15 },
  { numero: 84, symbole: 'Po', nom: 'Polonium', masse: 209, categorie: 'métalloïde', periode: 6, groupe: 16 },
  { numero: 85, symbole: 'At', nom: 'Astate', masse: 210, categorie: 'halogène', periode: 6, groupe: 17 },
  { numero: 86, symbole: 'Rn', nom: 'Radon', masse: 222, categorie: 'gaz noble', periode: 6, groupe: 18 },
  { numero: 87, symbole: 'Fr', nom: 'Francium', masse: 223, categorie: 'alcalin', periode: 7, groupe: 1 },
  { numero: 88, symbole: 'Ra', nom: 'Radium', masse: 226, categorie: 'alcalino-terreux', periode: 7, groupe: 2 },
  { numero: 89, symbole: 'Ac', nom: 'Actinium', masse: 227, categorie: 'actinide', periode: 9, groupe: 3 },
  { numero: 90, symbole: 'Th', nom: 'Thorium', masse: 232.038, categorie: 'actinide', periode: 9, groupe: 4 },
  { numero: 91, symbole: 'Pa', nom: 'Protactinium', masse: 231.036, categorie: 'actinide', periode: 9, groupe: 5 },
  { numero: 92, symbole: 'U', nom: 'Uranium', masse: 238.029, categorie: 'actinide', periode: 9, groupe: 6 },
  { numero: 93, symbole: 'Np', nom: 'Neptunium', masse: 237, categorie: 'actinide', periode: 9, groupe: 7 },
  { numero: 94, symbole: 'Pu', nom: 'Plutonium', masse: 244, categorie: 'actinide', periode: 9, groupe: 8 },
  { numero: 95, symbole: 'Am', nom: 'Américium', masse: 243, categorie: 'actinide', periode: 9, groupe: 9 },
  { numero: 96, symbole: 'Cm', nom: 'Curium', masse: 247, categorie: 'actinide', periode: 9, groupe: 10 },
  { numero: 97, symbole: 'Bk', nom: 'Berkélium', masse: 247, categorie: 'actinide', periode: 9, groupe: 11 },
  { numero: 98, symbole: 'Cf', nom: 'Californium', masse: 251, categorie: 'actinide', periode: 9, groupe: 12 },
  { numero: 99, symbole: 'Es', nom: 'Einsteinium', masse: 252, categorie: 'actinide', periode: 9, groupe: 13 },
  { numero: 100, symbole: 'Fm', nom: 'Fermium', masse: 257, categorie: 'actinide', periode: 9, groupe: 14 },
  { numero: 101, symbole: 'Md', nom: 'Mendélévium', masse: 258, categorie: 'actinide', periode: 9, groupe: 15 },
  { numero: 102, symbole: 'No', nom: 'Nobélium', masse: 259, categorie: 'actinide', periode: 9, groupe: 16 },
  { numero: 103, symbole: 'Lr', nom: 'Lawrencium', masse: 266, categorie: 'actinide', periode: 9, groupe: 17 },
  { numero: 104, symbole: 'Rf', nom: 'Rutherfordium', masse: 267, categorie: 'métal de transition', periode: 7, groupe: 4 },
  { numero: 105, symbole: 'Db', nom: 'Dubnium', masse: 268, categorie: 'métal de transition', periode: 7, groupe: 5 },
  { numero: 106, symbole: 'Sg', nom: 'Seaborgium', masse: 269, categorie: 'métal de transition', periode: 7, groupe: 6 },
  { numero: 107, symbole: 'Bh', nom: 'Bohrium', masse: 270, categorie: 'métal de transition', periode: 7, groupe: 7 },
  { numero: 108, symbole: 'Hs', nom: 'Hassium', masse: 269, categorie: 'métal de transition', periode: 7, groupe: 8 },
  { numero: 109, symbole: 'Mt', nom: 'Meitnérium', masse: 278, categorie: 'inconnu', periode: 7, groupe: 9 },
  { numero: 110, symbole: 'Ds', nom: 'Darmstadtium', masse: 281, categorie: 'inconnu', periode: 7, groupe: 10 },
  { numero: 111, symbole: 'Rg', nom: 'Roentgenium', masse: 282, categorie: 'inconnu', periode: 7, groupe: 11 },
  { numero: 112, symbole: 'Cn', nom: 'Copernicium', masse: 285, categorie: 'métal de transition', periode: 7, groupe: 12 },
  { numero: 113, symbole: 'Nh', nom: 'Nihonium', masse: 286, categorie: 'métal pauvre', periode: 7, groupe: 13 },
  { numero: 114, symbole: 'Fl', nom: 'Flérovium', masse: 289, categorie: 'métal pauvre', periode: 7, groupe: 14 },
  { numero: 115, symbole: 'Mc', nom: 'Moscovium', masse: 290, categorie: 'métal pauvre', periode: 7, groupe: 15 },
  { numero: 116, symbole: 'Lv', nom: 'Livermorium', masse: 293, categorie: 'métal pauvre', periode: 7, groupe: 16 },
  { numero: 117, symbole: 'Ts', nom: 'Tennesse', masse: 294, categorie: 'halogène', periode: 7, groupe: 17 },
  { numero: 118, symbole: 'Og', nom: 'Oganesson', masse: 294, categorie: 'gaz noble', periode: 7, groupe: 18 },
]

export const COULEUR_CATEGORIE: Record<CategorieElement, string> = {
  'alcalin': 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  'alcalino-terreux': 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
  'métal de transition': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  'métal pauvre': 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-500/15 dark:text-lime-300 dark:border-lime-500/30',
  'métalloïde': 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30',
  'non-métal': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  'halogène': 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  'gaz noble': 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
  'lanthanide': 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/30',
  'actinide': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:border-fuchsia-500/30',
  'inconnu': 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
}
