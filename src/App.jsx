import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import InstallPrompt from './components/InstallPrompt'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import UpdatePassword from './pages/UpdatePassword'
import Profile from './pages/Profile'
import PlayOnline from './pages/PlayOnline'
import OnlineGame from './pages/OnlineGame'
import AiGame from './pages/AiGame'
import Puzzle from './pages/Puzzle'

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/giris" element={<Login />} />
          <Route path="/kayit" element={<Signup />} />
          <Route path="/sifremi-unuttum" element={<ForgotPassword />} />
          <Route path="/sifre-guncelle" element={<UpdatePassword />} />
          <Route
            path="/profilim"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/oyna/online"
            element={
              <ProtectedRoute>
                <PlayOnline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/oyna/online/:gameId"
            element={
              <ProtectedRoute>
                <OnlineGame />
              </ProtectedRoute>
            }
          />
          <Route
            path="/oyna/yapay-zeka"
            element={
              <ProtectedRoute>
                <AiGame />
              </ProtectedRoute>
            }
          />
          <Route
            path="/puzzle"
            element={
              <ProtectedRoute>
                <Puzzle />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
      <InstallPrompt />
    </div>
  )
}
