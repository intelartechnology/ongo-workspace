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
import DriverDetail from './pages/DriverDetail'
import Partners from './pages/Partners'
import PartnerAdd from './pages/PartnerAdd'
import PartnerFleet from './pages/PartnerFleet'
import PartnerLogin from './pages/partner/Login'
import PartnerDashboard from './pages/partner/Dashboard'
import PartnerCourses from './pages/partner/Courses'
import CourseDetail from './pages/partner/CourseDetail'
import PartnerVehicles from './pages/partner/Vehicles'
import Rentals from './pages/rentals/Rentals'
import RentalDetail from './pages/rentals/RentalDetail'
import RentalVehicles from './pages/rentals/RentalVehicles'
import AddRentalVehicle from './pages/rentals/AddRentalVehicle'
import RentalCategories from './pages/rentals/RentalCategories'
import AddRentalCategory from './pages/rentals/AddRentalCategory'
// Protected Route Component
const ProtectedRoute = ({ children, isAuthenticated }: { children: React.ReactNode, isAuthenticated: boolean }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

// Partner Protected Route Component
const PartnerProtectedRoute = ({ children, isAuthenticated, user }: { children: React.ReactNode, isAuthenticated: boolean, user: any }) => {
  if (!isAuthenticated) {
    return <Navigate to="/partner/login" replace />
  }
  if (!user?.is_partner) {
    return <Navigate to="/partner/login" replace />
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
          path="/vehicle-edit/:id"
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
        <Route
          path="/driver-detail/:id"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DriverDetail onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partners"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Partners onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partners/add"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PartnerAdd onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partners/:id/fleet"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PartnerFleet onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />

        {/* Admin Rental Management Routes */}
        <Route
          path="/rentals"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Rentals onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rentals/:id"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RentalDetail onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rental-vehicles"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RentalVehicles onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rental-vehicles/add"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AddRentalVehicle onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rental-vehicles/edit/:id"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AddRentalVehicle onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rental-categories"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RentalCategories onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rental-categories/add"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AddRentalCategory onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rental-categories/edit/:id"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AddRentalCategory onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />

        {/* Partner Flow Routes */}
        <Route path="/partner/login" element={isAuthenticated ? <Navigate to="/partner/dashboard" replace /> : <PartnerLogin />} />
        <Route
          path="/partner/dashboard"
          element={
            <PartnerProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <PartnerDashboard onLogout={handleLogout} user={useSelector((state: RootState) => state.auth.user)} />
            </PartnerProtectedRoute>
          }
        />
        <Route
          path="/partner/courses"
          element={
            <PartnerProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <PartnerCourses onLogout={handleLogout} user={useSelector((state: RootState) => state.auth.user)} />
            </PartnerProtectedRoute>
          }
        />
        <Route
          path="/partner/courses/:id"
          element={
            <PartnerProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <CourseDetail onLogout={handleLogout} user={useSelector((state: RootState) => state.auth.user)} />
            </PartnerProtectedRoute>
          }
        />
        <Route
          path="/partner/vehicles"
          element={
            <PartnerProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <PartnerVehicles onLogout={handleLogout} user={useSelector((state: RootState) => state.auth.user)} />
            </PartnerProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}

export default App
