import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStateContext } from "../Context/ContextProvider";
import axiosClient, { assetUrl } from "../axiosClient";
import { useEffect, useState, useMemo, useCallback } from "react";
import * as React from 'react';
import * as Mui from '../assets/muiImports';
import { Avatar } from "@mui/material";
import { getInitials } from "../utils";
import '../echo.js';

// --- STYLED COMPONENTS (Moved outside to prevent re-creation on every render) ---

const drawerWidth = 240;

const Main = Mui.styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  })
);

const AppBar = Mui.styled(Mui.AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = Mui.styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

// --- THEME CONTEXT ---
const ThemeContext = React.createContext({
  toggleTheme: () => { },
  mode: 'light',
});

// --- CLOCK COMPONENT ---
const Clock = React.memo(() => {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const updateClock = useCallback(() => {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const ampm = now.getHours() >= 12 ? "PM" : "AM";
    const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;
    const dateString = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setCurrentTime(timeString);
    setCurrentDate(dateString);
  }, []);

  useEffect(() => {
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [updateClock]);

  return (
    <>
      <Mui.Typography variant="body1" sx={{ marginRight: 2 }}>
        {currentTime}
      </Mui.Typography>
      <Mui.Typography variant="body1">
        {currentDate}
      </Mui.Typography>
    </>
  );
});

Clock.displayName = 'Clock';

// --- MEMOIZED CONTENT COMPONENT ---
const MemoizedContent = React.memo(() => {
  return (
    <Mui.Box>
      <Outlet />
    </Mui.Box>
  );
});

MemoizedContent.displayName = 'MemoizedContent';

// --- MAIN LAYOUT COMPONENT ---
function CustodianLayout() {
  const { user, token, setUser, setToken } = useStateContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Dashboard");
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = useState(localStorage.getItem('themeMode') || 'light');
  const [isAssignedToLab, setIsAssignedToLab] = useState(false);
  const [loadingLab, setLoadingLab] = useState(true);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [laboratoryId, setLaboratoryId] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [pendingNotifications, setPendingNotifications] = useState([]);

  // Toggle theme and save to localStorage
  const toggleTheme = useCallback(() => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  }, []);

  // Create theme based on mode
  const theme = useMemo(
    () =>
      Mui.createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
              primary: { main: '#800000' }, // Maroon for light mode
              background: { default: '#f5f5f5', paper: '#ffffff' },
            }
            : {
              primary: { main: '#ff6666' }, // Lighter maroon for dark mode
              background: { default: '#1a1a1a', paper: '#242424' },
            }),
        },
        components: {
          MuiTextField: {
            defaultProps: { margin: 'normal' }
          },
          MuiFormControl: {
            defaultProps: { margin: 'normal' }
          },
          MuiButton: {
            styleOverrides: { root: { margin: '6px' } }
          },
          MuiIconButton: {
            styleOverrides: { root: { marginLeft: '6px', marginRight: '6px' } }
          }
        },
      }),
    [mode]
  );

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleNotificationClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleNotificationItemClick = (transactionId) => {
    setNotificationAnchorEl(null);
    // Store the transaction ID to highlight in transactions view
    sessionStorage.setItem('highlightTransactionId', transactionId);
    navigate('/custodian/transactions');
  };

  const onLogout = (ev) => {
    ev.preventDefault();
    axiosClient.post('/logout')
      .finally(() => {
        setUser(null);
        setToken(null);
        navigate('/auth', { replace: true });
      });
  };

  useEffect(() => {
    axiosClient.get("/user")
      .then(({ data }) => {
        setUser(data);
      });
  }, []);

  // Check if custodian is assigned to a laboratory
  useEffect(() => {
    setLoadingLab(true);
    axiosClient.get('/laboratories', { params: { custodian_id: user?.id } })
      .then(({ data }) => {
        if (data.data && data.data.length > 0) {
          setIsAssignedToLab(true);
          setLaboratoryId(data.data[0].id);
        } else {
          setIsAssignedToLab(false);
          setLaboratoryId(null);
        }
      })
      .catch(() => {
        setIsAssignedToLab(false);
        setLaboratoryId(null);
      })
      .finally(() => {
        setLoadingLab(false);
      });
  }, [user?.id]);

  // Fetch pending requests for custodian's lab – refresh on mount, events, and polling
  useEffect(() => {
    if (!laboratoryId) return;

    const refreshNotifications = () => {
      axiosClient.get('/transactions', { params: { per_page: 100 } })
        .then(({ data }) => {
          const pending = (data.data || []).filter(t => t.status === 'pending' && t.laboratory_id === laboratoryId);
          setPendingRequestCount(pending.length);
          setPendingNotifications(pending);
        })
        .catch(() => {
          setPendingRequestCount(0);
          setPendingNotifications([]);
        });
    };

    // Initial fetch
    refreshNotifications();

    // Listen for real-time transaction events
    const handleTransactionUpdate = () => refreshNotifications();
    window.addEventListener('transactionUpdated', handleTransactionUpdate);

    // Set up Reverb listener if Echo is available
    if (window.Echo) {
      try {
        window.Echo.private(`transactions.lab.${laboratoryId}`)
          .listen('.transaction.updated', () => {
            refreshNotifications();
            window.dispatchEvent(new CustomEvent('transactionUpdated'));
          });
      } catch { /* Polling remains available. */ }
    }

    // Polling fallback every 10 seconds
    const interval = setInterval(refreshNotifications, 10000);

    return () => {
      window.removeEventListener('transactionUpdated', handleTransactionUpdate);
      clearInterval(interval);
      if (window.Echo) {
        try { window.Echo.leave(`transactions.lab.${laboratoryId}`); } catch { /* Already closed. */ }
      }
    };
  }, [laboratoryId]);

  useEffect(() => {
    const getTitleFromPath = (pathname) => {
      if (pathname.startsWith("/custodian/equipment")) {
        return "Equipment & Items";
      } else if (pathname.startsWith("/custodian/transactions")) {
        return "Transactions";
      } else if (pathname.startsWith("/custodian/transaction-reports")) {
        return "Transaction Reports";
      } else if (pathname.startsWith("/custodian/inventory-snapshots")) {
        return "Daily Inventory Snapshots";
      } else {
        return "Dashboard";
      }
    };
    setTitle(getTitleFromPath(location.pathname));
  }, [location.pathname]);

  if (!token) {
    return <Navigate to='../auth' />;
  }

  return (
    <Mui.ThemeProvider theme={theme}>
      <ThemeContext.Provider value={{ toggleTheme, mode }}>
        <Mui.Box sx={{ display: 'flex' }}>
          <Mui.CssBaseline />
          <AppBar position="fixed" open={open}>
            <Mui.Toolbar sx={{ backgroundColor: theme.palette.primary.main }}>
              <Mui.IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerOpen}
                edge="start"
                sx={{ mr: 1, ...(open && { display: 'none' }) }}
              >
                <Mui.MenuIcon />
              </Mui.IconButton>

              <Mui.Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                {title}
              </Mui.Typography>

              <Clock />

              <Mui.Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mui.IconButton
                  color="inherit"
                  aria-label="notifications"
                  onClick={handleNotificationClick}
                  sx={{ mr: 2 }}
                >
                  <Mui.Badge badgeContent={pendingRequestCount} color="error">
                    <Mui.NotificationsIcon />
                  </Mui.Badge>
                </Mui.IconButton>
              </Mui.Box>

              <Mui.Popover
                anchorEl={notificationAnchorEl}
                open={Boolean(notificationAnchorEl)}
                onClose={handleNotificationClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <Mui.Paper sx={{ width: 380, boxShadow: '0 5px 40px rgba(0,0,0,0.16)', borderRadius: '12px' }}>
                  {/* Header */}
                  <Mui.Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                    <Mui.Typography variant="h6" fontWeight="700" sx={{ color: '#800000' }}>
                      Pending Requests
                    </Mui.Typography>
                  </Mui.Box>

                  {/* Notifications List */}
                  {pendingNotifications.length === 0 ? (
                    <Mui.Box sx={{ p: 3, textAlign: 'center' }}>
                      <Mui.Typography variant="body2" color="text.secondary">
                        No pending requests
                      </Mui.Typography>
                    </Mui.Box>
                  ) : (
                    <Mui.Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                      {pendingNotifications.map((request, index) => (
                        <Mui.Box
                          key={request.id || index}
                          onClick={() => handleNotificationItemClick(request.id)}
                          sx={{
                            p: 2,
                            borderBottom: index < pendingNotifications.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(128, 0, 0, 0.04)',
                            },
                            cursor: 'pointer',
                          }}
                        >
                          <Mui.Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                            {/* Icon */}
                            <Mui.Box sx={{
                              mt: 0.5,
                              color: '#ffc107',
                            }}>
                              <Mui.HourglassTopIcon sx={{ fontSize: 24 }} />
                            </Mui.Box>

                            {/* Content */}
                            <Mui.Box sx={{ flex: 1, minWidth: 0 }}>
                              <Mui.Typography variant="body2" fontWeight="600" sx={{ mb: 0.5 }}>
                                Request #{request.id}
                              </Mui.Typography>
                              <Mui.Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                                From: {request.borrower?.name || 'Unknown User'}
                              </Mui.Typography>
                              <Mui.Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mb: 1 }}>
                                {Array.isArray(request.equipment) ?
                                  request.equipment.slice(0, 2).map((item, idx) => (
                                    <Mui.Chip
                                      key={idx}
                                      label={item.name}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.75rem' }}
                                    />
                                  ))
                                  : (
                                    <Mui.Chip
                                      label={request.equipment?.name || 'Equipment'}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.75rem' }}
                                    />
                                  )
                                }
                                {Array.isArray(request.equipment) && request.equipment.length > 2 && (
                                  <Mui.Chip
                                    label={`+${request.equipment.length - 2} more`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.75rem' }}
                                  />
                                )}
                              </Mui.Stack>
                              <Mui.Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Mui.Typography>
                            </Mui.Box>

                            {/* Status Indicator */}
                            <Mui.Box sx={{ color: '#ffc107', mt: 0.5 }}>
                              <Mui.Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: '#ffc107',
                                }}
                              />
                            </Mui.Box>
                          </Mui.Box>
                        </Mui.Box>
                      ))}
                    </Mui.Box>
                  )}

                  {/* Footer */}
                  {pendingNotifications.length > 0 && (
                    <Mui.Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                      <Mui.Button
                        size="small"
                        href="/custodian/transactions"
                        sx={{ color: '#800000', fontWeight: 600 }}
                      >
                        View All Requests
                      </Mui.Button>
                    </Mui.Box>
                  )}
                </Mui.Paper>
              </Mui.Popover>

              <Mui.IconButton
                color="inherit"
                onClick={toggleTheme}
                aria-label="toggle theme"
                sx={{ ml: 2 }}
              >
                {mode === 'light' ? <Mui.DarkModeIcon /> : <Mui.LightModeIcon />}
              </Mui.IconButton>
            </Mui.Toolbar>
          </AppBar>

          <Mui.Drawer
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                backgroundColor: theme.palette.background.paper,
              },
            }}
            variant="persistent"
            anchor="left"
            open={open}
          >
            <DrawerHeader>
              <Avatar
                src={user?.avatar ? assetUrl(`/storage/${user.avatar}`) : undefined}
                sx={{ width: 44, height: 44, fontSize: 14, m: 'auto' }}
              >
                {!user?.avatar && getInitials(user?.name)}
              </Avatar>
              {user?.name}
              <Mui.IconButton onClick={handleDrawerClose}>
                {theme.direction === 'ltr' ? <Mui.ChevronLeftIcon /> : <Mui.ChevronRightIcon />}
              </Mui.IconButton>
            </DrawerHeader>
            <Mui.Divider />
            <Mui.List>
              <Mui.ListItem>
                <Mui.Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Lab Management
                </Mui.Typography>
              </Mui.ListItem>
              <Mui.ListItem disablePadding>
                <Link to="/custodian" style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
                  <Mui.ListItemButton>
                    <Mui.ListItemIcon>
                      <Mui.DashboardIcon />
                    </Mui.ListItemIcon>
                    <Mui.ListItemText primary="Dashboard" />
                  </Mui.ListItemButton>
                </Link>
              </Mui.ListItem>
              <Mui.ListItem disablePadding>
                <Link to="equipment" style={{ textDecoration: 'none', color: isAssignedToLab ? 'inherit' : '#ccc', pointerEvents: isAssignedToLab ? 'auto' : 'none', width: '100%' }}>
                  <Mui.ListItemButton disabled={!isAssignedToLab}>
                    <Mui.ListItemIcon>
                      <Mui.BiotechIcon />
                    </Mui.ListItemIcon>
                    <Mui.ListItemText primary="Equipment & Items" />
                  </Mui.ListItemButton>
                </Link>
              </Mui.ListItem>
              <Mui.ListItem disablePadding>
                <Link to="transactions" style={{ textDecoration: 'none', color: isAssignedToLab ? 'inherit' : '#ccc', pointerEvents: isAssignedToLab ? 'auto' : 'none', width: '100%' }}>
                  <Mui.ListItemButton disabled={!isAssignedToLab}>
                    <Mui.ListItemIcon>
                      <Mui.BusinessIcon />
                    </Mui.ListItemIcon>
                    <Mui.ListItemText primary="Transactions" />
                  </Mui.ListItemButton>
                </Link>
              </Mui.ListItem>

              <Mui.Divider />

              <Mui.ListItem>
                <Mui.Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Reports
                </Mui.Typography>
              </Mui.ListItem>
              <Mui.ListItem disablePadding>
                <Link to="transaction-reports" style={{ textDecoration: 'none', color: isAssignedToLab ? 'inherit' : '#ccc', pointerEvents: isAssignedToLab ? 'auto' : 'none', width: '100%' }}>
                  <Mui.ListItemButton disabled={!isAssignedToLab}>
                    <Mui.ListItemIcon>
                      <Mui.BarChartIcon />
                    </Mui.ListItemIcon>
                    <Mui.ListItemText primary="Transaction Reports" />
                  </Mui.ListItemButton>
                </Link>
              </Mui.ListItem>
              <Mui.ListItem disablePadding>
                <Link to="inventory-snapshots" style={{ textDecoration: 'none', color: isAssignedToLab ? 'inherit' : '#ccc', pointerEvents: isAssignedToLab ? 'auto' : 'none', width: '100%' }}>
                  <Mui.ListItemButton disabled={!isAssignedToLab}>
                    <Mui.ListItemIcon>
                      <Mui.InventoryIcon />
                    </Mui.ListItemIcon>
                    <Mui.ListItemText primary="Daily Snapshots" />
                  </Mui.ListItemButton>
                </Link>
              </Mui.ListItem>
            </Mui.List>

            <Mui.Divider />

            <Mui.ListItem disablePadding>
              <Link to="#" style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
                <Mui.ListItemButton onClick={onLogout}>
                  <Mui.ListItemIcon>
                    <Mui.LogoutIcon />
                  </Mui.ListItemIcon>
                  <Mui.ListItemText primary="Logout" />
                </Mui.ListItemButton>
              </Link>
            </Mui.ListItem>
          </Mui.Drawer>

          <Main open={open}>
            <DrawerHeader />
            <MemoizedContent />
          </Main>
        </Mui.Box>
      </ThemeContext.Provider>
    </Mui.ThemeProvider>
  );
}

export default React.memo(CustodianLayout);
