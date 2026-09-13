import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import BarChartIcon from '@mui/icons-material/BarChart';
import BiotechIcon from '@mui/icons-material/Biotech';
import CategoryIcon from '@mui/icons-material/Category';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import ScienceIcon from '@mui/icons-material/Science';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import axiosClient from '../axiosClient';
import { useStateContext } from '../Context/ContextProvider';
import { createAppTheme } from '../theme';
import StaffShell from './StaffShell';
import '../echo.js';

const titleFor = (pathname) => {
  const titles = [
    ['/admin/transaction-reports', 'Transaction reports'],
    ['/admin/transactions', 'Borrowing transactions'],
    ['/admin/equipment', 'Equipment & units'],
    ['/admin/category', 'Equipment categories'],
    ['/admin/inventory', 'Inventory reports'],
    ['/admin/users', 'User management'],
    ['/admin/logs', 'Activity logs'],
    ['/admin/lab', 'Laboratories'],
  ];

  return titles.find(([path]) => pathname.startsWith(path))?.[1] || 'Overview';
};

const navSections = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', to: '/admin', icon: <DashboardIcon fontSize="small" />, end: true },
      { label: 'Users', to: '/admin/users', icon: <PeopleIcon fontSize="small" /> },
      { label: 'Laboratories', to: '/admin/lab', icon: <ScienceIcon fontSize="small" /> },
      { label: 'Equipment', to: '/admin/equipment', icon: <BiotechIcon fontSize="small" /> },
      { label: 'Transactions', to: '/admin/transactions', icon: <SwapHorizIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Records & reports',
    items: [
      { label: 'Categories', to: '/admin/category', icon: <CategoryIcon fontSize="small" /> },
      { label: 'Inventory', to: '/admin/inventory', icon: <InventoryIcon fontSize="small" /> },
      { label: 'Transaction reports', to: '/admin/transaction-reports', icon: <BarChartIcon fontSize="small" /> },
      { label: 'Activity logs', to: '/admin/logs', icon: <DescriptionIcon fontSize="small" /> },
    ],
  },
];

export default function DefaultLayout() {
  const { user, token, setUser, setToken } = useStateContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const toggleTheme = useCallback(() => {
    setMode((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return next;
    });
  }, []);

  const onLogout = useCallback(async () => {
    try {
      await axiosClient.post('/logout');
    } finally {
      setUser(null);
      setToken(null);
      navigate('/auth', { replace: true });
    }
  }, [navigate, setToken, setUser]);

  useEffect(() => {
    if (!window.Echo || user?.role !== 'admin') return undefined;

    const channel = window.Echo.private('transactions.admin')
      .listen('.transaction.updated', (event) => {
        window.dispatchEvent(new CustomEvent('transactionUpdated', { detail: event }));
      });

    return () => {
      channel.stopListening('.transaction.updated');
      window.Echo.leave('transactions.admin');
    };
  }, [user?.role]);

  if (!token) return <Navigate to="/auth" replace />;

  return (
    <StaffShell
      mode={mode}
      navSections={navSections}
      onLogout={onLogout}
      roleLabel="Administrator"
      theme={theme}
      title={titleFor(location.pathname)}
      toggleTheme={toggleTheme}
      user={user}
    >
      <Outlet />
    </StaffShell>
  );
}
