import { Navigate, Outlet, Link, useNavigate } from "react-router-dom";
import { useStateContext } from "../Context/ContextProvider";
import { useEffect, useState } from "react";
import axiosClient, { assetUrl } from "../axiosClient";
import * as React from 'react';

// Directly import Material-UI components
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import ListItemIcon from '@mui/material/ListItemIcon';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Badge from '@mui/material/Badge';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';

// Directly import Material-UI icons
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import ProfileIcon from '@mui/icons-material/Person';
import CartIcon from '@mui/icons-material/ShoppingBasket';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import HistoryIcon from '@mui/icons-material/History';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import qhsMark from '../assets/qhs-mark.svg';



// Define pages with their corresponding links


export default function UserLayout() {
  const { user, token, setUser, setToken } = useStateContext();
  const navigate = useNavigate();

  const [anchorElNav, setAnchorElNav] = React.useState(null);
  const [anchorElUser, setAnchorElUser] = React.useState(null);
  const [cart, setCart] = React.useState(() => {
    // Initialize cart from localStorage
    const savedCart = localStorage.getItem('equipment_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [cartOpen, setCartOpen] = React.useState(false);
  const [laboratories, setLaboratories] = React.useState([]);
  const [pendingRequests, setPendingRequests] = React.useState(0);
  const [notifications, setNotifications] = React.useState([]);
  const [recentUpdates, setRecentUpdates] = React.useState([]);
  const [notificationAnchor, setNotificationAnchor] = React.useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [seenIds, setSeenIds] = React.useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('seen_notification_ids') || '[]')); }
    catch { return new Set(); }
  });



  useEffect(() => {
    if (!user?.id) return;

    // Function to refresh notifications
    const refreshNotifications = () => {
      axiosClient.get("/transactions")
        .then(({ data }) => {
          const transactions = data.data || data || [];
          // Pending requests
          const pending = transactions.filter(t => t.status?.toLowerCase() === 'pending');
          setPendingRequests(pending.length);
          setNotifications(pending);
          // Recent status updates (borrowed/returned/rejected within last 7 days)
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const updates = transactions.filter(t => {
            const s = t.status?.toLowerCase();
            if (s === 'borrowed' && t.accepted_at) return new Date(t.accepted_at) > sevenDaysAgo;
            if (s === 'returned' && t.returned_at) return new Date(t.returned_at) > sevenDaysAgo;
            if (s === 'rejected' && t.rejected_at) return new Date(t.rejected_at) > sevenDaysAgo;
            return false;
          });
          setRecentUpdates(updates);
        })
        .catch(err => console.error('Error fetching requests:', err));
    };

    axiosClient.get("/user")
      .then(({ data }) => {
        setUser(data);
      });

    // Fetch laboratories for cart display
    axiosClient.get("/laboratories")
      .then(({ data }) => {
        setLaboratories(data.data || []);
      });

    // Initial fetch of notifications
    refreshNotifications();

    // Listen for cart updates from UserLab component
    const handleCartUpdate = (e) => {
      setCart(e.detail);
    };

    window.addEventListener('cartUpdated', handleCartUpdate);

    // Listen for transaction updates from BorrowHistory component
    const handleTransactionUpdate = () => {
      refreshNotifications();
    };

    window.addEventListener('transactionUpdated', handleTransactionUpdate);

    // Auto-refresh pending requests every 10 seconds for fallback
    const requestInterval = setInterval(() => {
      refreshNotifications();
    }, 10000);

    // Set up Reverb listener for real-time updates if Echo is available
    if (window.Echo) {
      try {
        window.Echo.private(`transactions.user.${user.id}`)
          .listen('.transaction.updated', (event) => {
            // Refresh notifications when ANY transaction is updated
            refreshNotifications();
            // Dispatch event for BorrowHistory to refresh
            window.dispatchEvent(new CustomEvent('transactionUpdated', { detail: event }));
          });
      } catch { /* Polling remains available. */ }
    }

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('transactionUpdated', handleTransactionUpdate);
      clearInterval(requestInterval);
      if (window.Echo) {
        try {
          window.Echo.leave(`transactions.user.${user.id}`);
        } catch { /* The connection may already be closed. */ }
      }
    };
  }, [user?.id, setUser]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('equipment_cart', JSON.stringify(cart));
    // Dispatch event when cart changes (for other components)
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
  }, [cart]);

  // Redirect to login if no token is found
  if (!token) {
    return <Navigate to='../auth' />;
  }

  const pages = [
    { name: 'Home', link: '/' },
    { name: 'Laboratories', link: '/laboratories' },
    { name: 'About Us', link: '/about' },
  ];

  const settings = [
    { name: user.name.toUpperCase(), icon: <ProfileIcon />, action: 'profile' },
    { name: 'Borrow History', icon: <HistoryIcon />, action: 'history' },
    { name: 'Logout', icon: <LogoutIcon />, action: 'logout' },
  ];

  // Handlers for opening and closing the navigation menu
  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  // Handlers for opening and closing the user menu
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  // Notification handlers
  const handleOpenNotifications = (event) => {
    setNotificationAnchor(event.currentTarget);
    // Mark all currently visible notifications as seen
    const allIds = [
      ...notifications.map(n => `p-${n.id}`),
      ...recentUpdates.map(t => `u-${t.id}`),
    ];
    if (allIds.length > 0) {
      const updated = new Set([...seenIds, ...allIds]);
      setSeenIds(updated);
      localStorage.setItem('seen_notification_ids', JSON.stringify([...updated]));
    }
  };

  const handleCloseNotifications = () => {
    setNotificationAnchor(null);
  };

  // Logout handler
  const onLogout = async () => {
    try {
      await axiosClient.post('/logout');
    } finally {
      setUser(null);
      setToken(null);
      navigate('/auth', { replace: true });
    }
  };

  // Cart handlers
  const handleOpenCart = () => {
    setCartOpen(true);
    handleCloseUserMenu();
  };

  const handleCloseCart = () => {
    setCartOpen(false);
  };

  const handleRemoveFromCart = (equipmentId) => {
    setCart(cart.filter(item => item.id !== equipmentId));
  };

  const handleUpdateQuantity = (equipmentId, newQuantity) => {
    const item = cart.find(i => i.id === equipmentId);
    const availableCount = item?.available_count || 999; // Default to 999 if not set (safety)

    if (newQuantity > availableCount) {
      alert(`Only ${availableCount} unit(s) available for this item.`);
      return;
    }

    if (newQuantity <= 0) {
      handleRemoveFromCart(equipmentId);
    } else {
      setCart(cart.map(cartItem =>
        cartItem.id === equipmentId
          ? { ...cartItem, quantity: newQuantity }
          : cartItem
      ));
    }
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleProceedToRequest = async () => {
    if (submitting) return;

    // Validate address exists and is not empty
    if (!user?.address || user.address.trim() === '') {
      alert('Please set your address in your profile before proceeding with a request.');
      handleCloseCart();
      navigate('/profile');
      return;
    }

    // Group cart items by laboratory
    const cartByLab = cart.reduce((acc, item) => {
      const labId = item.laboratory_id;
      if (!acc[labId]) {
        acc[labId] = [];
      }
      acc[labId].push(item);
      return acc;
    }, {});

    // Create separate requests for each laboratory
    const requestsByLab = Object.entries(cartByLab).map(([labId, items]) => ({
      borrower_id: user?.id,
      borrower_name: user?.name,
      borrower_email: user?.email,
      borrower_contact: user?.phone_number,
      laboratory_id: parseInt(labId),
      borrow_date: new Date().toISOString().split('T')[0],
      return_date: null,
      notes: null,
      equipment: items.map(item => ({
        equipment_id: item.id,
        quantity: item.quantity,
      })),
    }));

    setSubmitting(true);
    try {
      // Submit each laboratory request separately
      for (const request of requestsByLab) {
        await axiosClient.post('/transactions', request);
      }

      // Clear cart and show success
      setCart([]);
      handleCloseCart();

      // Immediately dispatch transaction update to trigger refresh
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay to ensure backend processed
      window.dispatchEvent(new CustomEvent('transactionUpdated'));

      alert('Your requests have been submitted successfully!');
    } catch (error) {
      alert('Error submitting requests: ' + (error.response?.data?.message || 'Please try again'));
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Get image source with fallback
  const getImageSrc = (imagePath) => {
    return assetUrl(imagePath ? `/storage/${imagePath}` : null);
  };

  // Group cart items by laboratory
  const cartByLab = cart.reduce((acc, item) => {
    const labId = item.laboratory_id;
    if (!acc[labId]) {
      acc[labId] = [];
    }
    acc[labId].push(item);
    return acc;
  }, {});

  const getLabName = (labId) => {
    const lab = laboratories.find(l => l.id === labId);
    return lab?.name || 'Unknown Lab';
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ResponsiveAppBar */}
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: '#4C1020',
          color: 'common.white',
          borderBottomColor: 'rgba(255,255,255,.12)',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: { xs: 0.5, md: 1.5 }, minHeight: { xs: 64, md: 72 } }}>
            <Box
              component="img"
              src={qhsMark}
              alt=""
              sx={{
                display: { xs: "none", md: "flex" },
                width: 42,
                height: 42,
                flexShrink: 0,
              }}
            />

            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/"
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontWeight: 800,
                fontSize: '1.05rem',
                letterSpacing: '-0.01em',
                color: 'white',
                textDecoration: 'none',
                transition: 'opacity 0.3s ease',
                '&:hover': {
                  opacity: 0.9,
                },
              }}
            >
              QHS Inventory
            </Typography>

            {/* Mobile Menu */}
            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="Open navigation"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{
                  display: { xs: 'block', md: 'none' },
                  '& .MuiMenu-paper': {
                    borderRadius: '8px',
                    mt: 1,
                  },
                }}
              >
                {pages.map((page) => (
                  <MenuItem key={page.name} onClick={handleCloseNavMenu}>
                    <Link to={page.link} style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
                      <Typography sx={{ textAlign: 'center' }}>{page.name}</Typography>
                    </Link>
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            {/* Mobile Logo */}
            <Typography
              variant="h5"
              noWrap
              component={Link}
              to="/"
              sx={{
                mr: 0.5,
                display: { xs: 'flex', md: 'none' },
                flexGrow: 1,
                fontWeight: 800,
                fontSize: '1.02rem',
                color: 'white',
                textDecoration: 'none',
                transition: 'opacity 0.3s ease',
                '&:hover': {
                  opacity: 0.9,
                },
              }}
            >
              QHS Inventory
            </Typography>

            {/* Desktop Menu */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              {pages.map((page) => (
                <Link
                  key={page.name}
                  to={page.link}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Button
                    onClick={handleCloseNavMenu}
                    sx={{
                      my: 2,
                      color: 'white',
                      display: 'block',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 8,
                        left: 0,
                        right: 0,
                        height: '2px',
                        backgroundColor: 'white',
                        transform: 'scaleX(0)',
                        transition: 'transform 0.3s ease',
                      },
                      '&:hover::after': {
                        transform: 'scaleX(1)',
                      },
                    }}
                  >
                    {page.name}
                  </Button>
                </Link>
              ))}
            </Box>

            {/* User Menu */}
            <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 0.75 } }}>
              {/* Requests/Notifications Icon */}
              <Tooltip title="Notifications" arrow>
                <IconButton
                  color="inherit"
                  onClick={handleOpenNotifications}
                  sx={{
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <Badge
                    badgeContent={
                      notifications.filter(n => !seenIds.has(`p-${n.id}`)).length +
                      recentUpdates.filter(t => !seenIds.has(`u-${t.id}`)).length
                    }
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: '#ff5252',
                        fontWeight: 600,
                      },
                    }}
                  >
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* Notifications Popover */}
              <Popover
                open={Boolean(notificationAnchor)}
                anchorEl={notificationAnchor}
                onClose={handleCloseNotifications}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <Paper sx={{ width: 'min(380px, calc(100vw - 24px))', overflow: 'hidden' }}>
                  {/* Header */}
                  <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                    <Typography variant="h6" fontWeight="700" sx={{ color: '#800000' }}>
                      Notifications
                    </Typography>
                  </Box>

                  {/* Notifications List */}
                  {notifications.length === 0 && recentUpdates.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No new notifications
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>

                      {/* ── Pending requests ── */}
                      {notifications.length > 0 && (
                        <Box>
                          <Typography variant="caption" fontWeight="700" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Awaiting Approval
                          </Typography>
                          {notifications.map((notification, index) => (
                            <Box
                              key={`p-${notification.id}`}
                              sx={{
                                p: 2,
                                borderBottom: '1px solid rgba(0,0,0,0.06)',
                                transition: 'all 0.2s ease',
                                '&:hover': { bgcolor: 'rgba(128, 0, 0, 0.04)' },
                                cursor: 'pointer',
                              }}
                              onClick={() => { navigate('/borrow-history'); handleCloseNotifications(); }}
                            >
                              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                <Box sx={{ mt: 0.5, color: '#ffc107' }}>
                                  <HourglassTopIcon sx={{ fontSize: 22 }} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight="600" sx={{ mb: 0.25 }}>
                                    Request #{notification.id} — Pending
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                    {notification.laboratory?.name || 'Lab'} • {notification.equipment?.length || 0} item{notification.equipment?.length !== 1 ? 's' : ''}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                </Box>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ffc107', mt: 0.75, flexShrink: 0 }} />
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* ── Recent status changes ── */}
                      {recentUpdates.length > 0 && (
                        <Box>
                          <Typography variant="caption" fontWeight="700" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Recent Updates
                          </Typography>
                          {recentUpdates.map((t) => {
                            const s = t.status?.toLowerCase();
                            const isAccepted = s === 'borrowed';
                            const isReturned = s === 'returned';
                            const isRejected = s === 'rejected';

                            const iconColor = isAccepted ? '#2196f3' : isReturned ? '#4caf50' : '#f44336';
                            const icon = isAccepted
                              ? <LocalShippingIcon sx={{ fontSize: 22 }} />
                              : isReturned
                                ? <AssignmentReturnIcon sx={{ fontSize: 22 }} />
                                : <CancelIcon sx={{ fontSize: 22 }} />;

                            const actor = isAccepted
                              ? t.accepted_by_name
                              : isReturned
                                ? t.returned_by_name
                                : t.rejected_by_name;

                            const actionLabel = isAccepted ? 'Accepted' : isReturned ? 'Returned' : 'Rejected';
                            const dateField = isAccepted ? t.accepted_at : isReturned ? t.returned_at : t.rejected_at;

                            return (
                              <Box
                                key={`u-${t.id}`}
                                sx={{
                                  p: 2,
                                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                                  transition: 'all 0.2s ease',
                                  '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' },
                                  cursor: 'pointer',
                                }}
                                onClick={() => { navigate('/borrow-history'); handleCloseNotifications(); }}
                              >
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                  <Box sx={{ mt: 0.5, color: iconColor }}>{icon}</Box>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight="600" sx={{ mb: 0.25 }}>
                                      Request #{t.id} — {actionLabel}
                                      {actor ? ` by ${actor}` : ''}
                                    </Typography>
                                    {isRejected && t.rejection_reason && (
                                      <Typography variant="caption" sx={{ display: 'block', color: '#f44336', mb: 0.5 }}>
                                        Reason: {t.rejection_reason}
                                      </Typography>
                                    )}
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      {t.laboratory?.name || 'Lab'}
                                    </Typography>
                                    {dateField && (
                                      <Typography variant="caption" color="text.secondary">
                                        {new Date(dateField).toLocaleDateString()} at {new Date(dateField).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </Typography>
                                    )}
                                  </Box>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: iconColor, mt: 0.75, flexShrink: 0 }} />
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Footer */}
                  {(notifications.length > 0 || recentUpdates.length > 0) && (
                    <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                      <Button
                        size="small"
                        onClick={() => {
                          navigate('/borrow-history');
                          handleCloseNotifications();
                        }}
                        sx={{ color: '#800000', fontWeight: 600 }}
                      >
                        View All Requests
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Popover>

              {/* Cart Icon */}
              <Tooltip title="Shopping Cart" arrow>
                <IconButton
                  color="inherit"
                  onClick={handleOpenCart}
                  sx={{
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <Badge badgeContent={totalItems} color="error" sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: '#ff5252',
                      fontWeight: 600,
                    },
                  }}>
                    <CartIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* User Avatar */}
              <Tooltip title="Open settings" arrow>
                <IconButton
                  onClick={handleOpenUserMenu}
                  sx={{
                    p: 0,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.08)',
                    },
                  }}
                >
                  <Avatar
                    alt={user?.name?.toUpperCase() || 'User'}
                    src={user?.avatar ? assetUrl(`/storage/${user.avatar}`) : undefined}
                    sx={{
                      width: 40,
                      height: 40,
                      border: '2px solid rgba(255, 255, 255, 0.5)',
                      transition: 'border-color 0.3s ease',
                      '&:hover': {
                        borderColor: 'white',
                      },
                    }}
                  />
                </IconButton>
              </Tooltip>
              <Menu
                sx={{
                  mt: '45px',
                  '& .MuiMenu-paper': {
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                    minWidth: 200,
                  },
                }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                {settings.map((setting) => (
                  <MenuItem
                    key={setting.name}
                    onClick={setting.action === 'logout' ? onLogout : setting.action === 'profile' ? () => { navigate('/profile'); handleCloseUserMenu(); } : setting.action === 'history' ? () => { navigate('/borrow-history'); handleCloseUserMenu(); } : handleCloseUserMenu}
                    sx={{
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(128, 0, 0, 0.08)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: setting.action === 'logout' ? 'error.main' : 'inherit' }}>
                      {setting.icon}
                    </ListItemIcon>
                    <Typography sx={{ textAlign: 'left', fontWeight: 500 }}>{setting.name}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Cart Drawer */}
      <Drawer
        anchor="right"
        open={cartOpen}
        onClose={handleCloseCart}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 420 },
            maxWidth: '90vw',
            borderRadius: '12px 0 0 12px',
            boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="700">
              Shopping Cart
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Divider sx={{ mb: 2, opacity: 0.6 }} />

          {cart.length === 0 ? (
            <Alert
              severity="info"
              sx={{
                bgcolor: 'rgba(128, 0, 0, 0.05)',
                color: '#800000',
                border: '1px solid rgba(128, 0, 0, 0.2)',
                borderRadius: '8px',
                fontWeight: 500,
              }}
            >
              Your cart is empty
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', pr: 1 }}>
              {Object.entries(cartByLab).map(([labId, items]) => (
                <Box key={labId}>
                  {/* Laboratory Header */}
                  <Box sx={{ mb: 1.5 }}>
                    <Chip
                      label={getLabName(parseInt(labId))}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(128, 0, 0, 0.08)',
                        },
                      }}
                    />
                  </Box>

                  {/* Items in Laboratory */}
                  <Stack spacing={1.5}>
                    {items.map(item => (
                      <Card
                        key={item.id}
                        variant="outlined"
                        sx={{
                          display: 'flex',
                          flexDirection: 'row',
                          borderRadius: '8px',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            borderColor: 'rgba(128, 0, 0, 0.2)',
                          },
                        }}
                      >
                        {/* Item Image */}
                        <Box
                          component="img"
                          src={getImageSrc(item.image)}
                          alt={item.name}
                          sx={{
                            width: 90,
                            height: 90,
                            objectFit: 'cover',
                            borderRadius: '8px 0 0 8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                          }}
                          onError={(e) => {
                            e.target.src = assetUrl(null);
                          }}
                        />
                        <CardContent sx={{ pb: 1, flex: 1, '&:last-child': { pb: 1 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" fontWeight="700" sx={{ lineHeight: 1.3 }}>
                                {item.name}
                              </Typography>
                              {item.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                                  {item.description.substring(0, 40)}...
                                </Typography>
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveFromCart(item.id)}
                              sx={{
                                color: 'error.main',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(244, 67, 54, 0.08)',
                                },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>

                          {/* Quantity Controls */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, backgroundColor: 'rgba(0, 0, 0, 0.03)', borderRadius: '6px', p: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              sx={{
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Typography variant="body2" sx={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>
                              {item.quantity}
                            </Typography>
                            <Tooltip title={item.quantity >= (item.available_count || 999) ? `Max ${item.available_count || 'unlimited'} available` : 'Add one more'}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= (item.available_count || 999)}
                                  sx={{
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <AddIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                  <Divider sx={{ my: 2, opacity: 0.4 }} />
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <Box sx={{ p: 3, borderTop: '1px solid rgba(0, 0, 0, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.01)' }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Total Items:
                </Typography>
                <Typography variant="body2" fontWeight="700" sx={{ color: '#800000' }}>
                  {totalItems} unit{totalItems !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <Button
                variant="contained"
                fullWidth
                disabled={submitting}
                onClick={handleProceedToRequest}
                sx={{
                  bgcolor: '#800000',
                  color: 'white',
                  fontWeight: 600,
                  py: 1.3,
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: '#600000',
                    boxShadow: '0 4px 12px rgba(128, 0, 0, 0.3)',
                    transform: 'translateY(-2px)',
                  },
                  '&.Mui-disabled': {
                    bgcolor: '#800000',
                    opacity: 0.7,
                    color: 'white',
                  },
                }}
              >
                {submitting ? 'Submitting…' : 'Proceed to Request'}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleClearCart}
                sx={{
                  color: '#800000',
                  borderColor: '#800000',
                  fontWeight: 600,
                  py: 1.3,
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'rgba(128, 0, 0, 0.08)',
                    borderColor: '#600000',
                    boxShadow: '0 2px 8px rgba(128, 0, 0, 0.15)',
                  },
                }}
              >
                Clear Cart
              </Button>
            </Stack>
          </Box>
        )}
      </Drawer>

      {/* Outlet for nested routes */}
      <Box component="main" sx={{ minHeight: 'calc(100vh - 72px)' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
