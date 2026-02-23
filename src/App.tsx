import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Drivers from './pages/Drivers'
import { type RootState } from './store'
import { LOGOUT_ACTION } from './store/authReducers'
import './App.css'
import Rase from './pages/Rase'
import Vehicle from './pages/Vehicle'
import CourseDetailPage from './pages/CourseDetailPage'
import CoursePrintPage from './pages/CoursePrintPage'
import VehicleEditPage from './pages/VehicleEditPage'
import DriversRequest from './pages/DriversRequest'
import AddDriver from './pages/AddDriver'

// Protected Route Component
const ProtectedRoute = ({ children, isAuthenticated }: { children: React.ReactNode, isAuthenticated: boolean }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const handleLogout = () => {
    dispatch(LOGOUT_ACTION())
  }

  return (
    <div className={`font-display min-h-screen w-full transition-colors duration-300 ${theme === 'dark' ? 'bg-background-dark' : 'bg-white'}`}>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme={theme} />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={() => { }} />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Dashboard onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Users onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drivers"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Drivers onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Rase onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Vehicle onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/:id"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <CourseDetailPage onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route path="/courses/:id/print" element={<CoursePrintPage />} />
        <Route
          path="/vehicles/edit/:id"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <VehicleEditPage onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DriversRequest onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-driver"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AddDriver onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}

export default App
