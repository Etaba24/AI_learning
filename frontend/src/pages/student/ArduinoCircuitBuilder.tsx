import { Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import {
  ANALOG_PINS,
  DIGITAL_PINS,
  resolveCircuit,
  type CircuitData,
  type ComponentType,
  type PlacedComponent,
} from './arduinoCircuit'

interface ArduinoCircuitBuilderProps {
  circuit: CircuitData
  onChange: (circuit: CircuitData) => void
  readOnly: boolean
  activeDigitalPins: Record<number, 0 | 1>
  pressedButtonIds: Set<string>
  onButtonPress: (componentId: string, pressed: boolean) => void
  onPotChange: (componentId: string, value: number) => void
}

const VIEW_W = 900
const VIEW_H = 480
const ARDUINO_X = 40
const ARDUINO_W = 90

interface ArduinoTerminal {
  id: string
  label: string
  y: number
  isPin: boolean
}

function buildArduinoTerminals(): ArduinoTerminal[] {
  const order: { id: string; label: string; isPin: boolean }[] = [
    ...DIGITAL_PINS.slice()
      .reverse()
      .map((p) => ({ id: `arduino:D${p}`, label: `D${p}`, isPin: true })),
    { id: 'gap1', label: '', isPin: false },
    ...ANALOG_PINS.map((p) => ({ id: `arduino:A${p}`, label: `A${p}`, isPin: true })),
    { id: 'gap2', label: '', isPin: false },
    { id: 'arduino:5V', label: '5V', isPin: true },
    { id: 'arduino:GND', label: 'GND', isPin: true },
  ]
  const top = 24
  const bottom = VIEW_H - 24
  const step = (bottom - top) / (order.length - 1)
  return order.map((item, i) => ({ ...item, y: top + step * i }))
}

const ARDUINO_TERMINALS = buildArduinoTerminals()

const TERMINAL_OFFSETS: Record<ComponentType, Record<string, { dx: number; dy: number }>> = {
  led: { anode: { dx: -10, dy: 26 }, cathode: { dx: 10, dy: 26 } },
  buzzer: { plus: { dx: -14, dy: 24 }, minus: { dx: 14, dy: 24 } },
  button: { t1: { dx: -16, dy: 22 }, t2: { dx: 16, dy: 22 } },
  potentiometer: { gnd: { dx: -20, dy: 24 }, wiper: { dx: 0, dy: 28 }, vcc: { dx: 20, dy: 24 } },
}

const TERMINAL_LABELS: Record<ComponentType, Record<string, string>> = {
  led: { anode: 'A', cathode: 'K' },
  buzzer: { plus: '+', minus: '-' },
  button: { t1: '1', t2: '2' },
  potentiometer: { gnd: 'G', wiper: 'W', vcc: 'V' },
}

function getTerminalPos(id: string, components: PlacedComponent[]): { x: number; y: number } | null {
  if (id.startsWith('arduino:')) {
    const t = ARDUINO_TERMINALS.find((term) => term.id === id)
    return t ? { x: ARDUINO_X + ARDUINO_W, y: t.y } : null
  }
  const sep = id.indexOf(':')
  const compId = id.slice(0, sep)
  const terminal = id.slice(sep + 1)
  const comp = components.find((c) => c.id === compId)
  if (!comp) return null
  const offset = TERMINAL_OFFSETS[comp.type][terminal]
  if (!offset) return null
  return { x: comp.x + offset.dx, y: comp.y + offset.dy }
}

export default function ArduinoCircuitBuilder({
  circuit,
  onChange,
  readOnly,
  activeDigitalPins,
  pressedButtonIds,
  onButtonPress,
  onPotChange,
}: ArduinoCircuitBuilderProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [pendingFrom, setPendingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const rotateRef = useRef<{ id: string } | null>(null)

  const resolved = useMemo(() => resolveCircuit(circuit), [circuit])

  function toSvgPoint(evt: { clientX: number; clientY: number }): { x: number; y: number } {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = evt.clientX
    pt.y = evt.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  function addComponent(type: ComponentType) {
    const count = circuit.components.length
    const comp: PlacedComponent = {
      id: crypto.randomUUID(),
      type,
      x: 260 + (count % 4) * 130,
      y: 90 + Math.floor(count / 4) * 130,
      value: type === 'potentiometer' ? 0 : undefined,
    }
    onChange({ ...circuit, components: [...circuit.components, comp] })
  }

  function removeComponent(id: string) {
    onChange({
      components: circuit.components.filter((c) => c.id !== id),
      wires: circuit.wires.filter((w) => !w.from.startsWith(`${id}:`) && !w.to.startsWith(`${id}:`)),
    })
  }

  function removeWire(id: string) {
    onChange({ ...circuit, wires: circuit.wires.filter((w) => w.id !== id) })
  }

  function handleTerminalClick(terminalId: string) {
    if (readOnly) return
    if (!pendingFrom) {
      setPendingFrom(terminalId)
      return
    }
    if (pendingFrom === terminalId) {
      setPendingFrom(null)
      return
    }
    onChange({ ...circuit, wires: [...circuit.wires, { id: crypto.randomUUID(), from: pendingFrom, to: terminalId }] })
    setPendingFrom(null)
  }

  function handlePointerMove(evt: React.PointerEvent<SVGSVGElement>) {
    const p = toSvgPoint(evt)
    setMousePos(p)

    if (dragRef.current) {
      const { id, offsetX, offsetY } = dragRef.current
      onChange({
        ...circuit,
        components: circuit.components.map((c) => (c.id === id ? { ...c, x: p.x - offsetX, y: p.y - offsetY } : c)),
      })
    }

    if (rotateRef.current) {
      const comp = circuit.components.find((c) => c.id === rotateRef.current!.id)
      if (comp) {
        const angle = Math.atan2(p.y - comp.y, p.x - comp.x)
        const normalized = Math.min(1, Math.max(0, (angle + Math.PI) / (Math.PI * 2)))
        onPotChange(comp.id, Math.round(normalized * 1023))
      }
    }
  }

  function handlePointerUp() {
    dragRef.current = null
    rotateRef.current = null
  }

  function startDrag(evt: React.PointerEvent, comp: PlacedComponent) {
    if (readOnly) return
    evt.stopPropagation()
    const p = toSvgPoint(evt)
    dragRef.current = { id: comp.id, offsetX: p.x - comp.x, offsetY: p.y - comp.y }
  }

  const PALETTE: { type: ComponentType; label: string }[] = [
    { type: 'led', label: 'LED' },
    { type: 'buzzer', label: 'Buzzer' },
    { type: 'button', label: 'Bouton' },
    { type: 'potentiometer', label: 'Potentiomètre' },
  ]

  return (
    <div className="flex h-full flex-col gap-2">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Ajouter :</span>
          {PALETTE.map((item) => (
            <button
              key={item.type}
              onClick={() => addComponent(item.type)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-sky-400 hover:text-sky-600 dark:border-slate-700 dark:text-slate-300"
            >
              + {item.label}
            </button>
          ))}
          {pendingFrom && <span className="ml-auto text-[11px] font-semibold text-sky-600 dark:text-sky-400">Cliquez une seconde borne pour relier le fil…</span>}
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-full w-full touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={() => setPendingFrom(null)}
        >
          {/* CARTE ARDUINO */}
          <rect x={ARDUINO_X} y={10} width={ARDUINO_W} height={VIEW_H - 20} rx={8} fill="#0f6d9e" />
          <text x={ARDUINO_X + ARDUINO_W / 2} y={VIEW_H - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#e0f2fe">
            Arduino
          </text>
          {ARDUINO_TERMINALS.map((t) =>
            t.isPin ? (
              <g key={t.id} onClick={(e) => { e.stopPropagation(); handleTerminalClick(t.id) }} className="cursor-pointer">
                <text x={ARDUINO_X + ARDUINO_W - 8} y={t.y + 3} textAnchor="end" fontSize={9} fontWeight={700} fill="#e0f2fe">
                  {t.label}
                </text>
                <circle
                  cx={ARDUINO_X + ARDUINO_W}
                  cy={t.y}
                  r={6}
                  fill={pendingFrom === t.id ? '#facc15' : '#e2e8f0'}
                  stroke="#0f172a"
                  strokeWidth={1}
                />
              </g>
            ) : null,
          )}

          {/* FILS */}
          {circuit.wires.map((wire) => {
            const p1 = getTerminalPos(wire.from, circuit.components)
            const p2 = getTerminalPos(wire.to, circuit.components)
            if (!p1 || !p2) return null
            const midX = (p1.x + p2.x) / 2
            const midY = (p1.y + p2.y) / 2
            return (
              <g key={wire.id}>
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#38bdf8" strokeWidth={3} strokeLinecap="round" />
                {!readOnly && (
                  <g onClick={(e) => { e.stopPropagation(); removeWire(wire.id) }} className="cursor-pointer">
                    <circle cx={midX} cy={midY} r={7} fill="#ef4444" opacity={0.85} />
                    <text x={midX} y={midY + 3} textAnchor="middle" fontSize={9} fill="white" fontWeight={700}>
                      ×
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* FIL EN COURS DE TRACÉ */}
          {pendingFrom &&
            mousePos &&
            (() => {
              const p1 = getTerminalPos(pendingFrom, circuit.components)
              if (!p1) return null
              return <line x1={p1.x} y1={p1.y} x2={mousePos.x} y2={mousePos.y} stroke="#facc15" strokeWidth={2} strokeDasharray="6 4" />
            })()}

          {/* COMPOSANTS */}
          {circuit.components.map((comp) => {
            const pin = resolved.pinByComponentId.get(comp.id)
            const analogPin = resolved.analogPinByComponentId.get(comp.id)
            const isUnwired = resolved.unwiredComponentIds.includes(comp.id)
            const isOn = pin !== undefined && activeDigitalPins[pin] === 1
            const isPressed = pressedButtonIds.has(comp.id)

            return (
              <g key={comp.id} onPointerDown={(e) => startDrag(e, comp)} className={readOnly ? '' : 'cursor-move'}>
                {isUnwired && (
                  <circle cx={comp.x} cy={comp.y} r={30} fill="none" stroke="#f97316" strokeDasharray="3 3" strokeWidth={1.5} />
                )}

                {comp.type === 'led' && (
                  <circle
                    cx={comp.x}
                    cy={comp.y}
                    r={16}
                    fill={isOn ? '#fbbf24' : '#94a3b8'}
                    stroke="#334155"
                    strokeWidth={2}
                    style={isOn ? { filter: 'drop-shadow(0 0 8px #fbbf24)' } : undefined}
                  />
                )}
                {comp.type === 'buzzer' && (
                  <circle cx={comp.x} cy={comp.y} r={18} fill={isOn ? '#38bdf8' : '#1e293b'} stroke="#0f172a" strokeWidth={2} />
                )}
                {comp.type === 'button' && (
                  <>
                    <rect x={comp.x - 20} y={comp.y - 12} width={40} height={24} rx={4} fill="#1f2937" />
                    <circle
                      cx={comp.x}
                      cy={comp.y}
                      r={9}
                      fill={isPressed ? '#ef4444' : '#f87171'}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        onButtonPress(comp.id, true)
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation()
                        onButtonPress(comp.id, false)
                      }}
                      onPointerLeave={() => onButtonPress(comp.id, false)}
                      className="cursor-pointer"
                    />
                  </>
                )}
                {comp.type === 'potentiometer' && (
                  <>
                    <rect x={comp.x - 20} y={comp.y - 20} width={40} height={40} rx={6} fill="#334155" />
                    <g
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        if (!readOnly && analogPin === undefined) return
                        rotateRef.current = { id: comp.id }
                      }}
                      className="cursor-grab"
                    >
                      <circle cx={comp.x} cy={comp.y} r={13} fill="#e2e8f0" />
                      <line
                        x1={comp.x}
                        y1={comp.y}
                        x2={comp.x + 11 * Math.cos(((comp.value ?? 0) / 1023) * Math.PI * 2 - Math.PI)}
                        y2={comp.y + 11 * Math.sin(((comp.value ?? 0) / 1023) * Math.PI * 2 - Math.PI)}
                        stroke="#0f172a"
                        strokeWidth={2}
                      />
                    </g>
                  </>
                )}

                {/* Bornes */}
                {Object.entries(TERMINAL_OFFSETS[comp.type]).map(([terminal, offset]) => {
                  const tid = `${comp.id}:${terminal}`
                  return (
                    <g key={terminal} onClick={(e) => { e.stopPropagation(); handleTerminalClick(tid) }} className="cursor-pointer">
                      <circle
                        cx={comp.x + offset.dx}
                        cy={comp.y + offset.dy}
                        r={5}
                        fill={pendingFrom === tid ? '#facc15' : '#cbd5e1'}
                        stroke="#0f172a"
                      />
                      <text x={comp.x + offset.dx} y={comp.y + offset.dy + 14} textAnchor="middle" fontSize={8} fill="#64748b">
                        {TERMINAL_LABELS[comp.type][terminal]}
                      </text>
                    </g>
                  )
                })}

                {!readOnly && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation()
                      removeComponent(comp.id)
                    }}
                    className="cursor-pointer"
                  >
                    <circle cx={comp.x + 24} cy={comp.y - 24} r={8} fill="#ef4444" />
                    <text x={comp.x + 24} y={comp.y - 21} textAnchor="middle" fontSize={10} fill="white" fontWeight={700}>
                      ×
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {!readOnly && circuit.components.length === 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Trash2 size={12} />
          Ajoutez un composant, puis cliquez une borne du composant et une broche de l'Arduino pour tirer un fil.
        </p>
      )}
    </div>
  )
}
