import { useNavigate } from 'react-router-dom'
import { useProduct } from '../context/ProductContext'

export default function Result() {
  const navigate = useNavigate()
  const { name, description, photos, clearAll } = useProduct()

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

        {/* Photo grid */}
        {photos.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-3">Galería</p>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo, i) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden bg-slate-800">
                  <img
                    src={photo}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {photos.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <div className="text-4xl mb-2">🖼️</div>
            <p>Sin fotos adjuntas</p>
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
