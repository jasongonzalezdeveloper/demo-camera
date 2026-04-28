import { createContext, useContext, useState } from 'react'

const ProductContext = createContext(null)

export function ProductProvider({ children }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState([])

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
  }

  return (
    <ProductContext.Provider value={{ name, setName, description, setDescription, photos, addPhotos, removePhoto, clearAll }}>
      {children}
    </ProductContext.Provider>
  )
}

export function useProduct() {
  const ctx = useContext(ProductContext)
  if (!ctx) throw new Error('useProduct must be used within ProductProvider')
  return ctx
}
