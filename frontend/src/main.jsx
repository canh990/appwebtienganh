import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './styles/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <Toaster 
          position="top-right" 
          toastOptions={{
            className: 'custom-toast',
          }} 
        />
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
