import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import './styles/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#111',
            color: '#fff',
            border: '1px solid var(--color-primary)',
            fontFamily: 'Fira Code, monospace',
          },
        }} 
      />
      <App />
    </AuthProvider>
  </StrictMode>,
)
