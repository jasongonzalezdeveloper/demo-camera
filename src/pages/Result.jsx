import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProduct } from '../context/ProductContext'

function analyzePhoto(base64) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const sampleSize = 200
      const canvas = document.createElement('canvas')
      canvas.width = sampleSize
      canvas.height = sampleSize
      const ctx = canvas.getContext('2d')

      const sx = Math.max(0, (img.width - sampleSize) / 2)
      const sy = Math.max(0, (img.height - sampleSize) / 2)
      const sw = Math.min(img.width, sampleSize)
      const sh = Math.min(img.height, sampleSize)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sampleSize, sampleSize)

      const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize)

      let lapSum = 0
      let lapSumSq = 0
      let count = 0
      for (let y = 1; y < sampleSize - 1; y++) {
        for (let x = 1; x < sampleSize - 1; x++) {
          const gray = (px, py) => {
            const i = (py * sampleSize + px) * 4
            return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          }
          const lap =
            -4 * gray(x, y) +
            gray(x - 1, y) +
            gray(x + 1, y) +
            gray(x, y - 1) +
            gray(x, y + 1)
          lapSum += lap
          lapSumSq += lap * lap
          count++
        }
      }
      const mean = lapSum / count
      const variance = lapSumSq / count - mean * mean

      const b64data = base64.split(',')[1] || base64
      const fileSizeBytes = Math.round(b64data.length * 0.75)
      const uncompressedBytes = img.width * img.height * 3
      const compressionRatio = uncompressedBytes / fileSizeBytes

      resolve({
        width: img.width,
        height: img.height,
        megapixels: ((img.width * img.height) / 1_000_000).toFixed(1),
        fileSizeKB: Math.round(fileSizeBytes / 1024),
        sharpness: Math.round(variance),
        compressionRatio: compressionRatio.toFixed(1),
      })
    }
    img.src = base64
  })
}

function sharpnessInfo(score) {
  if (score > 500) return { label: 'Excelente', color: 'text-green-400' }
  if (score > 150) return { label: 'Buena', color: 'text-emerald-400' }
  if (score > 40) return { label: 'Regular', color: 'text-amber-400' }
  return { label: 'Baja', color: 'text-red-400' }
}

export default function Result() {
  const navigate = useNavigate()
  const { name, description, photos, clearAll } = useProduct()
  const [photoMetrics, setPhotoMetrics] = useState([])

  useEffect(() => {
    if (!photos.length) return
    Promise.all(photos.map(analyzePhoto)).then(setPhotoMetrics)
  }, [photos])

  function handleBack() {
    clearAll()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 px-4 py-4 shadow">
        <h1 className="text-xl font-semibold text-center">Resultado</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Product info card */}
        <div className="bg-slate-800 rounded-2xl p-5 space-y-3">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Nombre</p>
            <p className="text-lg font-semibold">{name || '—'}</p>
          </div>
          {description && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Descripción</p>
              <p className="text-slate-200 whitespace-pre-wrap">{description}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Fotos</p>
            <p className="text-slate-200">{photos.length} foto{photos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Photo grid with quality metrics */}
        {photos.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-3">Galería</p>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo, i) => {
                const m = photoMetrics[i]
                const sharp = m ? sharpnessInfo(m.sharpness) : null
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="aspect-video rounded-xl overflow-hidden bg-slate-800">
                      <img
                        src={photo}
                        alt={`Foto ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {m ? (
                      <div className="px-0.5 space-y-0.5">
                        <p className="text-xs font-medium text-slate-200">
                          Foto {i + 1}: {m.width}×{m.height}
                        </p>
                        <p className="text-xs text-slate-400">
                          {m.megapixels} MP · {m.fileSizeKB} KB
                        </p>
                        <p className="text-xs">
                          <span className="text-slate-400">Nitidez: </span>
                          <span className={sharp.color}>{sharp.label}</span>
                        </p>
                        <p className="text-xs text-slate-400">
                          Compresión {m.compressionRatio}:1
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 px-0.5">Analizando…</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {photos.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <div className="text-4xl mb-2">🖼️</div>
            <p>Sin fotos adjuntas</p>
          </div>
        )}

        {/* Web vs native quality panel */}
        {photos.length > 0 && (
          <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-200">Calidad web vs. app nativa</p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center flex-shrink-0">1</span>
                <div>
                  <p className="text-sm text-slate-200">Resolución reducida</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    El navegador limita el stream de cámara. Un sensor de 12 MP puede entregar solo 2 MP vía web. Las apps nativas acceden al sensor completo.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center flex-shrink-0">2</span>
                <div>
                  <p className="text-sm text-slate-200">Compresión JPEG al 85%</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Esta demo usa <code className="text-slate-300">canvas.toDataURL('image/jpeg', 0.85)</code>. Las apps nativas suelen guardar en HEIC o JPEG de mayor calidad con menos artefactos de compresión.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center flex-shrink-0">3</span>
                <div>
                  <p className="text-sm text-slate-200">Sin procesamiento ISP</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Las apps nativas aplican HDR, reducción de ruido y corrección de color a nivel de hardware (ISP). La captura web recibe el frame crudo del stream de video.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={handleBack}
          className="w-full bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white font-semibold py-4 rounded-2xl transition-all"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
