import { Delete, History, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BackToToolsLink } from '../../components/BackToToolsLink'

type AngleMode = 'DEG' | 'RAD'

interface HistoryEntry {
  expression: string
  result: string
}

// ---------------------------------------------------------------------------
// Évaluateur d'expressions maison (tokenizer + descente récursive).
// Jamais de eval() : seul ce qui est explicitement reconnu est calculé.
// Grammaire : expr -> term (('+'|'-') term)*
//             term -> factor (('*'|'/'|'%') factor)*
//             factor -> '-' factor | postfix ('^' factor)?   (puissance associative à droite)
//             postfix -> primary ('!')*
//             primary -> nombre | constante | fonction '(' expr ')' | '(' expr ')'
// ---------------------------------------------------------------------------

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'op'; op: string }

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (ch === ' ') {
      i++
      continue
    }
    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < input.length && /[0-9.]/.test(input[j])) j++
      const raw = input.slice(i, j)
      if ((raw.match(/\./g) ?? []).length > 1) throw new Error('Nombre invalide')
      tokens.push({ kind: 'num', value: parseFloat(raw) })
      i = j
      continue
    }
    if (/[a-zπ]/i.test(ch)) {
      let j = i
      while (j < input.length && /[a-zπ0-9]/i.test(input[j])) j++
      tokens.push({ kind: 'ident', name: input.slice(i, j).toLowerCase() })
      i = j
      continue
    }
    if ('+-*/^%()!'.includes(ch)) {
      tokens.push({ kind: 'op', op: ch })
      i++
      continue
    }
    throw new Error(`Caractère inconnu : ${ch}`)
  }
  return tokens
}

const CONSTANTS: Record<string, number> = { pi: Math.PI, 'π': Math.PI, e: Math.E }

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error('Factorielle : entier positif requis')
  if (n > 170) throw new Error('Factorielle trop grande')
  let result = 1
  for (let k = 2; k <= n; k++) result *= k
  return result
}

function evaluate(input: string, mode: AngleMode): number {
  const tokens = tokenize(input)
  let pos = 0

  const toRad = (x: number) => (mode === 'DEG' ? (x * Math.PI) / 180 : x)
  const fromRad = (x: number) => (mode === 'DEG' ? (x * 180) / Math.PI : x)

  const FUNCTIONS: Record<string, (x: number) => number> = {
    sin: (x) => Math.sin(toRad(x)),
    cos: (x) => Math.cos(toRad(x)),
    tan: (x) => Math.tan(toRad(x)),
    asin: (x) => fromRad(Math.asin(x)),
    acos: (x) => fromRad(Math.acos(x)),
    atan: (x) => fromRad(Math.atan(x)),
    ln: (x) => Math.log(x),
    log: (x) => Math.log10(x),
    sqrt: (x) => Math.sqrt(x),
    abs: (x) => Math.abs(x),
    exp: (x) => Math.exp(x),
  }

  function peek(): Token | undefined {
    return tokens[pos]
  }

  function eatOp(op: string): boolean {
    const t = peek()
    if (t && t.kind === 'op' && t.op === op) {
      pos++
      return true
    }
    return false
  }

  function parseExpr(): number {
    let value = parseTerm()
    for (;;) {
      if (eatOp('+')) value += parseTerm()
      else if (eatOp('-')) value -= parseTerm()
      else return value
    }
  }

  function parseTerm(): number {
    let value = parseFactor()
    for (;;) {
      if (eatOp('*')) value *= parseFactor()
      else if (eatOp('/')) {
        const d = parseFactor()
        if (d === 0) throw new Error('Division par zéro')
        value /= d
      } else if (eatOp('%')) {
        const d = parseFactor()
        if (d === 0) throw new Error('Modulo par zéro')
        value %= d
      } else return value
    }
  }

  function parseFactor(): number {
    // Le '-' unaire englobe toute la puissance : -3^2 = -(3^2) = -9,
    // conformément à la convention mathématique.
    if (eatOp('-')) return -parseFactor()
    const base = parsePostfix()
    if (eatOp('^')) return Math.pow(base, parseFactor())
    return base
  }

  function parsePostfix(): number {
    let value = parsePrimary()
    while (eatOp('!')) value = factorial(value)
    return value
  }

  function parsePrimary(): number {
    const t = peek()
    if (!t) throw new Error('Expression incomplète')
    if (t.kind === 'num') {
      pos++
      return t.value
    }
    if (t.kind === 'ident') {
      pos++
      if (t.name in CONSTANTS) return CONSTANTS[t.name]
      const fn = FUNCTIONS[t.name]
      if (!fn) throw new Error(`Fonction inconnue : ${t.name}`)
      if (!eatOp('(')) throw new Error(`Parenthèse attendue après ${t.name}`)
      const arg = parseExpr()
      if (!eatOp(')')) throw new Error('Parenthèse fermante manquante')
      return fn(arg)
    }
    if (t.kind === 'op' && t.op === '(') {
      pos++
      const value = parseExpr()
      if (!eatOp(')')) throw new Error('Parenthèse fermante manquante')
      return value
    }
    throw new Error(`Symbole inattendu : ${'op' in t ? t.op : '?'}`)
  }

  const result = parseExpr()
  if (pos < tokens.length) throw new Error('Expression invalide')
  if (!Number.isFinite(result)) throw new Error('Résultat non défini')
  return result
}

