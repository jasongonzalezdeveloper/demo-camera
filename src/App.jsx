import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ProductForm from './pages/ProductForm'
import Camera from './pages/Camera'
import Result from './pages/Result'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/form" element={<ProductForm />} />
        <Route path="/camera" element={<Camera />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </HashRouter>
  )
}
