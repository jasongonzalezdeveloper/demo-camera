import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex flex-col items-center justify-center px-6">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">📦</div>
        <h1 className="text-4xl font-bold text-white mb-2">Demo Camera</h1>
        <p className="text-indigo-300 text-lg">Registro de productos con fotos</p>
      </div>

      <button
        onClick={() => navigate('/form')}
        className="bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white font-semibold text-lg px-10 py-4 rounded-2xl shadow-lg shadow-indigo-900/50 transition-all duration-200"
      >
        + Agregar Producto
      </button>
    </div>
  )
}
