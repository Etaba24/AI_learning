// Interprète un croquis façon Arduino (setup()/loop(), pinMode/digitalWrite/
// digitalRead/analogRead/delay/Serial) — PAS un vrai compilateur C++, un
// sous-ensemble JS à la syntaxe compatible, exécuté sur une carte virtuelle
// simulée. Suffisant pour les croquis pédagogiques classiques (blink, bouton,
// buzzer, potentiomètre), pas pour du C++ arbitraire.

export type PinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'

export interface BoardState {
  digitalPins: Record<number, 0 | 1>
  // 0-1023 par broche analogique — un montage peut câbler plusieurs
  // potentiomètres sur des broches A différentes.
  analogValues: Record<number, number>
}

export function createBoardState(): BoardState {
  return { digitalPins: {}, analogValues: {} }
}

interface RuntimeHandlers {
  onDigitalWrite: (pin: number, value: 0 | 1) => void
  onLog: (line: string) => void
  isStopped: () => boolean
}

const HALT = Symbol('arduino-halt')

// `delay()` doit réellement suspendre l'exécution (interruptible, sans geler
// l'onglet) sans vrai compilateur : on marque donc setup/loop `async` et on
// préfixe les appels à `delay(` par `await`. Approche volontairement simple
// (remplacement textuel, pas un vrai parseur AST) — elle suppose un croquis
// écrit dans le style Arduino habituel, pas du JS quelconque.
function toAsyncSource(code: string): string {
  return code
    .replace(/function\s+setup\s*\(/, 'async function setup(')
    .replace(/function\s+loop\s*\(/, 'async function loop(')
    .replace(/(?<!await\s)\bdelay\s*\(/g, 'await delay(')
}

export async function runSketch(code: string, board: BoardState, handlers: RuntimeHandlers): Promise<void> {
  // Constructeur d'AsyncFunction : pas de global dédié en JS, on le récupère
  // via le prototype d'une fonction async — seul moyen d'obtenir un corps de
  // fonction généré dynamiquement qui accepte `await` en son sein.
  const AsyncFunctionCtor = Object.getPrototypeOf(async () => {}).constructor as new (
    ...args: string[]
  ) => (...fnArgs: unknown[]) => Promise<{ setup?: () => Promise<void>; loop?: () => Promise<void> }>

  function delay(ms: number): Promise<void> {
    const clamped = Math.min(Math.max(ms, 0), 5000)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (handlers.isStopped()) reject(HALT)
        else resolve()
      }, clamped)
    })
  }

  function pinMode(_pin: number, _mode: PinMode) {
    // Le mode n'affecte pas la simulation (composants fixes par pin) — posé
    // ici pour que les croquis Arduino classiques restent syntaxiquement
    // corrects sans modification.
  }

  function digitalWrite(pin: number, value: number) {
    const v: 0 | 1 = value ? 1 : 0
    board.digitalPins[pin] = v
    handlers.onDigitalWrite(pin, v)
  }

  function digitalRead(pin: number): number {
    return board.digitalPins[pin] ?? 0
  }

  function analogRead(pin: number): number {
    return board.analogValues[pin] ?? 0
  }

  const startedAt = Date.now()
  function millis(): number {
    return Date.now() - startedAt
  }

  const Serial = {
    begin: (_baud: number) => {},
    print: (msg: unknown) => handlers.onLog(String(msg)),
    println: (msg: unknown) => handlers.onLog(`${String(msg)}\n`),
  }

  const source = `${toAsyncSource(code)}\nreturn { setup, loop };`

  let sketch: { setup?: () => Promise<void>; loop?: () => Promise<void> }
  try {
    const factory = new AsyncFunctionCtor(
      'pinMode',
      'digitalWrite',
      'digitalRead',
      'analogRead',
      'delay',
      'millis',
      'Serial',
      'HIGH',
      'LOW',
      'INPUT',
      'OUTPUT',
      'INPUT_PULLUP',
      source,
    )
    sketch = await factory(pinMode, digitalWrite, digitalRead, analogRead, delay, millis, Serial, 1, 0, 'INPUT', 'OUTPUT', 'INPUT_PULLUP')
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Erreur de syntaxe dans le croquis.')
  }

  if (typeof sketch.setup !== 'function' || typeof sketch.loop !== 'function') {
    throw new Error('Le croquis doit définir les fonctions setup() et loop().')
  }

  try {
    await sketch.setup()
    while (!handlers.isStopped()) {
      await sketch.loop()
    }
  } catch (err) {
    if (err === HALT) return
    throw err instanceof Error ? err : new Error(String(err))
  }
}
