import { lazy, Suspense, type ComponentType, type Key } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from './Components/ProtectedRoute';
import type { UserRole } from './types/domain';

const Login = lazy(() => import('./views/login'));
const Register = lazy(() => import('./views/register'));
const ForgotPassword = lazy(() => import('./views/ForgotPassword'));
const ResetPassword = lazy(() => import('./views/ResetPassword'));
const VerifyEmail = lazy(() => import('./views/verifyEmail'));
const GuestLayout = lazy(() => import('./Components/GuestLayout'));
const DefaultLayout = lazy(() => import('./Components/DefaultLayout'));
const CustodianLayout = lazy(() => import('./Components/CustodianLayout'));
const UserLayout = lazy(() => import('./Components/UserLayout'));
const Users = lazy(() => import('./views/admin/users'));
const AdminDashboard = lazy(() => import('./views/admin/adminDashboard'));
const Laboratories = lazy(() => import('./views/admin/laboratories'));
const LaboratoryForm = lazy(() => import('./views/admin/LaboratoryForm'));
const LabInfo = lazy(() => import('./views/admin/labinfo'));
const Equipment = lazy(() => import('./views/admin/equipment'));
const Inventory = lazy(() => import('./views/admin/inventory'));
const EquipmentForm = lazy(() => import('./views/admin/equipmentForm'));
const Transaction = lazy(() => import('./views/admin/transaction'));
const TransactionReports = lazy(() => import('./views/admin/transactionReports'));
const Logs = lazy(() => import('./views/admin/logs'));
const EquipmentInfo = lazy(() => import('./views/admin/equipmentInfo'));
const ItemForm = lazy(() => import('./views/admin/ItemForm'));
const EquipmentCategory = lazy(() => import('./views/admin/category'));
const ItemHistoryWrapper = lazy(() => import('./views/ItemHistoryWrapper'));
const DailyInventorySnapshots = lazy(() => import('./views/admin/dailyInventorySnapshots'));
const CustodianDashboard = lazy(() => import('./views/custodian/CustodianDashboard'));
const Home = lazy(() => import('./views/Home'));
const UserLab = lazy(() => import('./views/UserLab'));
const Profile = lazy(() => import('./views/Profile'));
const BorrowHistory = lazy(() => import('./views/BorrowHistory'));
const About = lazy(() => import('./views/About'));
const NotAuthorized = lazy(() => import('./views/NotAuthorized'));
const NotFound = lazy(() => import('./views/NotFound'));

const screen = (Component: ComponentType, key?: Key) => (
  <Suspense fallback={<div className="route-loading" role="status">Loading…</div>}>
    <Component key={key} />
  </Suspense>
);

const protectedLayout = (roles: readonly UserRole[], Component: ComponentType) => (
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
