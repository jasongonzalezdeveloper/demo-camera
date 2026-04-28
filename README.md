# Demo Camera — Registro de Productos con Fotos

Aplicación web progresiva para registrar productos con nombre, descripción y fotos capturadas directamente desde la cámara del dispositivo. Toda la información se gestiona en memoria, sin backend.

## Stack

- **React 18** + **Vite 5**
- **React Router v6** — navegación entre pantallas
- **Tailwind CSS v3** — estilos responsive mobile-first

## Funcionalidades

- Formulario de producto (nombre + descripción)
- Captura de múltiples fotos con la cámara trasera del celular
- Galería de fotos con opción de eliminar individualmente
- Pantalla de resultado con la información completa
- Diseño oscuro, pensado para móvil

## Correr localmente

```bash
npm install
npm run dev
```

La app estará disponible en `http://localhost:5173/demo-camera/`

Para probar la cámara desde el celular en la misma red:

```bash
npm run dev -- --host
```

Luego abrir la URL de red local que muestra Vite (`https://192.168.x.x:5173/demo-camera/`).

> **Nota:** El acceso a la cámara requiere HTTPS o localhost. GitHub Pages provee HTTPS automáticamente.

## Demo en GitHub Pages

> [https://TU_USUARIO.github.io/demo-camera/](https://TU_USUARIO.github.io/demo-camera/)

Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub.

## Deploy

El deploy a GitHub Pages se realiza automáticamente al hacer push a `main` mediante GitHub Actions.

Pasos para activar:
1. Subir el repositorio a GitHub con el nombre `demo-camera`
2. Ir a **Settings → Pages → Source** y seleccionar **GitHub Actions**
3. Hacer push a `main` y esperar que el workflow termine

## Estructura del proyecto

```
src/
  pages/
    Home.jsx         — pantalla inicial con botón "Agregar Producto"
    ProductForm.jsx  — formulario con nombre, descripción y fotos
    Camera.jsx       — captura de fotos con getUserMedia
    Result.jsx       — pantalla de resultado final
  context/
    ProductContext.jsx  — estado global compartido
  App.jsx            — rutas (HashRouter)
  main.jsx           — punto de entrada
```
