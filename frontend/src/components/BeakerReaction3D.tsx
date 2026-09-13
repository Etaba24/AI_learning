import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useTheme } from '../theme/ThemeContext'

interface BeakerReaction3DProps {
  couleurDepart: string
  couleurResultat: string
  enReaction: boolean
  degageGaz: boolean
  formePrecipite: boolean
}

const NB_BULLES = 10
const NB_PARTICULES_PRECIPITE = 40

function Liquide({ couleurDepart, couleurResultat, enReaction }: Pick<BeakerReaction3DProps, 'couleurDepart' | 'couleurResultat' | 'enReaction'>) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const couleurCible = useMemo(
    () => new THREE.Color(enReaction ? couleurResultat : couleurDepart),
    [enReaction, couleurResultat, couleurDepart],
  )

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.color.lerp(couleurCible, Math.min(1, delta * 2))
    }
  })

  return (
    <mesh position={[0, -0.3, 0]}>
      <cylinderGeometry args={[1.35, 1.2, 1.6, 32]} />
      <meshStandardMaterial ref={materialRef} color={couleurDepart} transparent opacity={0.85} roughness={0.2} />
    </mesh>
  )
}

function Bulles({ actif }: { actif: boolean }) {
  const groupe = useRef<THREE.Group>(null)
  const decalages = useMemo(
    () =>
      Array.from({ length: NB_BULLES }, () => ({
        x: (Math.random() - 0.5) * 1.6,
        z: (Math.random() - 0.5) * 1.6,
        vitesse: 0.5 + Math.random() * 0.6,
        phase: Math.random() * 10,
        taille: 0.04 + Math.random() * 0.05,
      })),
    [],
  )

  useFrame((state) => {
    if (!groupe.current) return
    groupe.current.children.forEach((enfant, i) => {
      const info = decalages[i]
      const t = (state.clock.elapsedTime * info.vitesse + info.phase) % 2
      enfant.position.y = -1 + t * 1.6
      enfant.visible = actif
    })
  })

  return (
    <group ref={groupe}>
      {decalages.map((info, i) => (
        <mesh key={i} position={[info.x, -1, info.z]}>
          <sphereGeometry args={[info.taille, 8, 8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function Precipite({ actif }: { actif: boolean }) {
  const points = useMemo(
    () =>
      Array.from({ length: NB_PARTICULES_PRECIPITE }, () => {
        const angle = Math.random() * Math.PI * 2
        const rayon = Math.random() * 1.1
        return [Math.cos(angle) * rayon, -1.05 + Math.random() * 0.1, Math.sin(angle) * rayon] as [number, number, number]
      }),
    [],
  )

  if (!actif) return null

  return (
    <group>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      ))}
    </group>
  )
}

/** Bécher animé en 3D : couleur du liquide qui transitionne vers celle du
 * résultat, bulles si la réaction dégage un gaz, dépôt si elle forme un
 * précipité — piloté entièrement par les propriétés réelles de la réaction
 * choisie (jamais une animation générique déconnectée de la chimie). */
export function BeakerReaction3D({
  couleurDepart,
  couleurResultat,
  enReaction,
  degageGaz,
  formePrecipite,
}: BeakerReaction3DProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [showPrecipite, setShowPrecipite] = useState(false)

  useMemo(() => {
    if (enReaction && formePrecipite) {
      const timeout = setTimeout(() => setShowPrecipite(true), 600)
      return () => clearTimeout(timeout)
    }
    setShowPrecipite(false)
  }, [enReaction, formePrecipite])

  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [4, 2.5, 4], fov: 45 }} style={{ background: isDark ? '#0f172a' : '#f8fafc' }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 3]} intensity={1} />

        {/* Verre du bécher (contour, transparence légère) */}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[1.45, 1.3, 2, 32, 1, true]} />
          <meshStandardMaterial
            color={isDark ? '#334155' : '#cbd5e1'}
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
            roughness={0.1}
          />
        </mesh>

        <Liquide couleurDepart={couleurDepart} couleurResultat={couleurResultat} enReaction={enReaction} />
        <Bulles actif={enReaction && degageGaz} />
        <Precipite actif={showPrecipite} />

        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  )
}
