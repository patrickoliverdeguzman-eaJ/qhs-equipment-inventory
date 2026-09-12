import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from './Components/ProtectedRoute.jsx';

const Login = lazy(() => import('./views/login.jsx'));
const Register = lazy(() => import('./views/register.jsx'));
const ForgotPassword = lazy(() => import('./views/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./views/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('./views/verifyEmail.jsx'));
const GuestLayout = lazy(() => import('./Components/GuestLayout.jsx'));
const DefaultLayout = lazy(() => import('./Components/DefaultLayout.jsx'));
const CustodianLayout = lazy(() => import('./Components/CustodianLayout.jsx'));
const UserLayout = lazy(() => import('./Components/UserLayout.jsx'));
const Users = lazy(() => import('./views/admin/users.jsx'));
const AdminDashboard = lazy(() => import('./views/admin/adminDashboard.jsx'));
const Laboratories = lazy(() => import('./views/admin/laboratories.jsx'));
const LaboratoryForm = lazy(() => import('./views/admin/LaboratoryForm.jsx'));
const LabInfo = lazy(() => import('./views/admin/labinfo.jsx'));
const Equipment = lazy(() => import('./views/admin/equipment.jsx'));
const Inventory = lazy(() => import('./views/admin/inventory.jsx'));
const EquipmentForm = lazy(() => import('./views/admin/equipmentForm.jsx'));
const Transaction = lazy(() => import('./views/admin/transaction.jsx'));
const TransactionReports = lazy(() => import('./views/admin/transactionReports.jsx'));
const Logs = lazy(() => import('./views/admin/logs.jsx'));
const EquipmentInfo = lazy(() => import('./views/admin/equipmentInfo.jsx'));
const ItemForm = lazy(() => import('./views/admin/ItemForm.jsx'));
const EquipmentCategory = lazy(() => import('./views/admin/category.jsx'));
const ItemHistoryWrapper = lazy(() => import('./views/ItemHistoryWrapper.jsx'));
const DailyInventorySnapshots = lazy(() => import('./views/admin/dailyInventorySnapshots.jsx'));
const CustodianDashboard = lazy(() => import('./views/custodian/CustodianDashboard.jsx'));
const Home = lazy(() => import('./views/Home.jsx'));
const UserLab = lazy(() => import('./views/UserLab.jsx'));
const Profile = lazy(() => import('./views/Profile.jsx'));
const BorrowHistory = lazy(() => import('./views/BorrowHistory.jsx'));
const About = lazy(() => import('./views/About.jsx'));
const NotAuthorized = lazy(() => import('./views/NotAuthorized.jsx'));
const NotFound = lazy(() => import('./views/NotFound.jsx'));

const screen = (Component, key) => (
  <Suspense fallback={<div className="route-loading" role="status">Loading…</div>}>
    <Component key={key} />
  </Suspense>
);

const protectedLayout = (roles, Component) => (
  <ProtectedRoute allowedRoles={roles}>{screen(Component)}</ProtectedRoute>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: protectedLayout(['user'], UserLayout),
    children: [
      { index: true, element: screen(Home) },
      { path: 'laboratories', element: screen(UserLab) },
      { path: 'profile', element: screen(Profile) },
      { path: 'borrow-history', element: screen(BorrowHistory) },
      { path: 'about', element: screen(About) },
    ],
  },
  { path: '/not-authorized', element: screen(NotAuthorized) },
  {
    path: '/item-history/:unitID',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'custodian']}>
        {screen(ItemHistoryWrapper)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: protectedLayout(['admin'], DefaultLayout),
    children: [
      { index: true, element: screen(AdminDashboard) },
      { path: 'users', element: screen(Users) },
      { path: 'lab', element: screen(Laboratories) },
      { path: 'lab/new', element: screen(LaboratoryForm, 'laboratoryCreate') },
      { path: 'lab/:id', element: screen(LaboratoryForm, 'laboratoryUpdate') },
      { path: 'lab/:name/:id', element: screen(LabInfo, 'infoUpdate') },
      { path: 'equipment', element: screen(Equipment) },
      { path: 'equipment/new', element: screen(EquipmentForm, 'equipmentCreate') },
      { path: 'equipment/:id', element: screen(EquipmentForm, 'equipmentUpdate') },
      { path: 'equipment/info/:id', element: screen(EquipmentInfo, 'equipmentInfo') },
      { path: 'equipment/info/:equipmentID/add-item', element: screen(ItemForm, 'itemCreate') },
      { path: 'equipment/info/:equipmentID/edit-item/:id', element: screen(ItemForm, 'itemUpdate') },
      { path: 'transactions', element: screen(Transaction) },
      { path: 'transaction-reports', element: screen(TransactionReports) },
      { path: 'logs', element: screen(Logs) },
      { path: 'inventory', element: screen(Inventory) },
      { path: 'category', element: screen(EquipmentCategory) },
    ],
  },
  {
    path: '/custodian',
    element: protectedLayout(['custodian'], CustodianLayout),
    children: [
      { index: true, element: screen(CustodianDashboard) },
      { path: 'equipment', element: screen(Equipment) },
      { path: 'equipment/:id', element: screen(EquipmentForm, 'equipmentUpdate') },
      { path: 'equipment/info/:id', element: screen(EquipmentInfo, 'equipmentInfo') },
      { path: 'equipment/info/:equipmentID/add-item', element: screen(ItemForm, 'itemCreate') },
      { path: 'equipment/info/:equipmentID/edit-item/:id', element: screen(ItemForm, 'itemUpdate') },
      { path: 'transactions', element: screen(Transaction) },
      { path: 'transaction-reports', element: screen(TransactionReports) },
      { path: 'inventory-snapshots', element: screen(DailyInventorySnapshots) },
    ],
  },
  {
    element: screen(GuestLayout),
    children: [
      { path: '/auth', element: screen(Login) },
      { path: '/auth/register', element: screen(Register) },
      { path: '/auth/verify-email', element: screen(VerifyEmail) },
      { path: '/forgot-password', element: screen(ForgotPassword) },
      { path: '/reset-password', element: screen(ResetPassword) },
      { path: '/verify-email', element: screen(VerifyEmail) },
    ],
  },
  { path: '*', element: screen(NotFound) },
]);

export default router;
