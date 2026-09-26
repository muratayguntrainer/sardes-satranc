import { useEffect, useState } from 'react'

const DISMISS_KEY = 'kaleMeydaniInstallDismissedAt'
const DISMISS_DAYS = 14

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // eski iOS Safari
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const days = (Date.now() - parseInt(raw, 10)) / (1000 * 60 * 60 * 24)
    return days < DISMISS_DAYS
  } catch {
    return false
  }
}

// Telefona "Ana Ekrana Ekle" ile kurulum için küçük, kapatılabilir bir bant.
// Android/Chrome'da tarayıcının kendi kurulum istemini (beforeinstallprompt)
// tetikler; iOS Safari bu olayı desteklemediği için orada elle nasıl
// yapılacağını anlatan bir ipucu gösterir.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return

    function handleBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    if (isIos()) setShowIosHint(true)

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* yok say */ }
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (dismissed || isStandalone() || wasDismissedRecently()) return null
  if (!deferredPrompt && !showIosHint) return null

  return (
    <div className="install-banner">
      <span>
        {deferredPrompt
          ? 'Sardes Satranç\'ı telefonuna uygulama gibi kurabilirsin.'
          : 'Sardes Satranç\'ı ana ekranına eklemek için paylaş düğmesine, sonra "Ana Ekrana Ekle"ye dokun.'}
      </span>
      <div className="install-banner-actions">
        {deferredPrompt && (
          <button className="primary-btn" onClick={install}>Kur</button>
        )}
        <button onClick={dismiss}>Kapat</button>
      </div>
    </div>
  )
}
