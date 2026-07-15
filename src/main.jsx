import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App.jsx'
import { ToastProvider } from './context/ToastContext'
import { ModalProvider } from './context/ModalContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ModalProvider>
          <App />
        </ModalProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
