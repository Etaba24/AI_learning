// Modèle du montage électronique construit librement par l'apprenant :
// composants placés sur le canevas + fils tirés entre leurs bornes. La
// connectivité électrique est déduite des fils dessinés (union des bornes
// reliées), PAS d'une simulation physique de plaque d'essai (pas de bandes
// internes ni de rails) — plus simple à construire correctement, et surtout
// plus explicite pédagogiquement : chaque connexion doit être câblée.

export type ComponentType = 'led' | 'buzzer' | 'button' | 'potentiometer'

export interface PlacedComponent {
  id: string
  type: ComponentType
  x: number
  y: number
  // Potentiomètre uniquement : position du curseur (0-1023), persistée
  // comme la position physique d'un vrai bouton tant qu'on n'y touche pas.
  value?: number
}

export interface Wire {
  id: string
  from: string // "arduino:D13" | "<componentId>:<terminal>"
  to: string
}

export interface CircuitData {
  components: PlacedComponent[]
  wires: Wire[]
}

export function emptyCircuit(): CircuitData {
  return { components: [], wires: [] }
}

// Bornes de chaque type de composant, dans l'ordre où elles sont dessinées.
export const COMPONENT_TERMINALS: Record<ComponentType, string[]> = {
  led: ['anode', 'cathode'],
  buzzer: ['plus', 'minus'],
  button: ['t1', 't2'],
  potentiometer: ['gnd', 'wiper', 'vcc'],
}

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  led: 'LED',
  buzzer: 'Buzzer',
  button: 'Bouton',
  potentiometer: 'Potentiomètre',
}

// Pins Arduino proposés — 0/1 exclus (réservés à la liaison série).
export const DIGITAL_PINS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
export const ANALOG_PINS = [0, 1, 2, 3]

export interface ResolvedCircuit {
  // Broche numérique -> composants (LED/buzzer en sortie, bouton en entrée)
  // qui y sont effectivement raccordés (anode/plus/t1 câblés à cette broche
  // ET l'autre borne câblée au GND de l'Arduino).
  ledsByPin: Map<number, string[]>
  buzzersByPin: Map<number, string[]>
  buttonsByPin: Map<number, string[]>
  potentiometersByAnalogPin: Map<number, string[]>
  // Composants placés mais pas (encore) correctement câblés — pour
  // afficher un avertissement plutôt qu'un simple silence.
  unwiredComponentIds: string[]
  // Lookup inverse pratique pour le rendu : broche d'un composant précis.
  pinByComponentId: Map<string, number>
  analogPinByComponentId: Map<string, number>
}

class UnionFind {
  private parent = new Map<string, string>()

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x)
    let root = x
    while (this.parent.get(root) !== root) root = this.parent.get(root)!
    this.parent.set(x, root)
    return root
  }

  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

export function resolveCircuit(circuit: CircuitData): ResolvedCircuit {
  const uf = new UnionFind()
  for (const wire of circuit.wires) uf.union(wire.from, wire.to)

  const gndRoot = uf.find('arduino:GND')

  function pinConnectedTo(terminal: string): number | null {
    const root = uf.find(terminal)
    for (const pin of DIGITAL_PINS) {
      if (uf.find(`arduino:D${pin}`) === root) return pin
    }
    return null
  }

  function analogPinConnectedTo(terminal: string): number | null {
    const root = uf.find(terminal)
    for (const pin of ANALOG_PINS) {
      if (uf.find(`arduino:A${pin}`) === root) return pin
    }
    return null
  }

  function isGrounded(terminal: string): boolean {
    return uf.find(terminal) === gndRoot
  }

  const ledsByPin = new Map<number, string[]>()
  const buzzersByPin = new Map<number, string[]>()
  const buttonsByPin = new Map<number, string[]>()
  const potentiometersByAnalogPin = new Map<number, string[]>()
  const unwiredComponentIds: string[] = []
  const pinByComponentId = new Map<string, number>()
  const analogPinByComponentId = new Map<string, number>()

  function addTo(map: Map<number, string[]>, pin: number, id: string) {
    const list = map.get(pin) ?? []
    list.push(id)
    map.set(pin, list)
  }

  for (const comp of circuit.components) {
    if (comp.type === 'led') {
      const pin = pinConnectedTo(`${comp.id}:anode`)
      if (pin !== null && isGrounded(`${comp.id}:cathode`)) {
        addTo(ledsByPin, pin, comp.id)
        pinByComponentId.set(comp.id, pin)
      } else unwiredComponentIds.push(comp.id)
    } else if (comp.type === 'buzzer') {
      const pin = pinConnectedTo(`${comp.id}:plus`)
      if (pin !== null && isGrounded(`${comp.id}:minus`)) {
        addTo(buzzersByPin, pin, comp.id)
        pinByComponentId.set(comp.id, pin)
      } else unwiredComponentIds.push(comp.id)
    } else if (comp.type === 'button') {
      const pinA = pinConnectedTo(`${comp.id}:t1`)
      const pinB = pinConnectedTo(`${comp.id}:t2`)
      const pin = pinA ?? pinB
      const otherGrounded = pinA !== null ? isGrounded(`${comp.id}:t2`) : isGrounded(`${comp.id}:t1`)
      if (pin !== null && otherGrounded) {
        addTo(buttonsByPin, pin, comp.id)
        pinByComponentId.set(comp.id, pin)
      } else unwiredComponentIds.push(comp.id)
    } else if (comp.type === 'potentiometer') {
      const pin = analogPinConnectedTo(`${comp.id}:wiper`)
      if (pin !== null) {
        addTo(potentiometersByAnalogPin, pin, comp.id)
        analogPinByComponentId.set(comp.id, pin)
      } else unwiredComponentIds.push(comp.id)
    }
  }

  return {
    ledsByPin,
    buzzersByPin,
    buttonsByPin,
    potentiometersByAnalogPin,
    unwiredComponentIds,
    pinByComponentId,
    analogPinByComponentId,
  }
}