function formatResult(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value)
  const rounded = parseFloat(value.toPrecision(12))
  return String(rounded)
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

const BTN =
  'rounded-xl py-3 text-sm font-bold transition-all active:scale-95 select-none'
const BTN_NUM = `${BTN} bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700`
const BTN_OP = `${BTN} bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20 dark:hover:bg-sky-500/20`
const BTN_FN = `${BTN} bg-slate-100 text-slate-600 text-xs border border-slate-200 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700`
const BTN_EQ = `${BTN} bg-sky-600 text-white shadow-md hover:bg-sky-700`
const BTN_DANGER = `${BTN} bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20`

export function CalculatricePage() {
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<AngleMode>('DEG')
  const [memory, setMemory] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  function append(text: string) {
    setError(null)
    // Après un "=", un chiffre repart de zéro mais un opérateur enchaîne sur le résultat.
    if (result !== null) {
      if (/^[+\-*/^%!]/.test(text)) {
        setExpression(result + text)
      } else {
        setExpression(text)
      }
      setResult(null)
      return
    }
    setExpression((current) => current + text)
  }

  function clearAll() {
    setExpression('')
    setResult(null)
    setError(null)
  }

  function backspace() {
    setError(null)
    if (result !== null) {
      setResult(null)
      return
    }
    setExpression((current) => current.slice(0, -1))
  }

  function compute() {
    if (!expression.trim()) return
    try {
      const value = evaluate(expression, mode)
      const formatted = formatResult(value)
      setResult(formatted)
      setError(null)
      setHistory((current) => [{ expression, result: formatted }, ...current].slice(0, 30))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Expression invalide')
      setResult(null)
    }
  }

  // Support clavier
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (/^[0-9.+\-*/^%()!]$/.test(event.key)) {
        event.preventDefault()
        append(event.key)
      } else if (event.key === 'Enter' || event.key === '=') {
        event.preventDefault()
        compute()
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        backspace()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        clearAll()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const display = result ?? (expression || '0')

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <BackToToolsLink />

      <div className="flex flex-col gap-6 lg:flex-row">
      {/* --- Calculatrice --- */}
      <div className="flex-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        {/* Écran */}
        <div className="mb-4 rounded-2xl bg-slate-950 p-4 text-right">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMode((m) => (m === 'DEG' ? 'RAD' : 'DEG'))}
              className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-sky-400 hover:bg-slate-700"
              title="Basculer degrés / radians"
            >
              {mode}
            </button>
            <span className="text-[10px] font-semibold text-slate-500">
              {memory !== 0 ? `M = ${formatResult(memory)}` : ''}
            </span>
          </div>
          <div className="mt-1 min-h-5 truncate font-mono text-xs text-slate-500">
            {result !== null ? expression + ' =' : ' '}
          </div>
          <div className={`truncate font-mono text-3xl font-bold ${error ? 'text-red-400 text-lg' : 'text-white'}`}>
            {error ?? display}
          </div>
        </div>

        {/* Clavier scientifique */}
        <div className="grid grid-cols-5 gap-2">
          <button className={BTN_FN} onClick={() => setMemory(0)} title="Vider la mémoire">MC</button>
          <button className={BTN_FN} onClick={() => append(formatResult(memory))} title="Rappeler la mémoire">MR</button>
          <button className={BTN_FN} onClick={() => { const v = result ?? (expression ? (() => { try { return formatResult(evaluate(expression, mode)) } catch { return null } })() : null); if (v !== null) setMemory((m) => m + parseFloat(v)) }} title="Ajouter à la mémoire">M+</button>
          <button className={BTN_FN} onClick={() => { const v = result ?? (expression ? (() => { try { return formatResult(evaluate(expression, mode)) } catch { return null } })() : null); if (v !== null) setMemory((m) => m - parseFloat(v)) }} title="Soustraire de la mémoire">M−</button>
          <button className={BTN_DANGER} onClick={clearAll} title="Tout effacer (Échap)">C</button>

          <button className={BTN_FN} onClick={() => append('sin(')}>sin</button>
          <button className={BTN_FN} onClick={() => append('cos(')}>cos</button>
          <button className={BTN_FN} onClick={() => append('tan(')}>tan</button>
          <button className={BTN_FN} onClick={() => append('(')}>(</button>
          <button className={BTN_FN} onClick={() => append(')')}>)</button>

          <button className={BTN_FN} onClick={() => append('asin(')}>sin⁻¹</button>
          <button className={BTN_FN} onClick={() => append('acos(')}>cos⁻¹</button>
          <button className={BTN_FN} onClick={() => append('atan(')}>tan⁻¹</button>
          <button className={BTN_FN} onClick={() => append('π')}>π</button>
          <button className={BTN_FN} onClick={() => append('e')}>e</button>

          <button className={BTN_FN} onClick={() => append('ln(')}>ln</button>
          <button className={BTN_FN} onClick={() => append('log(')}>log</button>
          <button className={BTN_FN} onClick={() => append('sqrt(')}>√</button>
          <button className={BTN_FN} onClick={() => append('^2')}>x²</button>
          <button className={BTN_FN} onClick={() => append('^')}>xʸ</button>

          <button className={BTN_NUM} onClick={() => append('7')}>7</button>
          <button className={BTN_NUM} onClick={() => append('8')}>8</button>
          <button className={BTN_NUM} onClick={() => append('9')}>9</button>
          <button className={BTN_OP} onClick={() => append('/')}>÷</button>
          <button className={BTN_OP} onClick={backspace} title="Effacer (Retour arrière)">
            <Delete size={16} className="mx-auto" />
          </button>

          <button className={BTN_NUM} onClick={() => append('4')}>4</button>
          <button className={BTN_NUM} onClick={() => append('5')}>5</button>
          <button className={BTN_NUM} onClick={() => append('6')}>6</button>
          <button className={BTN_OP} onClick={() => append('*')}>×</button>
          <button className={BTN_OP} onClick={() => append('!')}>n!</button>

          <button className={BTN_NUM} onClick={() => append('1')}>1</button>
          <button className={BTN_NUM} onClick={() => append('2')}>2</button>
          <button className={BTN_NUM} onClick={() => append('3')}>3</button>
          <button className={BTN_OP} onClick={() => append('-')}>−</button>
          <button className={BTN_OP} onClick={() => append('%')}>mod</button>

          <button className={`${BTN_NUM} col-span-2`} onClick={() => append('0')}>0</button>
          <button className={BTN_NUM} onClick={() => append('.')}>.</button>
          <button className={BTN_OP} onClick={() => append('+')}>+</button>
          <button className={BTN_EQ} onClick={compute} title="Calculer (Entrée)">=</button>
        </div>

        <p className="mt-3 text-center text-[10px] text-slate-400 dark:text-slate-500">
          Le clavier physique fonctionne aussi : chiffres, opérateurs, Entrée (=), Retour arrière, Échap (C).
        </p>
      </div>

      {/* --- Historique --- */}
      <div className="w-full lg:w-72">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <History size={15} className="text-sky-500" />
              Historique
            </h2>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-500/10"
                title="Vider l'historique"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              Vos calculs apparaîtront ici.
            </p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {history.map((entry, index) => (
                <li key={index}>
                  <button
                    onClick={() => {
                      setExpression(entry.result)
                      setResult(null)
                      setError(null)
                    }}
                    className="w-full rounded-xl px-3 py-2 text-right hover:bg-slate-50 dark:hover:bg-slate-800"
                    title="Reprendre ce résultat"
                  >
                    <div className="truncate font-mono text-[11px] text-slate-400">{entry.expression} =</div>
                    <div className="truncate font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                      {entry.result}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
