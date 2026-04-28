import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProduct } from '../context/ProductContext'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
]

const QR_FORMATS = [Html5QrcodeSupportedFormats.QR_CODE]

const FORMAT_LABELS = {
  QR_CODE: 'QR Code',
  EAN_13: 'EAN-13',
  EAN_8: 'EAN-8',
  UPC_A: 'UPC-A',
  UPC_E: 'UPC-E',
  CODE_128: 'Code 128',
  CODE_39: 'Code 39',
  CODE_93: 'Code 93',
  DATA_MATRIX: 'Data Matrix',
  ITF: 'ITF',
  CODABAR: 'Codabar',
}

export default function Camera() {
  const navigate = useNavigate()
  const { addPhotos, setBarcode, setQrCode } = useProduct()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const html5QrRef = useRef(null)

  const [localPhotos, setLocalPhotos] = useState([])
  const [isDesktop, setIsDesktop] = useState(false)
  const [error, setError] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [captureMode, setCaptureMode] = useState(null)

  const [mode, setMode] = useState('photo') // 'photo' | 'barcode' | 'qr'
  const [scanning, setScanning] = useState(false)
  const [detected, setDetected] = useState(null) // { value, formatName }

  // ── Photo stream ──────────────────────────────────────────────────────────

  function stopPhotoStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }

  async function startPhotoCamera() {
    const desktop = navigator.maxTouchPoints === 0
    setIsDesktop(desktop)
    setError(null)
    setCameraReady(false)

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
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      } catch (err) {
        setError('No se pudo acceder a la cámara: ' + (err.message || 'permiso denegado'))
        return
      }
    }

    streamRef.current = stream
    const track = stream.getVideoTracks()[0]
    setCaptureMode(window.ImageCapture && track ? 'imagecapture' : 'canvas')

    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => setCameraReady(true)
    }
  }

  // ── Scanner ───────────────────────────────────────────────────────────────

  function stopScanner() {
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {})
      html5QrRef.current.clear()
      html5QrRef.current = null
    }
    setScanning(false)
  }

  async function startScanner(currentMode) {
    setError(null)
    setDetected(null)
    setScanning(true)

    const formats = currentMode === 'qr' ? QR_FORMATS : BARCODE_FORMATS
    let scanner
    try {
      scanner = new Html5Qrcode('html5qr-scanner', {
        formatsToSupport: formats,
        verbose: false,
      })

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: currentMode === 'qr'
            ? { width: 220, height: 220 }
            : { width: 280, height: 110 },
          aspectRatio: 1.7778,
        },
        (text, result) => {
          const rawName = result?.result?.format?.formatName ?? ''
          const formatName = FORMAT_LABELS[rawName] ?? (currentMode === 'qr' ? 'QR Code' : 'Código')
          if (navigator.vibrate) navigator.vibrate([100, 50, 100])
          setDetected({ value: text, formatName })
          setScanning(false)
          scanner.stop().catch(() => {})
          html5QrRef.current = null
        },
        () => {}, // per-frame errors son normales cuando no hay código en cuadro
      )

      html5QrRef.current = scanner
    } catch (err) {
      setScanning(false)
      setError('No se pudo iniciar el escáner: ' + (err?.message ?? String(err)))
    }
  }

  // ── Lifecycle: switch camera based on mode ────────────────────────────────

  useEffect(() => {
    if (mode === 'photo') {
      startPhotoCamera()
      return () => stopPhotoStream()
    } else {
      stopPhotoStream()
      startScanner(mode)
      return () => stopScanner()
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Photo capture ─────────────────────────────────────────────────────────

  async function takePhoto() {
    if (!cameraReady || capturing) return
    setCapturing(true)

    try {
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
          setCaptureMode('canvas')
        }
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      const webp = canvas.toDataURL('image/webp', 0.95)
      const b64 = webp.startsWith('data:image/webp')
        ? webp
        : canvas.toDataURL('image/jpeg', 0.95)

      setLocalPhotos(prev => [...prev, b64])
    } finally {
      setCapturing(false)
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleModeChange(newMode) {
    setDetected(null)
    setMode(newMode)
  }

  function handleDone() {
    if (localPhotos.length > 0) addPhotos(localPhotos)
    stopPhotoStream()
    navigate('/form')
  }

  function handleCancel() {
    stopScanner()
    stopPhotoStream()
    navigate('/form')
  }

  function handleAcceptScan() {
    if (!detected) return
    if (mode === 'barcode') setBarcode({ value: detected.value, format: detected.formatName })
    if (mode === 'qr') setQrCode({ value: detected.value })
    stopScanner()
    navigate('/form')
  }

  function handleRescan() {
    setDetected(null)
    setScanning(true)
    // Restart scanner by stopping current instance and creating a new one
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {})
      html5QrRef.current.clear()
      html5QrRef.current = null
    }
    startScanner(mode)
  }

  function removeLocalPhoto(index) {
    setLocalPhotos(prev => prev.filter((_, i) => i !== index))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Cámara</h1>
        <span className="text-sm text-slate-400">
          {mode === 'photo'
            ? `${localPhotos.length} foto${localPhotos.length !== 1 ? 's' : ''}`
            : mode === 'barcode' ? 'Código de barras' : 'QR Code'}
        </span>
      </header>

      {/* Mode tabs */}
      <div className="bg-slate-900 px-4 pb-3 flex gap-2">
        {[
          { id: 'photo', label: 'Foto' },
          { id: 'barcode', label: 'Código de barras' },
          { id: 'qr', label: 'QR Code' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleModeChange(tab.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === tab.id
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Desktop warning */}
      {isDesktop && (
        <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm px-4 py-2 text-center">
          Esta función está diseñada para dispositivos móviles. Continuando con la cámara disponible.
        </div>
      )}

      {/* Quality badge (photo mode) */}
      {mode === 'photo' && captureMode && (
        <div className={`text-xs px-4 py-1.5 text-center ${captureMode === 'imagecapture' ? 'bg-green-900/40 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
          {captureMode === 'imagecapture'
            ? 'Alta calidad — ImageCapture API (resolución nativa del sensor)'
            : 'Calidad alta — WebP 95% (resolución del stream)'}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 bg-red-900/40 border border-red-500/40 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Photo mode ── */}
      {mode === 'photo' && (
        <>
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

          {localPhotos.length > 0 && (
            <div className="px-4 pb-4">
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                Fotos tomadas ({localPhotos.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {localPhotos.map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-800">
                    <img src={photo} alt={`Captura ${i + 1}`} className="w-full h-full object-cover" />
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

          <div className="mt-auto px-4 pb-6 grid grid-cols-2 gap-3">
            <button onClick={handleCancel} className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-medium py-3 rounded-xl transition-all">
              Cancelar
            </button>
            <button onClick={handleDone} className="bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white font-semibold py-3 rounded-xl transition-all">
              Listo {localPhotos.length > 0 && `(${localPhotos.length})`}
            </button>
          </div>
        </>
      )}

      {/* ── Scan mode ── */}
      {mode !== 'photo' && (
        <>
          {/* html5-qrcode mounts its video inside this div */}
          <div id="html5qr-scanner" className="w-full" />

          {/* Status / result */}
          <div className="px-4 pt-3">
            {!detected ? (
              <p className="text-center text-sm text-slate-400 animate-pulse">
                {scanning
                  ? `Apunta al ${mode === 'qr' ? 'código QR' : 'código de barras'}...`
                  : 'Iniciando escáner...'}
              </p>
            ) : (
              <div className="bg-green-900/40 border border-green-500/40 rounded-xl p-3">
                <p className="text-xs text-green-400 uppercase tracking-wider mb-1">
                  {detected.formatName} detectado
                </p>
                <p className="text-sm font-mono text-white break-all">{detected.value}</p>
              </div>
            )}
          </div>

          <div className="mt-auto px-4 pb-6 grid grid-cols-2 gap-3">
            {detected ? (
              <>
                <button onClick={handleRescan} className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-medium py-3 rounded-xl transition-all">
                  Escanear de nuevo
                </button>
                <button onClick={handleAcceptScan} className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-semibold py-3 rounded-xl transition-all">
                  Aceptar
                </button>
              </>
            ) : (
              <>
                <button onClick={handleCancel} className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-medium py-3 rounded-xl transition-all">
                  Cancelar
                </button>
                <button disabled className="bg-slate-800 text-slate-500 font-medium py-3 rounded-xl cursor-not-allowed">
                  Buscando...
                </button>
              </>
            )}
          </div>
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
