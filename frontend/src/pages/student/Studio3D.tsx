import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls, TransformControls } from '@react-three/drei'
import { useRef, useState } from 'react'
import type { Mesh } from 'three'
import { Box, Circle, Cone, Cylinder, Donut, Move3D, Rotate3D, Scaling, Trash2 } from 'lucide-react'

export type PrimitiveType = 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus'

export interface SceneObject {
  id: string
  type: PrimitiveType
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}

type TransformMode = 'translate' | 'rotate' | 'scale'

const PRIMITIVES: Array<{ type: PrimitiveType; label: string; icon: typeof Box }> = [
  { type: 'cube', label: 'Cube', icon: Box },
  { type: 'sphere', label: 'Sphère', icon: Circle },
  { type: 'cylinder', label: 'Cylindre', icon: Cylinder },
  { type: 'cone', label: 'Cône', icon: Cone },
  { type: 'torus', label: 'Tore', icon: Donut },
]

const MODES: Array<{ mode: TransformMode; label: string; icon: typeof Move3D }> = [
  { mode: 'translate', label: 'Déplacer', icon: Move3D },
  { mode: 'rotate', label: 'Pivoter', icon: Rotate3D },
  { mode: 'scale', label: 'Redimensionner', icon: Scaling },
]

const PALETTE = ['#38bdf8', '#f97316', '#10b981', '#eab308', '#ef4444', '#a855f7', '#64748b', '#f8fafc']

function Primitive({ object, onSelect }: { object: SceneObject; onSelect: (mesh: Mesh, id: string) => void }) {
  const meshRef = useRef<Mesh>(null)
  return (
    <mesh
      ref={meshRef}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      onClick={(event) => {
        event.stopPropagation()
        if (meshRef.current) onSelect(meshRef.current, object.id)
      }}
    >
      {object.type === 'cube' && <boxGeometry args={[1, 1, 1]} />}
      {object.type === 'sphere' && <sphereGeometry args={[0.6, 32, 32]} />}
      {object.type === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1.2, 32]} />}
      {object.type === 'cone' && <coneGeometry args={[0.6, 1.2, 32]} />}
      {object.type === 'torus' && <torusGeometry args={[0.5, 0.2, 16, 48]} />}
      <meshStandardMaterial color={object.color} />
    </mesh>
  )
}

interface Studio3DProps {
  objects: SceneObject[]
  onChange: (objects: SceneObject[]) => void
  isDark: boolean
}

export default function Studio3D({ objects, onChange, isDark }: Studio3DProps) {
  const [mode, setMode] = useState<TransformMode>('translate')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedMesh, setSelectedMesh] = useState<Mesh | null>(null)

  const selected = objects.find((object) => object.id === selectedId) ?? null

  function addObject(type: PrimitiveType) {
    const created: SceneObject = {
      id: crypto.randomUUID(),
      type,
      // Légèrement décalé à chaque ajout pour ne pas empiler au même endroit
      position: [((objects.length % 5) - 2) * 1.5, 0.6, (Math.floor(objects.length / 5) % 5) * -1.5],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: PALETTE[objects.length % PALETTE.length],
    }
    onChange([...objects, created])
  }

  function deselect() {
    setSelectedId(null)
    setSelectedMesh(null)
  }

  // À la fin d'un glissé de gizmo : recopie la transformation du mesh
  // (mutée par three.js) dans l'état React, source de vérité de la sauvegarde.
  function commitTransform() {
    if (!selectedMesh || !selectedId) return
    onChange(
      objects.map((object) =>
        object.id === selectedId
          ? {
              ...object,
              position: selectedMesh.position.toArray() as [number, number, number],
              rotation: [selectedMesh.rotation.x, selectedMesh.rotation.y, selectedMesh.rotation.z],
              scale: selectedMesh.scale.toArray() as [number, number, number],
            }
          : object,
      ),
    )
  }

  function setColor(color: string) {
    if (!selectedId) return
    onChange(objects.map((object) => (object.id === selectedId ? { ...object, color } : object)))
  }

  function deleteSelected() {
    if (!selectedId) return
    const id = selectedId
    deselect()
    onChange(objects.filter((object) => object.id !== id))
  }

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [5, 4, 6], fov: 50 }}
        onPointerMissed={deselect}
        style={{ background: isDark ? '#0f172a' : '#f1f5f9' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 3]} intensity={1.2} />
        <Grid
          infiniteGrid
          cellSize={1}
          sectionSize={5}
          fadeDistance={35}
          cellColor={isDark ? '#334155' : '#cbd5e1'}
          sectionColor={isDark ? '#475569' : '#94a3b8'}
        />
        {objects.map((object) => (
          <Primitive
            key={object.id}
            object={object}
            onSelect={(mesh, id) => {
              setSelectedMesh(mesh)
              setSelectedId(id)
            }}
          />
        ))}
        {selectedMesh && (
          <TransformControls object={selectedMesh} mode={mode} onMouseUp={commitTransform} />
        )}
        <OrbitControls makeDefault />
      </Canvas>

      {/* Barre d'outils : ajout de primitives */}
      <div className="absolute left-3 top-3 flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        {PRIMITIVES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => addObject(type)}
            className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-sky-50 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-sky-500/10 dark:hover:text-sky-400"
            title={`Ajouter : ${label}`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Modes de transformation */}
      <div className="absolute right-3 top-3 flex gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        {MODES.map(({ mode: m, label, icon: Icon }) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-xl p-2 transition-colors ${
              mode === m
                ? 'bg-sky-600 text-white'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            title={label}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>

      {/* Propriétés de l'objet sélectionné */}
      {selected && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
          {PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => setColor(color)}
              className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                selected.color === color ? 'border-sky-500 scale-110' : 'border-white dark:border-slate-700'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={deleteSelected}
            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            title="Supprimer l'objet"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}

      {objects.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-2xl bg-white/80 px-4 py-2 text-xs font-semibold text-slate-500 backdrop-blur dark:bg-slate-900/80 dark:text-slate-400">
            Ajoutez une forme avec la barre d'outils à gauche, puis cliquez dessus pour la manipuler.
          </p>
        </div>
      )}
    </div>
  )
}
