import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import type { PaletteMode, Theme } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { assetUrl } from '../axiosClient';
import { getInitials } from '../utils';
import qhsMark from '../assets/qhs-mark.svg';
import type { AppUser } from '../types/domain';

const drawerWidth = 264;

function StaffClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right', mr: 0.5 }}>
      <Typography variant="body2" fontWeight={750} lineHeight={1.15}>
        {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </Typography>
      <Typography variant="caption" color="text.secondary" lineHeight={1.15}>
        {now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
      </Typography>
    </Box>
  );
}

export interface StaffNavigationItem {
  label: string;
  to: string;
  icon: ReactNode;
  end?: boolean;
  disabled?: boolean;
}

export interface StaffNavigationSection {
  label: string;
  items: StaffNavigationItem[];
}

interface StaffShellProps {
  children: ReactNode;
  extraActions?: ReactNode;
  mode: PaletteMode;
  navSections: StaffNavigationSection[];
  onLogout: () => void | Promise<void>;
  roleLabel: string;
  theme: Theme;
  title: string;
  toggleTheme: () => void;
  user: AppUser | null;
}

export default function StaffShell({
  children,
  extraActions,
  mode,
  navSections,
  onLogout,
  roleLabel,
  theme,
  title,
  toggleTheme,
  user,
}: StaffShellProps) {
  const location = useLocation();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.35} sx={{ minHeight: 76, px: 2.25 }}>
        <Box sx={{ display: 'grid', width: 42, height: 42, placeItems: 'center', borderRadius: 2.25, bgcolor: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', flexShrink: 0 }}>
          <Box component="img" src={qhsMark} alt="" sx={{ width: 34, height: 34 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography color="common.white" fontWeight={800} fontSize="0.93rem" lineHeight={1.15}>
            Quirino High School
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.62)', fontSize: '0.72rem' }}>
            Equipment inventory
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ mx: 1.25, mb: 1.4, p: 1.4, borderRadius: 2.25, bgcolor: 'rgba(255,255,255,.055)', border: '1px solid rgba(255,255,255,.075)' }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar
            src={user?.avatar ? assetUrl(`/storage/${user.avatar}`) : undefined}
            alt={user?.name || 'Account'}
            sx={{ width: 38, height: 38, bgcolor: 'secondary.main', color: 'secondary.contrastText', fontWeight: 800 }}
          >
            {getInitials(user?.name)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography color="common.white" fontWeight={700} noWrap fontSize="0.86rem">
              {user?.name || 'Loading account…'}
            </Typography>
            <Chip
              label={roleLabel}
              size="small"
              sx={{ mt: 0.45, height: 21, bgcolor: 'rgba(232,188,114,.16)', color: '#F2CB88', fontSize: '0.66rem' }}
            />
          </Box>
        </Stack>
      </Box>

      <Box
        component="nav"
        aria-label={`${roleLabel} navigation`}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.25,
          pb: 1,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {navSections.map((section) => (
          <Box key={section.label} sx={{ mb: 1.4 }}>
            <Typography
              sx={{ px: 1.5, pt: 1, pb: 0.7, color: 'rgba(255,255,255,.46)', fontSize: '0.66rem', fontWeight: 800, letterSpacing: '.11em', textTransform: 'uppercase' }}
            >
              {section.label}
            </Typography>
            <List disablePadding>
              {section.items.map((item) => {
                const selected = location.pathname === item.to || (!item.end && location.pathname.startsWith(`${item.to}/`));
                return (
                  <ListItem disablePadding key={item.to} sx={{ mb: 0.4 }}>
                    <ListItemButton
                      component={NavLink}
                      to={item.to}
                      end={item.end}
                      disabled={item.disabled}
                      selected={selected}
                      onClick={() => setMobileOpen(false)}
                      sx={{
                        minHeight: 43,
                        borderRadius: 1.75,
                        color: 'rgba(255,255,255,.76)',
                        position: 'relative',
                        '& .MuiListItemIcon-root': { color: 'inherit' },
                        '&:hover': { bgcolor: 'rgba(255,255,255,.075)', color: 'common.white' },
                        '&.Mui-selected': {
                          bgcolor: 'rgba(255,255,255,.1)',
                          color: '#F5D49B',
                          '&::before': { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: '0 4px 4px 0', bgcolor: '#E8BC72', content: '""' },
                          '&:hover': { bgcolor: 'rgba(255,255,255,.13)' },
                        },
                        '&.Mui-disabled': { color: 'rgba(255,255,255,.28)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.86rem', fontWeight: selected ? 750 : 600 }} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,.09)' }} />
      <List sx={{ p: 1.25 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={onLogout}
            sx={{ minHeight: 44, borderRadius: 1.75, color: 'rgba(255,255,255,.75)', '&:hover': { bgcolor: 'rgba(255,255,255,.075)', color: 'common.white' } }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Sign out" primaryTypographyProps={{ fontSize: '0.86rem', fontWeight: 650 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar
          position="fixed"
          color="inherit"
          sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
            bgcolor: 'rgba(250,249,247,.92)',
            color: 'text.primary',
            backdropFilter: 'blur(14px)',
            zIndex: (value) => value.zIndex.drawer - 1,
            ...(mode === 'dark' && { bgcolor: 'rgba(33,29,31,.9)' }),
          }}
        >
          <Toolbar sx={{ gap: { xs: 0.75, sm: 1.25 }, px: { xs: 1.5, sm: 3 } }}>
            <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography component="h1" variant="h6" noWrap>{title}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Quirino High School · {roleLabel} workspace
              </Typography>
            </Box>
            <StaffClock />
            {extraActions}
            <Tooltip title={mode === 'light' ? 'Use dark theme' : 'Use light theme'}>
              <IconButton onClick={toggleTheme} aria-label={mode === 'light' ? 'Use dark theme' : 'Use light theme'}>
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={user?.name || 'Account'}>
              <Avatar
                src={user?.avatar ? assetUrl(`/storage/${user.avatar}`) : undefined}
                alt={user?.name || 'Account'}
                sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontSize: '0.82rem', fontWeight: 800 }}
              >
                {getInitials(user?.name)}
              </Avatar>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box component="aside" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
          <Drawer
            variant={desktop ? 'permanent' : 'temporary'}
            open={desktop || mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                border: 0,
                bgcolor: '#421321',
                backgroundImage: 'none',
                color: 'common.white',
              },
            }}
          >
            {drawerContent}
          </Drawer>
        </Box>

        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          <Box className="staff-content">{children}</Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
