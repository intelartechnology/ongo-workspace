import 'react-toastify/dist/ReactToastify.css'
import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assistant from './pages/assistant/Assistant'
import PanneauHylana from './pages/assistant/PanneauHylana'
import { HylanaProvider } from './pages/assistant/HylanaContext'
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
import Carpoolers from './pages/Carpoolers';
import CarpoolHistory from './pages/CarpoolHistory';
import CarpoolRefunds from './pages/CarpoolRefunds';
import DriverBonuses from './pages/DriverBonuses';
import Boosts from './pages/Boosts';
import Transactions from './pages/Transactions';
import Moderation from './pages/Moderation';
import Settings from './pages/Settings';
import Annonces from './pages/Annonces';
import Merchants from './pages/Merchants';
import EatDashboard from './pages/EatDashboard';
import EatPayouts from './pages/EatPayouts';
import EatTreasury from './pages/EatTreasury';
import EatCouriers from './pages/EatCouriers';
import EatCourierDetail from './pages/EatCourierDetail';
import FinanceBalances from './pages/FinanceBalances';
import FinanceAccount from './pages/FinanceAccount';
import EatPromoCodes from './pages/EatPromoCodes';
import EatAudiences from './pages/EatAudiences';
import EatFilters from './pages/EatFilters';
import EatBanners from './pages/EatBanners';
import EatCampaigns from './pages/EatCampaigns';
import EatSponsorships from './pages/EatSponsorships';
import EatStores from './pages/EatStores';
import EatPaymentMethods from './pages/EatPaymentMethods';
import EatServiceAreas from './pages/EatServiceAreas';
import EatTags from './pages/EatTags';
import EatSections from './pages/EatSections';
import EatMosaic from './pages/EatMosaic';
import EatGallery from './pages/EatGallery';
import EatCategories from './pages/EatCategories';
import MerchantSpace from './pages/merchant/MerchantSpace';
import AddDriver from './pages/AddDriver'
import DriverDetail from './pages/DriverDetail'
import Partners from './pages/Partners'
import PartnerAdd from './pages/PartnerAdd'
import PartnerFleet from './pages/PartnerFleet'
import PartnerSpace from './pages/partner/PartnerSpace'
import TransportSpace from './pages/transport/TransportSpace'
import TransportOperators from './pages/TransportOperators'
import TransportPromoCodes from './pages/TransportPromoCodes'
import PartnersActivity from './pages/PartnersActivity'
import Rentals from './pages/rentals/Rentals'
import RentalDetail from './pages/rentals/RentalDetail'
import RentalVehicles from './pages/rentals/RentalVehicles'
import AddRentalVehicle from './pages/rentals/AddRentalVehicle'
import RentalCategories from './pages/rentals/RentalCategories'
import RentalAgencies from './pages/rentals/RentalAgencies'
import AddRentalCategory from './pages/rentals/AddRentalCategory'
import ContributorDashboard from './pages/contributor/Dashboard'
import ContributorRides from './pages/contributor/Rides'
import ContributorRideDetail from './pages/contributor/RideDetail'
import ContributorVehicles from './pages/contributor/Vehicles'
import ContributorVehicleDetail from './pages/contributor/VehicleDetail'
import ContributorVehicleReportPrintPage from './pages/contributor/VehicleReportPrintPage'
import ContributorPayments from './pages/contributor/Payments'
import ContributorCoursesPrintPage from './pages/contributor/ContributorCoursesPrintPage'
import Contributors from './pages/Contributors'
import ContributorAdd from './pages/ContributorAdd'
import ContributorDetails from './pages/ContributorDetails'
/** L'adresse où se tient un compte qui n'est pas administrateur, s'il en a une. */
const espaceHorsAdmin = (user: { role_id?: number | string; espace?: string | null } | null): string | null => {
  if (!user || Number(user.role_id) === 4) return null
  return user.espace && user.espace !== '/courses' ? user.espace : null
}

/*
 * Garde des routes connectées.
 *
 * Un marchand ou un propriétaire de flotte n'affiche jamais une page du
 * back-office : l'API lui en refusait les données, mais la page s'ouvrait —
 * menu d'administration compris. Il est renvoyé à son espace avant le
 * premier rendu. Les espaces eux-mêmes (`/merchant/…`, `/partner/…`) restent
 * ouverts, pour qu'il passe d'une enseigne à l'autre.
 */
const ProtectedRoute = ({ children, isAuthenticated }: { children: React.ReactNode, isAuthenticated: boolean }) => {
  const user = useSelector((state: RootState) => state.auth.user)
  const { pathname } = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const espace = espaceHorsAdmin(user)
  if (espace) {
    // La famille de son espace — `/merchant/`, `/partner/`, `/contributor/` —
    // pour qu'il circule d'un écran à l'autre de cet espace.
    const famille = `/${espace.split('/')[1]}/`
    if (!pathname.startsWith(famille)) {
      return <Navigate to={espace} replace />
    }
  }

  return <>{children}</>
}

