import Editor from '@monaco-editor/react'
import { Play, Square } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useTheme } from '../../theme/ThemeContext'
import ArduinoCircuitBuilder from './ArduinoCircuitBuilder'
import { resolveCircuit, type CircuitData } from './arduinoCircuit'
import { createBoardState, runSketch, type BoardState } from './arduinoRuntime'

interface ArduinoSimulatorProps {
  code: string
  onChange: (code: string) => void
  circuit: CircuitData
  onCircuitChange: (circuit: CircuitData) => void
}

// Le montage est construit librement par l'apprenant (voir
// ArduinoCircuitBuilder) : aucune broche n'est pré-assignée à un composant —
// tout dépend du câblage tiré sur le canevas.
export default function ArduinoSimulator({ code, onChange, circuit, onCircuitChange }: ArduinoSimulatorProps) {
  const { theme } = useTheme()
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [activeDigitalPins, setActiveDigitalPins] = useState<Record<number, 0 | 1>>({})
  const [pressedButtonIds, setPressedButtonIds] = useState<Set<string>>(new Set())
  const [log, setLog] = useState('')

  const resolved = useMemo(() => resolveCircuit(circuit), [circuit])

  const boardRef = useRef<BoardState>(createBoardState())
  const stoppedRef = useRef(true)
  const audioRef = useRef<{ ctx: AudioContext; osc: OscillatorNode } | null>(null)

  function startBuzzerSound() {
    if (audioRef.current) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      osc.frequency.value = 880
      osc.connect(ctx.destination)
      osc.start()
      audioRef.current = { ctx, osc }
    } catch {
      // Contexte audio indisponible (permissions navigateur) : la
      // simulation visuelle reste fonctionnelle sans le son.
    }
  }

  function stopBuzzerSound() {
    if (!audioRef.current) return
    audioRef.current.osc.stop()
    audioRef.current.ctx.close()
    audioRef.current = null
  }

  function handleDigitalWrite(pin: number, value: 0 | 1) {
    setActiveDigitalPins((prev) => ({ ...prev, [pin]: value }))
    if (resolved.buzzersByPin.has(pin)) {
      if (value === 1) startBuzzerSound()
      else stopBuzzerSound()
    }
  }

  function handleButtonPress(componentId: string, pressed: boolean) {
    setPressedButtonIds((prev) => {
      const next = new Set(prev)
      if (pressed) next.add(componentId)
      else next.delete(componentId)
      // Répercuté immédiatement sur la carte simulée, y compris en cours
      // d'exécution (l'apprenant doit pouvoir tester son montage en direct).
      resolved.buttonsByPin.forEach((ids, pin) => {
        boardRef.current.digitalPins[pin] = ids.some((id) => next.has(id)) ? 0 : 1
      })
      return next
    })
  }

  function handlePotChange(componentId: string, value: number) {
    onCircuitChange({
      ...circuit,
      components: circuit.components.map((c) => (c.id === componentId ? { ...c, value } : c)),
    })
    const pin = resolved.analogPinByComponentId.get(componentId)
    if (pin !== undefined) boardRef.current.analogValues[pin] = value
  }

  async function handleRun() {
    setRunError(null)
    setLog('')
    setActiveDigitalPins({})
    stopBuzzerSound()

    boardRef.current = createBoardState()
    resolved.buttonsByPin.forEach((ids, pin) => {
      boardRef.current.digitalPins[pin] = ids.some((id) => pressedButtonIds.has(id)) ? 0 : 1
    })
    resolved.potentiometersByAnalogPin.forEach((ids, pin) => {
      const comp = circuit.components.find((c) => ids.includes(c.id))
      boardRef.current.analogValues[pin] = comp?.value ?? 0
    })

    stoppedRef.current = false
    setIsRunning(true)

    try {
      await runSketch(code, boardRef.current, {
        onDigitalWrite: handleDigitalWrite,
        onLog: (line) => setLog((prev) => prev + line),
        isStopped: () => stoppedRef.current,
      })
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Erreur inattendue pendant la simulation.')
    } finally {
      setIsRunning(false)
      setActiveDigitalPins({})
      stopBuzzerSound()
    }
  }

  function handleStop() {
    stoppedRef.current = true
  }

  return (
    <div className="flex h-full flex-col gap-3 lg:flex-row">
      {/* ÉDITEUR */}
      <div className="flex min-h-[40vh] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Croquis (setup / loop)</span>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                onClick={handleStop}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                <Square size={13} fill="currentColor" />
                Arrêter
              </button>
            ) : (
              <button
                onClick={handleRun}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700"
              >
                <Play size={13} fill="currentColor" />
                Lancer
              </button>
            )}
          </div>
        </div>
        <div className="flex-1">
          <Editor
            language="javascript"
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            value={code}
            onChange={(value) => onChange(value ?? '')}
            options={{ minimap: { enabled: false }, fontSize: 13, automaticLayout: true }}
          />
        </div>
        {(runError || log) && (
          <div className="max-h-32 overflow-y-auto border-t border-slate-200 bg-slate-950 px-3 py-2 font-mono text-[11px] whitespace-pre-wrap text-slate-200 dark:border-slate-800">
            {runError ? <span className="text-rose-400">{runError}</span> : log || <span className="text-slate-500">Console (Serial.print)…</span>}
          </div>
        )}
      </div>

      {/* MONTAGE LIBRE SUR PLAQUE D'ESSAI */}
      <div className="flex w-full shrink-0 flex-col gap-2 lg:w-[480px]">
        <div className="h-80 overflow-hidden lg:h-full lg:min-h-[40vh]">
          <ArduinoCircuitBuilder
            circuit={circuit}
            onChange={onCircuitChange}
            readOnly={isRunning}
            activeDigitalPins={activeDigitalPins}
            pressedButtonIds={pressedButtonIds}
            onButtonPress={handleButtonPress}
            onPotChange={handlePotChange}
          />
        </div>
      </div>
    </div>
  )
}
