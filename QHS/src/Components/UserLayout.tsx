import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert, AppBar, Avatar, Badge, Box, Button, Card, CardContent, Chip, Container,
  Divider, Drawer, IconButton, ListItemIcon, Menu, MenuItem, Paper, Popover,
  Stack, Toolbar, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryIcon from '@mui/icons-material/History';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import axiosClient, { assetUrl } from '../axiosClient';
import { useStateContext } from '../Context/ContextProvider';
import { getInitials } from '../utils';
import qhsMark from '../assets/qhs-mark.svg';
import type { Laboratory } from '../types/domain';

interface CartItem {
  id: number;
  name: string;
  laboratory_id: number;
  quantity: number;
  available_count?: number;
  image?: string | null;
}

interface TransactionNotification {
  id: number;
  status?: string;
  created_at?: string;
  accepted_at?: string | null;
  approved_at?: string | null;
  issued_at?: string | null;
  updated_at?: string | null;
  returned_at?: string | null;
  rejected_at?: string | null;
  accepted_by_name?: string | null;
  approved_by_name?: string | null;
  issued_by_name?: string | null;
  returned_by_name?: string | null;
  rejected_by_name?: string | null;
  laboratory?: Pick<Laboratory, 'name'> | null;
  equipment?: unknown[];
  lifecycle_stage?: string;
  is_overdue?: boolean;
  returned_count?: number;
  issued_count?: number;
}

type NotificationTone = 'warning' | 'info' | 'success' | 'error';

const pages = [
  { name: 'Home', link: '/' },
  { name: 'Equipment', link: '/laboratories' },
  { name: 'About', link: '/about' },
];

const formatWhen = (value?: string | null) => value
  ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  : '';