/*
 * Les adresses de l'ancien espace partenaire, retire.
 *
 * `/partner/dashboard`, `/partner/courses`… menaient a des pages qui lisaient
 * des routes d'API sans authentification. Elles restent declarees pour qu'un
 * favori ne tombe pas sur `/partner/:partnerId` — « dashboard » y serait pris
 * pour un identifiant — et conduisent a l'espace du partenaire connecte, par
 * l'identifiant court que la connexion lui a rendu.
 */
const VersEspacePartenaire = ({ isAuthenticated, user }: { isAuthenticated: boolean, user: { partner_short_id?: string | null } | null }) => {
  if (isAuthenticated && user?.partner_short_id) {
    return <Navigate to={`/partner/${user.partner_short_id}`} replace />
  }
  // Une session ouverte avant l'identifiant court ne le connait pas :
  // se reconnecter le lui rend, par la page de connexion commune.
  return <Navigate to="/login" replace />
}

// Contributor Protected Route Component
// La connexion est commune (`/login`) : elle conduit un contributeur ici.
const ContributorProtectedRoute = ({ children, isAuthenticated, user }: { children: React.ReactNode, isAuthenticated: boolean, user: { contributor?: boolean } | null }) => {
  if (!isAuthenticated || !user?.contributor) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const partenaireConnecte = useSelector((state: RootState) => state.auth.user)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Seulement « light » ou « dark » : une autre valeur gardée par le navigateur
    // (« system », un reste d'une ancienne version) privait les graphiques de
    // leurs couleurs et faisait planter le tableau de bord.
    try {
      return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
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

  // Hylana n'existe que pour l'administration d'Ongo, pas pour les espaces partenaire ou marchand.
  const estAdmin = isAuthenticated && (Number((partenaireConnecte as any)?.role_id) === 4 || ['/courses', '/dashboard'].includes((partenaireConnecte as any)?.espace))

  return (
    <HylanaProvider actif={estAdmin}>
    <div className={`font-display min-h-screen w-full transition-colors duration-300 ${theme === 'dark' ? 'bg-background-dark' : 'bg-white'}`}>
      {/* Les notifications ont un seul conteneur, dans `main.tsx`. Un second ici
          les doublait : le X fermait celle du dessus, l'autre restait. */}
      <Routes>
        {/* On entre par les courses.
            C'est ce qu'on vient regarder en ouvrant le poste le matin : ce qui
            roule maintenant. Le tableau de bord reste a sa place, on y va quand
            on veut des totaux — pas l'inverse. */}
        {/* Déjà connecté : chacun retourne à son espace, pas au back-office. */}
        <Route path="/login" element={isAuthenticated ? <Navigate to={partenaireConnecte?.espace ?? '/courses'} replace /> : <Login onLogin={() => { }} />} />
        <Route
          path="/"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Navigate to="/courses" replace />
            </ProtectedRoute>
          }
        />
          <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Dashboard onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Assistant />
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
          path="/carpoolers"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Carpoolers onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/carpool"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <CarpoolHistory onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Transactions onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        {/*
          * L'espace marchand. Sans la barre latérale d'administration : un
          * restaurateur n'a rien à faire dans les écrans de flotte.
          */}
        <Route
          path="/merchant/:merchantId"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <MerchantSpace onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-payouts"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatPayouts onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-couriers"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatCouriers onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/debts"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <FinanceBalances key="debt" sens="debt" onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/credits"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <FinanceBalances key="credit" sens="credit" onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/accounts/:id"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <FinanceAccount onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-couriers/:id"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatCourierDetail onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-treasury"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatTreasury onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-promo-codes"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatPromoCodes onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-filters"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatFilters onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-audiences"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatAudiences onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-banners"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatBanners onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        {/* L'ancienne adresse mène à la nouvelle : un favori posé avant le
            renommage ouvrirait une page blanche. */}
        <Route path="/eat-reviews" element={<Navigate to="/eat-sponsorships" replace />} />
        <Route
          path="/eat-sponsorships"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatSponsorships onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        {/* L'ancienne adresse mène à la nouvelle : un favori posé avant le
            renommage ouvrirait une page blanche. */}
        <Route path="/eat-campaigns" element={<Navigate to="/eat-redirects" replace />} />
        <Route
          path="/eat-redirects"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatCampaigns onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-stores"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatStores onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-service-areas"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatServiceAreas onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-payment-methods"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatPaymentMethods onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-tags"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatTags onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-mosaic"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatMosaic onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-sections"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatSections onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-gallery"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatGallery onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat-categories"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatCategories onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eat"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EatDashboard onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchants"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Merchants onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/annonces"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Annonces onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Settings onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderation"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Moderation onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transport-promo-codes"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <TransportPromoCodes onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transport-operators"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <TransportOperators onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver-bonuses"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DriverBonuses onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/boosts"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Boosts onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/carpool-refunds"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <CarpoolRefunds onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
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
          path="/partners/activity"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PartnersActivity onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
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
        {/* La page d'un partenaire au back-office, par son identifiant public :
            `/partners/<short_id>`. L'ancienne adresse `/fleet` reste servie. */}
        <Route
          path="/partners/:id"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PartnerFleet onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
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
        <Route
          path="/contributors"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Contributors onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contributors/add"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ContributorAdd onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contributors/:id"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ContributorDetails onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
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
          path="/rental-agencies"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RentalAgencies onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
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
        {/* `/partner/login` n'est plus une page : la connexion est commune à
            tous (`/login`), et conduit chacun à son espace. L'adresse reste
            déclarée pour les liens déjà distribués — sans elle, « login »
            serait pris pour l'identifiant d'un partenaire. */}
        {['/partner/login', '/partner/dashboard', '/partner/courses', '/partner/courses/:id', '/partner/vehicles', '/partner/vehicles/:id', '/partner/vehicle-report/:id', '/partner/courses-report'].map((ancienne) => (
          <Route key={ancienne} path={ancienne} element={<VersEspacePartenaire isAuthenticated={isAuthenticated} user={partenaireConnecte} />} />
        ))}

        {/*
          * L'espace partenaire cadré par l'URL, sur le modèle de l'espace
          * marchand. Il est volontairement monté APRÈS les routes
          * `/partner/dashboard`, `/partner/courses` et `/partner/vehicles` :
          * React Router fait primer un segment littéral sur un segment
          * dynamique, donc les anciennes URL continuent de fonctionner et
          * rien ne casse pour les partenaires déjà en service.
          *
          * Le garde n'est que `ProtectedRoute` : l'identifiant étant dans
          * l'URL, seul le serveur peut dire si l'appelant a le droit d'ouvrir
          * CET espace. Restreindre ici à `is_partner` interdirait par ailleurs
          * à un admin d'entrer pour dépanner, ce qui est tout l'intérêt du
          * format.
          */}
        {/* L'ancienne connexion des partenaires, gardée en favori ou envoyée par
            message : sans elle, « login » était pris pour l'identifiant d'un
            espace partenaire, et la page restait blanche. */}
        <Route path="/partner/login" element={<Navigate to="/login" replace />} />
        <Route path="/partner" element={<Navigate to="/login" replace />} />

        <Route
          path="/partner/:partnerId/:section?/:sousId?"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PartnerSpace onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />

        {/*
          * L'espace d'un transporteur (bus, train), cadré par son identifiant
          * court comme ceux des marchands et des partenaires. Le serveur
          * décide de l'accès (`transport.member`).
          */}
        <Route
          path="/transport/:operatorId/:section?"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <TransportSpace onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        />

        {/* Contributor Flow Routes */}
        {/* Plus de page à part : la connexion est commune. L'adresse reste pour
            les liens déjà distribués. */}
        <Route path="/contributor/login" element={<Navigate to={isAuthenticated && partenaireConnecte?.contributor ? '/contributor/dashboard' : '/login'} replace />} />
        <Route
          path="/contributor/dashboard"
          element={
            <ContributorProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <ContributorDashboard onLogout={handleLogout} user={useSelector((state: RootState) => state.auth.user)} />
            </ContributorProtectedRoute>
          }
        />
        <Route
          path="/contributor/vehicles"
          element={
            <ContributorProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <ContributorVehicles onLogout={handleLogout} user={useSelector((state: RootState) => state.auth.user)} />
            </ContributorProtectedRoute>
          }
        />
        <Route
          path="/contributor/vehicles/:id"
          element={
            <ContributorProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <ContributorVehicleDetail onLogout={handleLogout} user={useSelector((state: RootState) => state.auth.user)} />
            </ContributorProtectedRoute>
          }
        />
        <Route
          path="/contributor/vehicle-report/:id"
          element={
            <ContributorProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <ContributorVehicleReportPrintPage />
            </ContributorProtectedRoute>
          }
        />
        <Route
          path="/contributor/rides"
          element={
            <ContributorProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <ContributorRides onLogout={handleLogout} user={useSelector((state: RootState) => state.auth.user)} />
            </ContributorProtectedRoute>
          }
        />
        <Route
          path="/contributor/rides/:id"
          element={
            <ContributorProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <ContributorRideDetail onLogout={handleLogout} user={useSelector((state: RootState) => state.auth.user)} />
            </ContributorProtectedRoute>
          }
        />
        <Route
          path="/contributor/rides-report"
          element={
            <ContributorProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <ContributorCoursesPrintPage user={useSelector((state: RootState) => state.auth.user)} />
            </ContributorProtectedRoute>
          }
        />
        <Route
          path="/contributor/payments"
          element={
            <ContributorProtectedRoute isAuthenticated={isAuthenticated} user={useSelector((state: RootState) => state.auth.user)}>
              <ContributorPayments onLogout={handleLogout} user={useSelector((state: RootState) => state.auth.user)} />
            </ContributorProtectedRoute>
          }
        />
      </Routes>
      {estAdmin && <PanneauHylana theme={theme} />}
    </div>
    </HylanaProvider>
  )
}

export default App
