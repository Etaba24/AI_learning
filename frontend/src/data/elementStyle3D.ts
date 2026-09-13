// Couleurs CPK (convention standard de coloration des atomes en chimie,
// Corey-Pauling-Koltun) et rayons relatifs pour le rendu 3D ball-and-stick.
// Rayons volontairement compressés (racine carrée du rayon atomique réel)
// pour rester lisibles en 3D — un rendu à l'échelle réelle rendrait les
// petits atomes (H) quasi invisibles à côté d'atomes plus lourds.

export interface StyleElement3D {
  couleur: string
  rayon: number
}

const DEFAUT: StyleElement3D = { couleur: '#e91e8c', rayon: 0.5 }

export const STYLE_ELEMENTS_3D: Record<string, StyleElement3D> = {
  H: { couleur: '#ffffff', rayon: 0.32 },
  C: { couleur: '#3f3f46', rayon: 0.45 },
  N: { couleur: '#3b82f6', rayon: 0.43 },
  O: { couleur: '#ef4444', rayon: 0.44 },
  F: { couleur: '#4ade80', rayon: 0.4 },
  P: { couleur: '#fb923c', rayon: 0.5 },
  S: { couleur: '#facc15', rayon: 0.5 },
  Cl: { couleur: '#4ade80', rayon: 0.5 },
  Br: { couleur: '#a16207', rayon: 0.55 },
  I: { couleur: '#7c3aed', rayon: 0.6 },
  Na: { couleur: '#818cf8', rayon: 0.55 },
  K: { couleur: '#818cf8', rayon: 0.6 },
  Mg: { couleur: '#22c55e', rayon: 0.5 },
  Ca: { couleur: '#22c55e', rayon: 0.55 },
  Fe: { couleur: '#c2410c', rayon: 0.5 },
  Zn: { couleur: '#71717a', rayon: 0.5 },
}

export function styleElement3D(symbole: string): StyleElement3D {
  return STYLE_ELEMENTS_3D[symbole] ?? DEFAUT
}
