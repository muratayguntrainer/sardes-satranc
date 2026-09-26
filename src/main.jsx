import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

// PWA: sayfa yüklendikten sonra service worker'ı kaydet (yükleme hızını
// etkilememesi için). Desteklemeyen tarayıcılarda (ör. eski Safari) sessizce
// atlanır — uygulama service worker olmadan da normal şekilde çalışır.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Kayıt başarısız olsa bile uygulama normal web sitesi gibi çalışmaya devam eder.
    })
  })
}
