import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { MousePointer2, Pentagon, Ruler, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet'

// Vite ne résout pas les chemins d'icônes par défaut de Leaflet (pensés pour
// un bundler classique servant `images/` à côté du CSS) — sans ce
// remplacement explicite, les marqueurs s'affichent comme des carrés cassés.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

type LatLng = [number, number]

export type CarteElement =
  | { id: string; type: 'marqueur'; label: string; position: LatLng }
  | { id: string; type: 'ligne'; label: string; points: LatLng[]; distanceKm: number }
  | { id: string; type: 'polygone'; label: string; points: LatLng[] }

interface CartographieCanvasProps {
  elements: CarteElement[]
  center: LatLng
  zoom: number
  onChange: (elements: CarteElement[]) => void
  onViewChange: (center: LatLng, zoom: number) => void
}

type Mode = 'marqueur' | 'ligne' | 'polygone' | null

// Distance orthodromique cumulée entre points consécutifs (Leaflet calcule
// déjà ça correctement en tenant compte de la courbure terrestre).
function distanceKmOf(points: LatLng[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += L.latLng(points[i - 1]).distanceTo(L.latLng(points[i]))
  }
  return Math.round((total / 1000) * 10) / 10
}

function MapClickHandler({
  mode,
  draftPoints,
  onAddPoint,
  onViewChange,
}: {
  mode: Mode
  draftPoints: LatLng[]
  onAddPoint: (point: LatLng) => void
  onViewChange: (center: LatLng, zoom: number) => void
}) {
  const map = useMapEvents({
    click(e) {
      if (mode) onAddPoint([e.latlng.lat, e.latlng.lng])
    },
    moveend() {
      const c = map.getCenter()
      onViewChange([c.lat, c.lng], map.getZoom())
    },
  })
  void draftPoints
  return null
}

export default function CartographieCanvas({ elements, center, zoom, onChange, onViewChange }: CartographieCanvasProps) {
  const [mode, setMode] = useState<Mode>(null)
  const [draftPoints, setDraftPoints] = useState<LatLng[]>([])

  function addElement(el: CarteElement) {
    onChange([...elements, el])
  }

  function handleAddPoint(point: LatLng) {
    if (mode === 'marqueur') {
      addElement({ id: crypto.randomUUID(), type: 'marqueur', label: `Repère ${elements.length + 1}`, position: point })
      setMode(null)
      return
    }
    setDraftPoints((prev) => [...prev, point])
  }

  function finishDraft() {
    if (mode === 'ligne' && draftPoints.length >= 2) {
      addElement({
        id: crypto.randomUUID(),
        type: 'ligne',
        label: `Mesure ${elements.filter((e) => e.type === 'ligne').length + 1}`,
        points: draftPoints,
        distanceKm: distanceKmOf(draftPoints),
      })
    } else if (mode === 'polygone' && draftPoints.length >= 3) {
      addElement({
        id: crypto.randomUUID(),
        type: 'polygone',
        label: `Zone ${elements.filter((e) => e.type === 'polygone').length + 1}`,
        points: draftPoints,
      })
    }
    setDraftPoints([])
    setMode(null)
  }

  function cancelDraft() {
    setDraftPoints([])
    setMode(null)
  }

  function removeElement(id: string) {
    onChange(elements.filter((e) => e.id !== id))
  }

  function selectMode(next: Exclude<Mode, null>) {
    setDraftPoints([])
    setMode((current) => (current === next ? null : next))
  }

  return (
    <div className="flex h-full w-full flex-col gap-3 lg:flex-row">
      {/* BARRE D'OUTILS */}
      <div className="flex shrink-0 flex-row gap-2 lg:w-56 lg:flex-col">
        <button
          onClick={() => selectMode('marqueur')}
          className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors lg:flex-none ${
            mode === 'marqueur'
              ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-300'
              : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          <MousePointer2 size={15} />
          Placer un repère
        </button>
        <button
          onClick={() => selectMode('ligne')}
          className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors lg:flex-none ${
            mode === 'ligne'
              ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-300'
              : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          <Ruler size={15} />
          Mesurer une distance
        </button>
        <button
          onClick={() => selectMode('polygone')}
          className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors lg:flex-none ${
            mode === 'polygone'
              ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-300'
              : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          <Pentagon size={15} />
          Tracer une zone
        </button>

        {(mode === 'ligne' || mode === 'polygone') && (
          <div className="flex flex-1 flex-col gap-1.5 rounded-xl border border-dashed border-slate-300 p-2.5 text-[11px] text-slate-500 lg:flex-none dark:border-slate-700 dark:text-slate-400">
            <p>{draftPoints.length} point{draftPoints.length > 1 ? 's' : ''} placé{draftPoints.length > 1 ? 's' : ''}</p>
            <div className="flex gap-1.5">
              <button
                onClick={finishDraft}
                disabled={mode === 'ligne' ? draftPoints.length < 2 : draftPoints.length < 3}
                className="flex-1 rounded-lg bg-sky-600 py-1 text-[11px] font-bold text-white disabled:opacity-40"
              >
                Terminer
              </button>
              <button onClick={cancelDraft} className="flex-1 rounded-lg border border-slate-300 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300">
                Annuler
              </button>
            </div>
          </div>
        )}

        {elements.length > 0 && (
          <div className="hidden max-h-64 flex-1 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2 lg:block dark:border-slate-800">
            {elements.map((el) => (
              <div key={el.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-700 dark:text-slate-300">
                  {el.label}
                  {el.type === 'ligne' && <span className="ml-1 font-normal text-slate-400">· {el.distanceKm} km</span>}
                </span>
                <button onClick={() => removeElement(el.id)} className="shrink-0 text-slate-300 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CARTE */}
      <div className="min-h-[50vh] flex-1 overflow-hidden rounded-2xl">
        <MapContainer center={center} zoom={zoom} scrollWheelZoom className="cartographie-map h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler mode={mode} draftPoints={draftPoints} onAddPoint={handleAddPoint} onViewChange={onViewChange} />

          {elements.map((el) => {
            if (el.type === 'marqueur') {
              return (
                <Marker key={el.id} position={el.position}>
                  <Popup>{el.label}</Popup>
                </Marker>
              )
            }
            if (el.type === 'ligne') {
              return (
                <Polyline key={el.id} positions={el.points} pathOptions={{ color: '#0284c7' }}>
                  <Popup>
                    {el.label} — {el.distanceKm} km
                  </Popup>
                </Polyline>
              )
            }
            return (
              <Polygon key={el.id} positions={el.points} pathOptions={{ color: '#7c3aed', fillOpacity: 0.15 }}>
                <Popup>{el.label}</Popup>
              </Polygon>
            )
          })}

          {draftPoints.length > 0 && mode === 'ligne' && <Polyline positions={draftPoints} pathOptions={{ color: '#0284c7', dashArray: '6 6' }} />}
          {draftPoints.length > 0 && mode === 'polygone' && <Polygon positions={draftPoints} pathOptions={{ color: '#7c3aed', dashArray: '6 6', fillOpacity: 0.1 }} />}
        </MapContainer>
      </div>
    </div>
  )
}
