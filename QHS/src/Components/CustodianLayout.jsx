import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import BiotechIcon from '@mui/icons-material/Biotech';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import InventoryIcon from '@mui/icons-material/Inventory';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import axiosClient from '../axiosClient';
import { useStateContext } from '../Context/ContextProvider';
import { createAppTheme } from '../theme';
import StaffShell from './StaffShell';
import '../echo.js';

const titleFor = (pathname) => {
  const titles = [
    ['/custodian/transaction-reports', 'Transaction reports'],
    ['/custodian/inventory-snapshots', 'Daily inventory snapshots'],
    ['/custodian/transactions', 'Borrowing transactions'],
    ['/custodian/equipment', 'Equipment & units'],
  ];
  return titles.find(([path]) => pathname.startsWith(path))?.[1] || 'Overview';
};

export default function CustodianLayout() {
  const { user, token, setUser, setToken } = useStateContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');
  const [laboratoryId, setLaboratoryId] = useState(null);
  const [labCheckComplete, setLabCheckComplete] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
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
    if (!user?.id) return undefined;
    let active = true;

    axiosClient.get('/laboratories', { params: { custodian_id: user.id } })
      .then(({ data }) => {
        if (!active) return;
        setLaboratoryId(data.data?.[0]?.id || null);
      })
      .catch(() => active && setLaboratoryId(null))
      .finally(() => active && setLabCheckComplete(true));

    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!laboratoryId) {
      setPendingNotifications([]);
      return undefined;
    }

    const refresh = () => {
      axiosClient.get('/transactions', { params: { per_page: 100 } })
        .then(({ data }) => {
          const rows = data.data || [];
          setPendingNotifications(rows.filter((item) => item.status === 'pending' && item.laboratory_id === laboratoryId));
        })
        .catch(() => setPendingNotifications([]));
    };

    refresh();
    window.addEventListener('transactionUpdated', refresh);
    const interval = window.setInterval(refresh, 10_000);

    if (window.Echo) {
      try {
        window.Echo.private(`transactions.lab.${laboratoryId}`)
          .listen('.transaction.updated', (event) => {
            refresh();
            window.dispatchEvent(new CustomEvent('transactionUpdated', { detail: event }));
          });
      } catch { /* Polling remains available. */ }
    }

    return () => {
      window.removeEventListener('transactionUpdated', refresh);
      window.clearInterval(interval);
      if (window.Echo) {
        try { window.Echo.leave(`transactions.lab.${laboratoryId}`); } catch { /* Already disconnected. */ }
      }
    };
  }, [laboratoryId]);

  const disabled = labCheckComplete && !laboratoryId;
  const navSections = useMemo(() => [
    {
      label: 'Laboratory',
      items: [
        { label: 'Overview', to: '/custodian', icon: <DashboardIcon fontSize="small" />, end: true },
        { label: 'Equipment', to: '/custodian/equipment', icon: <BiotechIcon fontSize="small" />, disabled },
        { label: 'Transactions', to: '/custodian/transactions', icon: <SwapHorizIcon fontSize="small" />, disabled },
      ],
    },
    {
      label: 'Reports',
      items: [
        { label: 'Transaction reports', to: '/custodian/transaction-reports', icon: <BarChartIcon fontSize="small" />, disabled },
        { label: 'Daily snapshots', to: '/custodian/inventory-snapshots', icon: <InventoryIcon fontSize="small" />, disabled },
      ],
    },
  ], [disabled]);

  if (!token) return <Navigate to="/auth" replace />;

  const notificationAction = (
    <>
      <Tooltip title="Pending requests">
        <IconButton aria-label={`${pendingNotifications.length} pending requests`} onClick={(event) => setNotificationAnchor(event.currentTarget)}>
          <Badge badgeContent={pendingNotifications.length} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={() => setNotificationAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Paper sx={{ width: 'min(380px, calc(100vw - 24px))', overflow: 'hidden' }}>
          <Box sx={{ px: 2.25, py: 1.8, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={750}>Pending requests</Typography>
                <Typography variant="caption" color="text.secondary">Requests awaiting your review</Typography>
              </Box>
              <Chip label={pendingNotifications.length} size="small" color="warning" />
            </Stack>
          </Box>

          {pendingNotifications.length === 0 ? (
            <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
              <HourglassTopIcon color="disabled" sx={{ fontSize: 34, mb: 1 }} />
              <Typography fontWeight={700}>You’re all caught up</Typography>
              <Typography variant="body2" color="text.secondary">There are no pending requests.</Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 390, overflowY: 'auto' }}>
              {pendingNotifications.map((request) => (
                <Box
                  component="button"
                  type="button"
                  key={request.id}
                  onClick={() => {
                    sessionStorage.setItem('highlightTransactionId', request.id);
                    setNotificationAnchor(null);
                    navigate('/custodian/transactions');
                  }}
                  sx={{
                    display: 'block',
                    width: '100%',
                    p: 2.25,
                    border: 0,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    textAlign: 'left',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack direction="row" spacing={1.4} alignItems="flex-start">
                    <Box sx={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 2, bgcolor: 'warning.main', color: 'warning.contrastText', flexShrink: 0 }}>
                      <HourglassTopIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={750}>Request #{request.id}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {request.borrower?.name || 'Unknown borrower'} · {request.equipment?.length || 0} item(s)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(request.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Box>
          )}

          {pendingNotifications.length > 0 && (
            <Box sx={{ p: 1.25, textAlign: 'center' }}>
              <Button onClick={() => { setNotificationAnchor(null); navigate('/custodian/transactions'); }}>
                View all transactions
              </Button>
            </Box>
          )}
        </Paper>
      </Popover>
    </>
  );

  return (
    <StaffShell
      extraActions={notificationAction}
      mode={mode}
      navSections={navSections}
      onLogout={onLogout}
      roleLabel="Laboratory custodian"
      theme={theme}
      title={titleFor(location.pathname)}
      toggleTheme={toggleTheme}
      user={user}
    >
      <Outlet />
    </StaffShell>
  );
}
