import { createContext, useContext, useState } from 'react'

const ProductContext = createContext(null)

export function ProductProvider({ children }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState([])
  const [barcode, setBarcode] = useState(null)
  const [qrCode, setQrCode] = useState(null)

  function addPhotos(newPhotos) {
    setPhotos(prev => [...prev, ...newPhotos])
  }

  function removePhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  function clearAll() {
    setName('')
    setDescription('')
    setPhotos([])
    setBarcode(null)
    setQrCode(null)
  }

  return (
    <ProductContext.Provider value={{ name, setName, description, setDescription, photos, addPhotos, removePhoto, clearAll, barcode, setBarcode, qrCode, setQrCode }}>
      {children}
    </ProductContext.Provider>
  )
}

export function useProduct() {
  const ctx = useContext(ProductContext)
  if (!ctx) throw new Error('useProduct must be used within ProductProvider')
  return ctx
}