export default function UserLayout() {
  const { user, token, setUser, setToken } = useStateContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorElNav, setAnchorElNav] = useState<HTMLElement | null>(null);
  const [anchorElUser, setAnchorElUser] = useState<HTMLElement | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('equipment_cart') || '[]') as CartItem[]; }
    catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [notifications, setNotifications] = useState<TransactionNotification[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<TransactionNotification[]>([]);
  const [notificationAnchor, setNotificationAnchor] = useState<HTMLElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('seen_notification_ids') || '[]') as string[]); }
    catch { return new Set<string>(); }
  });

  useEffect(() => {
    if (!user?.id) return undefined;

    const refreshNotifications = () => {
      axiosClient.get<{ data?: TransactionNotification[] } | TransactionNotification[]>('/transactions')
        .then(({ data }) => {
          const rows = Array.isArray(data) ? data : data.data || [];
          const pending = rows.filter((item) => item.status?.toLowerCase() === 'pending');
          const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
          const updates = rows.filter((item) => {
            const status = item.status?.toLowerCase();
            if (status === 'approved' && (item.approved_at || item.accepted_at)) return new Date(item.approved_at || item.accepted_at || 0) > sevenDaysAgo;
            if (status === 'borrowed' && (item.updated_at || item.issued_at)) return new Date(item.updated_at || item.issued_at || 0) > sevenDaysAgo;
            if (status === 'returned' && item.returned_at) return new Date(item.returned_at) > sevenDaysAgo;
            if (status === 'rejected' && item.rejected_at) return new Date(item.rejected_at) > sevenDaysAgo;
            return false;
          });
          setPendingRequests(pending.length);
          setNotifications(pending);
          setRecentUpdates(updates);
        })
        .catch(() => {
          setPendingRequests(0);
          setNotifications([]);
          setRecentUpdates([]);
        });
    };

    axiosClient.get<{ data: Laboratory[] }>('/laboratories')
      .then(({ data }) => setLaboratories(data.data || []))
      .catch(() => setLaboratories([]));

    refreshNotifications();
    const handleCartUpdate = (event: Event) => setCart((event as CustomEvent<CartItem[]>).detail);
    const handleTransactionUpdate = () => refreshNotifications();
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('transactionUpdated', handleTransactionUpdate);
    const requestInterval = window.setInterval(refreshNotifications, 10_000);

    const echo = window.Echo;
    if (echo) {
      try {
        echo.private(`transactions.user.${user.id}`)
          .listen('.transaction.updated', (event: unknown) => {
            refreshNotifications();
            window.dispatchEvent(new CustomEvent('transactionUpdated', { detail: event }));
          });
      } catch { /* Polling remains available. */ }
    }

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('transactionUpdated', handleTransactionUpdate);
      window.clearInterval(requestInterval);
      if (echo) {
        try { echo.leave(`transactions.user.${user.id}`); } catch { /* Already disconnected. */ }
      }
    };
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem('equipment_cart', JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
  }, [cart]);

  const cartByLab = useMemo(() => cart.reduce<Record<string, CartItem[]>>((groups, item) => {
    const key = String(item.laboratory_id);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {}), [cart]);

  if (!token) return <Navigate to="/auth" replace />;

  const getLabName = (labId: string) => laboratories.find((lab) => lab.id === Number(labId))?.name || 'Unknown laboratory';
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const unseenCount = [
    ...notifications.map((item) => `p-${item.id}`),
    ...recentUpdates.map((item) => `u-${item.id}`),
  ].filter((id) => !seenIds.has(id)).length;

  const onLogout = async () => {
    try { await axiosClient.post('/logout'); }
    finally {
      setUser(null);
      setToken(null);
      navigate('/auth', { replace: true });
    }
  };

  const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
    const allIds = [
      ...notifications.map((item) => `p-${item.id}`),
      ...recentUpdates.map((item) => `u-${item.id}`),
    ];
    if (allIds.length) {
      const updated = new Set([...seenIds, ...allIds]);
      setSeenIds(updated);
      localStorage.setItem('seen_notification_ids', JSON.stringify([...updated]));
    }
  };

  const handleRemoveFromCart = (equipmentId: number) => {
    setCart((current) => current.filter((item) => item.id !== equipmentId));
  };

  const handleUpdateQuantity = (equipmentId: number, nextQuantity: number) => {
    const selected = cart.find((item) => item.id === equipmentId);
    const available = selected?.available_count || 999;
    if (nextQuantity > available) {
      alert(`Only ${available} unit(s) are available for this equipment.`);
      return;
    }
    if (nextQuantity <= 0) handleRemoveFromCart(equipmentId);
    else setCart((current) => current.map((item) => item.id === equipmentId ? { ...item, quantity: nextQuantity } : item));
  };

  const handleProceedToRequest = async () => {
    if (submitting) return;
    if (!user?.address?.trim()) {
      alert('Add your address to your profile before submitting a request.');
      setCartOpen(false);
      navigate('/profile');
      return;
    }

    const requests = Object.entries(cartByLab).map(([labId, items]) => ({
      borrower_id: user.id,
      borrower_name: user.name,
      borrower_email: user.email,
      borrower_contact: user.phone_number,
      laboratory_id: Number(labId),
      borrow_date: new Date().toISOString().split('T')[0],
      return_date: null,
      notes: null,
      equipment: items.map((item) => ({ equipment_id: item.id, quantity: item.quantity })),
    }));

    setSubmitting(true);
    try {
      for (const request of requests) await axiosClient.post('/transactions', request);
      setCart([]);
      setCartOpen(false);
      window.dispatchEvent(new CustomEvent('transactionUpdated'));
      alert('Your equipment request was submitted.');
    } catch (error: unknown) {
      const message = typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      alert(message || 'The request could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const goToHistory = () => {
    setNotificationAnchor(null);
    navigate('/borrow-history');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        color="inherit"
        sx={{
          bgcolor: 'rgba(255,255,255,.88)',
          backdropFilter: 'blur(18px) saturate(140%)',
          boxShadow: '0 1px 0 rgba(24,33,43,.02)',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: { xs: 68, md: 78 }, gap: { xs: 0.5, md: 2 } }}>
            <IconButton color="inherit" aria-label="Open navigation" onClick={(event) => setAnchorElNav(event.currentTarget)} sx={{ display: { md: 'none' }, mr: 0.25 }}>
              <MenuIcon />
            </IconButton>

            <Stack component={Link} to="/" direction="row" spacing={1.25} alignItems="center" sx={{ color: 'inherit', textDecoration: 'none', flexGrow: { xs: 1, md: 0 } }}>
              <Box sx={{ display: 'grid', width: 43, height: 43, placeItems: 'center', borderRadius: 2.4, bgcolor: 'primary.dark', boxShadow: '0 7px 18px rgba(53,10,24,.16)' }}>
                <Box component="img" src={qhsMark} alt="" sx={{ width: 35, height: 35 }} />
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography fontWeight={820} fontSize="0.9rem" letterSpacing="-.015em" lineHeight={1.15}>QHS Inventory</Typography>
                <Typography color="text.secondary" fontSize="0.67rem" sx={{ mt: 0.25 }}>Student equipment portal</Typography>
              </Box>
            </Stack>

            <Stack component="nav" aria-label="Primary navigation" direction="row" spacing={0.35} sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1, ml: 3 }}>
              {pages.map((page) => {
                const active = page.link === '/' ? location.pathname === '/' : location.pathname.startsWith(page.link);
                return (
                  <Button component={NavLink} to={page.link} key={page.link} color="inherit" sx={{ minHeight: 38, px: 1.5, borderRadius: 2.25, color: active ? 'primary.main' : 'text.secondary', bgcolor: active ? 'primary.50' : 'transparent', fontWeight: active ? 780 : 650, '&:hover': { bgcolor: active ? 'primary.50' : 'action.hover', color: 'text.primary' } }}>
                    {page.name}
                  </Button>
                );
              })}
            </Stack>

            <Stack direction="row" spacing={0.4} alignItems="center">
              <Tooltip title="Request updates">
                <IconButton aria-label={`${unseenCount} unseen request updates`} onClick={handleOpenNotifications} sx={{ bgcolor: 'action.hover' }}>
                  <Badge badgeContent={unseenCount || pendingRequests} color="error" max={99}><NotificationsNoneIcon /></Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Equipment cart">
                <IconButton aria-label={`${totalItems} items in cart`} onClick={() => setCartOpen(true)} sx={{ bgcolor: 'action.hover' }}>
                  <Badge badgeContent={totalItems} color="primary" max={99}><ShoppingBagOutlinedIcon /></Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Account">
                <IconButton onClick={(event) => setAnchorElUser(event.currentTarget)} sx={{ p: 0.35, ml: 0.25 }}>
                  <Avatar src={user?.avatar ? assetUrl(`/storage/${user.avatar}`) : undefined} alt={user?.name || 'Account'} sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.76rem', fontWeight: 800, border: '2px solid', borderColor: 'background.paper', boxShadow: '0 0 0 1px rgba(104,22,47,.15)' }}>
                    {getInitials(user?.name)}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Menu anchorEl={anchorElNav} open={Boolean(anchorElNav)} onClose={() => setAnchorElNav(null)}>
        {pages.map((page) => (
          <MenuItem component={Link} to={page.link} key={page.link} selected={page.link === '/' ? location.pathname === '/' : location.pathname.startsWith(page.link)} onClick={() => setAnchorElNav(null)}>
            {page.name}
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={anchorElUser} open={Boolean(anchorElUser)} onClose={() => setAnchorElUser(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Box sx={{ px: 2, py: 1.25, minWidth: 220 }}>
          <Typography variant="body2" fontWeight={750} noWrap>{user?.name || 'Account'}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setAnchorElUser(null); navigate('/profile'); }}>
          <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>Profile settings
        </MenuItem>
        <MenuItem onClick={() => { setAnchorElUser(null); navigate('/borrow-history'); }}>
          <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>My requests
        </MenuItem>
        <Divider />
        <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'inherit' }}><LogoutIcon fontSize="small" /></ListItemIcon>Sign out
        </MenuItem>
      </Menu>

      <Popover anchorEl={notificationAnchor} open={Boolean(notificationAnchor)} onClose={() => setNotificationAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Paper sx={{ width: 'min(400px, calc(100vw - 24px))', maxHeight: 540, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.25, py: 1.75, borderBottom: 1, borderColor: 'divider' }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={780}>Request updates</Typography>
              <Typography variant="caption" color="text.secondary">Recent activity on your borrowing requests</Typography>
            </Box>
            <Chip label={notifications.length + recentUpdates.length} size="small" />
          </Stack>

          {notifications.length === 0 && recentUpdates.length === 0 ? (
            <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 36, mb: 1 }} />
              <Typography fontWeight={750}>You’re all caught up</Typography>
              <Typography variant="body2" color="text.secondary">There are no recent request updates.</Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {notifications.length > 0 && (
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ display: 'block', px: 2.25, pt: 1.5, pb: 0.5, fontWeight: 800 }}>Awaiting review</Typography>
                  {notifications.map((item) => (
                    <NotificationRow key={`p-${item.id}`} icon={<HourglassTopIcon fontSize="small" />} tone="warning" title={`Request #${item.id} is pending`} detail={`${item.laboratory?.name || 'Laboratory'} · ${item.equipment?.length || 0} item(s)`} when={formatWhen(item.created_at)} onClick={goToHistory} />
                  ))}
                </Box>
              )}
              {recentUpdates.length > 0 && (
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ display: 'block', px: 2.25, pt: 1.5, pb: 0.5, fontWeight: 800 }}>Recent decisions</Typography>
                  {recentUpdates.map((item) => {
                    const status = item.status?.toLowerCase();
                    const approved = status === 'approved';
                    const borrowed = status === 'borrowed';
                    const returned = status === 'returned';
                    const partial = item.lifecycle_stage === 'partially_returned';
                    const actor = approved ? (item.approved_by_name || item.accepted_by_name) : borrowed ? item.issued_by_name : returned ? item.returned_by_name : item.rejected_by_name;
                    const when = approved ? (item.approved_at || item.accepted_at) : borrowed ? (item.updated_at || item.issued_at) : returned ? item.returned_at : item.rejected_at;
                    const title = approved
                      ? `Request #${item.id} is ready for pickup`
                      : borrowed
                        ? `Request #${item.id} ${partial ? `${item.returned_count || 0}/${item.issued_count || 0} units returned` : item.is_overdue ? 'is overdue' : 'was issued'}`
                        : returned ? `Request #${item.id} was fully returned` : `Request #${item.id} was rejected`;
                    return (
                      <NotificationRow key={`u-${item.id}`} icon={approved || borrowed ? <LocalShippingIcon fontSize="small" /> : returned ? <AssignmentReturnIcon fontSize="small" /> : <CancelIcon fontSize="small" />} tone={item.is_overdue ? 'error' : approved || borrowed ? 'info' : returned ? 'success' : 'error'} title={title} detail={`${item.laboratory?.name || 'Laboratory'}${actor ? ` · ${actor}` : ''}`} when={formatWhen(when)} onClick={goToHistory} />
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
          {(notifications.length > 0 || recentUpdates.length > 0) && <Box sx={{ p: 1.25, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}><Button onClick={goToHistory}>View all requests</Button></Box>}
        </Paper>
      </Popover>

      <Drawer anchor="right" open={cartOpen} onClose={() => setCartOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, maxWidth: '100vw', borderLeft: '1px solid', borderColor: 'divider' } }}>
        <Stack sx={{ height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: { xs: 2, sm: 2.5 }, py: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box>
              <Typography variant="h6">Equipment cart</Typography>
              <Typography variant="body2" color="text.secondary">{totalItems} unit{totalItems === 1 ? '' : 's'} selected</Typography>
            </Box>
            <IconButton aria-label="Close cart" onClick={() => setCartOpen(false)}><CloseIcon /></IconButton>
          </Stack>

          <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 2.5 } }}>
            {cart.length === 0 ? (
              <Alert severity="info">Your cart is empty. Browse equipment to start a request.</Alert>
            ) : (
              <Stack spacing={2.5}>
                {Object.entries(cartByLab).map(([labId, items]) => (
                  <Box key={labId}>
                    <Typography variant="overline" color="primary" fontWeight={820}>{getLabName(labId)}</Typography>
                    <Stack spacing={1.25} sx={{ mt: 0.75 }}>
                      {items.map((item) => (
                        <Card variant="outlined" key={item.id}>
                          <Stack direction="row" sx={{ minWidth: 0 }}>
                            <Box component="img" src={assetUrl(item.image ? `/storage/${item.image}` : null)} alt="" sx={{ width: 88, minHeight: 112, objectFit: 'cover', bgcolor: 'action.hover', flexShrink: 0 }} />
                            <CardContent sx={{ minWidth: 0, flex: 1, p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Stack direction="row" justifyContent="space-between" spacing={1}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="subtitle2" fontWeight={760} noWrap>{item.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">Up to {item.available_count || '—'} available</Typography>
                                </Box>
                                <IconButton size="small" color="error" aria-label={`Remove ${item.name}`} onClick={() => handleRemoveFromCart(item.id)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                              </Stack>
                              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.25 }}>
                                <IconButton size="small" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}><RemoveIcon fontSize="small" /></IconButton>
                                <Typography variant="body2" fontWeight={780} sx={{ minWidth: 28, textAlign: 'center' }}>{item.quantity}</Typography>
                                <IconButton size="small" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= (item.available_count || 999)}><AddIcon fontSize="small" /></IconButton>
                              </Stack>
                            </CardContent>
                          </Stack>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          {cart.length > 0 && (
            <Box sx={{ p: { xs: 2, sm: 2.5 }, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.75 }}><Typography color="text.secondary">Total units</Typography><Typography fontWeight={800}>{totalItems}</Typography></Stack>
              <Button fullWidth variant="contained" disabled={submitting} onClick={handleProceedToRequest}>{submitting ? 'Submitting request…' : 'Submit borrowing request'}</Button>
              <Button fullWidth color="inherit" onClick={() => setCart([])} sx={{ mt: 0.75 }}>Clear cart</Button>
            </Box>
          )}
        </Stack>
      </Drawer>

      <Box
        component="main"
        sx={{
          minHeight: 'calc(100vh - 79px)',
          backgroundImage: 'radial-gradient(circle at 92% 2%, rgba(104,22,47,.04), transparent 26rem)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

interface NotificationRowProps {
  detail: string;
  icon: ReactNode;
  onClick: () => void;
  title: string;
  tone: NotificationTone;
  when: string;
}

function NotificationRow({ detail, icon, onClick, title, tone, when }: NotificationRowProps) {
  return (
    <Box component="button" type="button" onClick={onClick} sx={{ display: 'block', width: '100%', px: 2.25, py: 1.5, border: 0, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary', textAlign: 'left', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
      <Stack direction="row" spacing={1.35} alignItems="flex-start">
        <Box sx={{ display: 'grid', width: 34, height: 34, flexShrink: 0, placeItems: 'center', borderRadius: 2, bgcolor: `${tone}.50`, color: `${tone}.main` }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={740}>{title}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>{detail}</Typography>
          <Typography variant="caption" color="text.secondary">{when}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}
