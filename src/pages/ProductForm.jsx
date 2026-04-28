import { useNavigate } from 'react-router-dom'
import { useProduct } from '../context/ProductContext'

export default function ProductForm() {
  const navigate = useNavigate()
  const { name, setName, description, setDescription, photos, removePhoto } = useProduct()

  function handleProcess() {
    if (!name.trim()) return
    navigate('/result')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 px-4 py-4 flex items-center gap-3 shadow">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Volver al inicio"
        >
          ←
        </button>
        <h1 className="text-xl font-semibold">Nuevo Producto</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Nombre <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Camiseta azul talla M"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Agrega detalles del producto..."
            rows={4}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>

        {/* Fotos adjuntas */}
        {photos.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">
              Fotos adjuntas ({photos.length})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-800">
                  <img
                    src={photo}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold leading-none shadow"
                    aria-label={`Eliminar foto ${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => navigate('/camera')}
            className="w-full bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <span>📷</span>
            <span>Capturar Imágenes{photos.length > 0 ? ` (${photos.length})` : ''}</span>
          </button>

          <button
            onClick={handleProcess}
            disabled={!name.trim()}
            className="w-full bg-indigo-500 hover:bg-indigo-400 active:scale-95 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"
          >
            Procesar
          </button>
        </div>
      </div>
    </div>
  )
}
