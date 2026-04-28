import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProduct } from '../context/ProductContext'

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

export default function Camera() {
  const navigate = useNavigate()
  const { addPhotos } = useProduct()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [localPhotos, setLocalPhotos] = useState([])
  const [isDesktop, setIsDesktop] = useState(false)
  const [error, setError] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [captureMode, setCaptureMode] = useState(null) // 'imagecapture' | 'canvas'

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    const desktop = navigator.maxTouchPoints === 0
    setIsDesktop(desktop)

    let stream = null

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' },
          width: { ideal: 4096 },
          height: { ideal: 2160 },
        },
      })
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
      } catch (err) {
        setError('No se pudo acceder a la cámara: ' + (err.message || 'permiso denegado'))
        return
      }
    }

    streamRef.current = stream

    // Detect ImageCapture support once stream is ready
    const track = stream.getVideoTracks()[0]
    if (window.ImageCapture && track) {
      setCaptureMode('imagecapture')
    } else {
      setCaptureMode('canvas')
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => setCameraReady(true)
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => stopStream()
  }, [startCamera, stopStream])

  async function takePhoto() {
    if (!cameraReady || capturing) return
    setCapturing(true)

    try {
      // Strategy 1: ImageCapture API — captures at sensor resolution
      if (captureMode === 'imagecapture' && streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0]
        const imageCapture = new window.ImageCapture(track)

        try {
          const capabilities = await imageCapture.getPhotoCapabilities()
          const settings = {}
          if (capabilities.imageWidth?.max) settings.imageWidth = capabilities.imageWidth.max
          if (capabilities.imageHeight?.max) settings.imageHeight = capabilities.imageHeight.max

          const blob = await imageCapture.takePhoto(settings)
          const b64 = await blobToBase64(blob)
          setLocalPhotos(prev => [...prev, b64])
          return
        } catch {
          // ImageCapture failed — fall through to canvas
          setCaptureMode('canvas')
        }
      }

      // Strategy 2: Canvas fallback — WebP 0.95, then JPEG 0.95
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      const webp = canvas.toDataURL('image/webp', 0.95)
      // Some browsers return 'image/png' when WebP is unsupported
      const b64 = webp.startsWith('data:image/webp')
        ? webp
        : canvas.toDataURL('image/jpeg', 0.95)

      setLocalPhotos(prev => [...prev, b64])
    } finally {
      setCapturing(false)
    }
  }

  function handleDone() {
    if (localPhotos.length > 0) addPhotos(localPhotos)
    stopStream()
    navigate('/form')
  }

  function handleCancel() {
    stopStream()
    navigate('/form')
  }

  function removeLocalPhoto(index) {
    setLocalPhotos(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Cámara</h1>
        <span className="text-sm text-slate-400">
          {localPhotos.length} foto{localPhotos.length !== 1 ? 's' : ''}
        </span>
      </header>

      {/* Desktop warning */}
      {isDesktop && (
        <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm px-4 py-2 text-center">
          Esta función está diseñada para dispositivos móviles. Continuando con la cámara disponible.
        </div>
      )}

      {/* Capture mode badge */}
      {captureMode && (
        <div className={`text-xs px-4 py-1.5 text-center ${captureMode === 'imagecapture' ? 'bg-green-900/40 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
          {captureMode === 'imagecapture'
            ? 'Alta calidad — ImageCapture API (resolución nativa del sensor)'
            : 'Calidad alta — WebP 95% (resolución del stream)'}
        </div>
      )}

      {/* Error state */}
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="text-5xl">📵</div>
          <p className="text-red-400 font-medium">{error}</p>
          <p className="text-slate-400 text-sm">Asegúrate de conceder permisos de cámara y que el sitio use HTTPS.</p>
          <button
            onClick={handleCancel}
            className="mt-4 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl transition-colors"
          >
            Volver al formulario
          </button>
        </div>
      ) : (
        <>
          {/* Video stream */}
          <div className="relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[50vh] object-contain"
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-slate-400 animate-pulse">Iniciando cámara...</div>
              </div>
            )}
            {capturing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-white animate-pulse text-sm">Capturando...</div>
              </div>
            )}
          </div>

          {/* Capture button */}
          <div className="py-4 flex justify-center">
            <button
              onClick={takePhoto}
              disabled={!cameraReady || capturing}
              className="bg-white hover:bg-slate-100 disabled:bg-slate-600 disabled:cursor-not-allowed text-black font-bold w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-2xl active:scale-90 transition-all"
              aria-label="Tomar foto"
            >
              📷
            </button>
          </div>

          {/* Local photo gallery */}
          {localPhotos.length > 0 && (
            <div className="px-4 pb-4">
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                Fotos tomadas ({localPhotos.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {localPhotos.map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-800">
                    <img
                      src={photo}
                      alt={`Captura ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeLocalPhoto(i)}
                      className="absolute top-0.5 right-0.5 bg-red-600 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold leading-none"
                      aria-label={`Eliminar foto ${i + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom actions */}
          <div className="mt-auto px-4 pb-6 grid grid-cols-2 gap-3">
            <button
              onClick={handleCancel}
              className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-medium py-3 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleDone}
              className="bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white font-semibold py-3 rounded-xl transition-all"
            >
              Listo {localPhotos.length > 0 && `(${localPhotos.length})`}
            </button>
          </div>
        </>
      )}

      {/* Hidden canvas for fallback capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
