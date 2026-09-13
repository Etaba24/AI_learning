import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { styleElement3D } from '../data/elementStyle3D'
import { useTheme } from '../theme/ThemeContext'

export interface AtomeMolecule {
  element: string
  x: number
  y: number
  z: number
}

export interface LiaisonMolecule {
  a: number
  b: number
  ordre: number
}

interface MoleculeViewer3DProps {
  atomes: AtomeMolecule[]
  liaisons: LiaisonMolecule[]
}

const RAYON_LIAISON = 0.12
// Décalage entre liaisons parallèles d'une double/triple liaison, pour
// qu'elles restent visuellement distinctes plutôt que superposées.
const ECART_LIAISON_MULTIPLE = 0.16

function AtomeMesh({ atome, centre }: { atome: AtomeMolecule; centre: THREE.Vector3 }) {
  const style = styleElement3D(atome.element)
  const position = useMemo(
    () => new THREE.Vector3(atome.x, atome.y, atome.z).sub(centre),
    [atome.x, atome.y, atome.z, centre],
  )

  return (
    <mesh position={position}>
      <sphereGeometry args={[style.rayon, 24, 24]} />
      <meshStandardMaterial color={style.couleur} roughness={0.4} metalness={0.1} />
    </mesh>
  )
}

function LiaisonMesh({ depart, arrivee, ordre }: { depart: THREE.Vector3; arrivee: THREE.Vector3; ordre: number }) {
  // Un "bâtonnet" par liaison, éventuellement dupliqué en parallèle pour
  // une double/triple liaison (jusqu'à 3, une valeur d'ordre plus élevée
  // ou invalide — ex: liaison aromatique codée différemment — retombe sur
  // un simple bâtonnet plutôt que de planter).
  const nbBatons = ordre >= 2 && ordre <= 3 ? ordre : 1

  const milieu = useMemo(() => depart.clone().add(arrivee).multiplyScalar(0.5), [depart, arrivee])
  const direction = useMemo(() => arrivee.clone().sub(depart), [depart, arrivee])
  const longueur = direction.length()
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())
    return q
  }, [direction])

  // Décalage perpendiculaire à la liaison pour espacer les bâtonnets d'une
  // liaison multiple.
  const perpendiculaire = useMemo(() => {
    const arbitraire = Math.abs(direction.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    return new THREE.Vector3().crossVectors(direction, arbitraire).normalize()
  }, [direction])

  const offsets =
    nbBatons === 1
      ? [0]
      : nbBatons === 2
        ? [-ECART_LIAISON_MULTIPLE / 2, ECART_LIAISON_MULTIPLE / 2]
        : [-ECART_LIAISON_MULTIPLE, 0, ECART_LIAISON_MULTIPLE]

  return (
    <>
      {offsets.map((offset, i) => (
        <mesh
          key={i}
          position={milieu.clone().add(perpendiculaire.clone().multiplyScalar(offset))}
          quaternion={quaternion}
        >
          <cylinderGeometry args={[RAYON_LIAISON, RAYON_LIAISON, longueur, 12]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.5} />
        </mesh>
      ))}
    </>
  )
}

/** Rendu 3D ball-and-stick d'une molécule à partir d'atomes/liaisons réels
 * (jamais générés côté client — toujours issus d'une structure PubChem
 * récupérée côté serveur, voir ChimiePage). */
export function MoleculeViewer3D({ atomes, liaisons }: MoleculeViewer3DProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const centre = useMemo(() => {
    if (atomes.length === 0) return new THREE.Vector3()
    const somme = atomes.reduce(
      (acc, a) => acc.add(new THREE.Vector3(a.x, a.y, a.z)),
      new THREE.Vector3(),
    )
    return somme.divideScalar(atomes.length)
  }, [atomes])

  const positions = useMemo(
    () => atomes.map((a) => new THREE.Vector3(a.x, a.y, a.z).sub(centre)),
    [atomes, centre],
  )

  // Distance de la caméra proportionnelle à l'étendue réelle de la
  // molécule — une petite molécule (eau) et une grande (caféine) ont
  // besoin d'un recul très différent pour tenir dans le cadre.
  const rayonScene = useMemo(() => {
    let max = 3
    positions.forEach((p) => {
      max = Math.max(max, p.length())
    })
    return max
  }, [positions])

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [rayonScene * 1.8, rayonScene * 1.4, rayonScene * 1.8], fov: 45 }}
        style={{ background: isDark ? '#0f172a' : '#f8fafc' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 8, 3]} intensity={1.1} />
        <directionalLight position={[-5, -3, -4]} intensity={0.4} />

        {atomes.map((atome, i) => (
          <AtomeMesh key={i} atome={atome} centre={centre} />
        ))}
        {liaisons.map((liaison, i) => {
          const depart = positions[liaison.a]
          const arrivee = positions[liaison.b]
          if (!depart || !arrivee) return null
          return <LiaisonMesh key={i} depart={depart} arrivee={arrivee} ordre={liaison.ordre} />
        })}

        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  )
}
