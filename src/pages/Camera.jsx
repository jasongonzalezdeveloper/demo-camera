import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProduct } from '../context/ProductContext'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat } from '@zxing/library'

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

const FORMAT_NAMES = {
  [BarcodeFormat.QR_CODE]: 'QR Code',
  [BarcodeFormat.EAN_13]: 'EAN-13',
  [BarcodeFormat.EAN_8]: 'EAN-8',
  [BarcodeFormat.UPC_A]: 'UPC-A',
  [BarcodeFormat.UPC_E]: 'UPC-E',
  [BarcodeFormat.CODE_128]: 'Code 128',
  [BarcodeFormat.CODE_39]: 'Code 39',
  [BarcodeFormat.DATA_MATRIX]: 'Data Matrix',
  [BarcodeFormat.ITF]: 'ITF',
  [BarcodeFormat.CODABAR]: 'Codabar',
}

export default function Camera() {
  const navigate = useNavigate()
  const { addPhotos, setBarcode, setQrCode } = useProduct()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const scanControlsRef = useRef(null)

  const [localPhotos, setLocalPhotos] = useState([])
  const [isDesktop, setIsDesktop] = useState(false)
  const [error, setError] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [captureMode, setCaptureMode] = useState(null)

  const [mode, setMode] = useState('photo') // 'photo' | 'barcode' | 'qr'
  const [scanning, setScanning] = useState(false)
  const [detected, setDetected] = useState(null) // { value, formatName }
  const [scanKey, setScanKey] = useState(0)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  function stopScan() {
    if (scanControlsRef.current) {
      scanControlsRef.current.stop()
      scanControlsRef.current = null
    }
    setScanning(false)
  }

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

    const track = stream.getVideoTracks()[0]
    setCaptureMode(window.ImageCapture && track ? 'imagecapture' : 'canvas')

    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => setCameraReady(true)
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => stopStream()
  }, [startCamera, stopStream])

  // Scan loop — restarts when mode or scanKey changes
  useEffect(() => {
    if (!cameraReady || mode === 'photo') return

    setDetected(null)
    setScanning(true)

    const currentMode = mode
    let stopped = false
    const reader = new BrowserMultiFormatReader()

    reader
      .decodeFromVideoElement(videoRef.current, (result, _err, controls) => {
        if (stopped || !result) return

        const fmt = result.getBarcodeFormat()
        const isQR = fmt === BarcodeFormat.QR_CODE

        if (currentMode === 'qr' && !isQR) return
        if (currentMode === 'barcode' && isQR) return

        stopped = true
        controls.stop()
        scanControlsRef.current = null
        setScanning(false)

        if (navigator.vibrate) navigator.vibrate([100, 50, 100])
        setDetected({
          value: result.getText(),
          formatName: FORMAT_NAMES[fmt] ?? 'Código',
        })
      })
      .then(controls => {
        if (stopped) controls.stop()
        else scanControlsRef.current = controls
      })
      .catch(() => setScanning(false))

    return () => {
      stopped = true
      if (scanControlsRef.current) {
        scanControlsRef.current.stop()
        scanControlsRef.current = null
      }
      setScanning(false)
    }
  }, [mode, cameraReady, scanKey])

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

  function handleModeChange(newMode) {
    setDetected(null)
    setMode(newMode)
  }

  function handleDone() {
    if (localPhotos.length > 0) addPhotos(localPhotos)
    stopScan()
    stopStream()
    navigate('/form')
  }

  function handleCancel() {
    stopScan()
    stopStream()
    navigate('/form')
  }

  function handleAcceptScan() {
    if (!detected) return
    if (mode === 'barcode') setBarcode({ value: detected.value, format: detected.formatName })
    if (mode === 'qr') setQrCode({ value: detected.value })
    stopScan()
    stopStream()
    navigate('/form')
  }

  function handleRescan() {
    setDetected(null)
    setScanKey(k => k + 1)
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

      {/* Capture quality badge (photo mode only) */}
      {mode === 'photo' && captureMode && (
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
            {mode === 'photo' && capturing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-white animate-pulse text-sm">Capturando...</div>
              </div>
            )}
            {/* Scan targeting overlay */}
            {mode !== 'photo' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`border-2 rounded-lg transition-colors duration-300 ${
                    detected ? 'border-green-400' : 'border-white/60'
                  } ${mode === 'qr' ? 'w-52 h-52' : 'w-72 h-28'}`}
                />
              </div>
            )}
          </div>

          {/* Scan status / detected result */}
          {mode !== 'photo' && (
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
          )}

          {/* Photo capture button */}
          {mode === 'photo' && (
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
          )}

          {/* Local photo gallery */}
          {mode === 'photo' && localPhotos.length > 0 && (
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
            {mode === 'photo' ? (
              <>
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
              </>
            ) : detected ? (
              <>
                <button
                  onClick={handleRescan}
                  className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-medium py-3 rounded-xl transition-all"
                >
                  Escanear de nuevo
                </button>
                <button
                  onClick={handleAcceptScan}
                  className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-semibold py-3 rounded-xl transition-all"
                >
                  Aceptar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-medium py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled
                  className="bg-slate-800 text-slate-500 font-medium py-3 rounded-xl cursor-not-allowed"
                >
                  Buscando...
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
