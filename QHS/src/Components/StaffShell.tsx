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
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import { assetUrl } from '../axiosClient';
import { getInitials } from '../utils';
import qhsMark from '../assets/qhs-mark.svg';
import type { AppUser } from '../types/domain';

const drawerWidth = 280;

function StaffClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right', mr: 0.75 }}>
      <Typography variant="body2" fontWeight={760} lineHeight={1.15}>
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1.35} sx={{ minHeight: 84, px: 2.25 }}>
        <Box sx={{ display: 'grid', width: 44, height: 44, placeItems: 'center', borderRadius: 2.5, bgcolor: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.13)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)', flexShrink: 0 }}>
          <Box component="img" src={qhsMark} alt="" sx={{ width: 35, height: 35 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography color="common.white" fontWeight={800} fontSize="0.94rem" letterSpacing="-.01em" lineHeight={1.15}>
            QHS Inventory
          </Typography>
          <Typography sx={{ mt: 0.25, color: 'rgba(255,255,255,.6)', fontSize: '0.69rem', letterSpacing: '.02em' }}>
            Equipment operations
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ mx: 1.25, mb: 1.35, p: 1.5, borderRadius: 2.75, bgcolor: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.095)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)' }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar
            src={user?.avatar ? assetUrl(`/storage/${user.avatar}`) : undefined}
            alt={user?.name || 'Account'}
            sx={{ width: 40, height: 40, bgcolor: '#D19A3E', color: '#2B1800', fontWeight: 820, border: '2px solid rgba(255,255,255,.12)' }}
          >
            {getInitials(user?.name)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography color="common.white" fontWeight={740} noWrap fontSize="0.87rem">
              {user?.name || 'Loading account…'}
            </Typography>
            <Chip
              label={roleLabel}
              size="small"
              sx={{ mt: 0.45, height: 22, bgcolor: 'rgba(232,187,105,.15)', color: '#F5D99F', border: '1px solid rgba(232,187,105,.12)', fontSize: '0.64rem' }}
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
          <Box key={section.label} sx={{ mb: 1.55 }}>
            <Typography
              sx={{ px: 1.45, pt: 1, pb: 0.75, color: 'rgba(255,255,255,.42)', fontSize: '0.63rem', fontWeight: 820, letterSpacing: '.14em', textTransform: 'uppercase' }}
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
                        minHeight: 44,
                        borderRadius: 2.15,
                        px: 1.4,
                        color: 'rgba(255,255,255,.72)',
                        position: 'relative',
                        '& .MuiListItemIcon-root': { color: 'inherit' },
                        '&:hover': { bgcolor: 'rgba(255,255,255,.075)', color: 'common.white', transform: 'translateX(2px)' },
                        transition: 'background-color .18s ease, color .18s ease, transform .18s ease',
                        '&.Mui-selected': {
                          bgcolor: 'rgba(255,255,255,.11)',
                          color: '#FFE3B2',
                          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.04)',
                          '&::before': { position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, borderRadius: '0 4px 4px 0', bgcolor: '#E9B75E', content: '""' },
                          '&:hover': { bgcolor: 'rgba(255,255,255,.14)' },
                        },
                        '&.Mui-disabled': { color: 'rgba(255,255,255,.28)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 39, '& svg': { fontSize: 20 } }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.855rem', fontWeight: selected ? 760 : 610 }} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,.09)' }} />
      <Box sx={{ px: 2.5, pt: 1.4 }}>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#67D59C', boxShadow: '0 0 0 4px rgba(103,213,156,.1)' }} />
          <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: '0.67rem', fontWeight: 650 }}>System connected</Typography>
        </Stack>
      </Box>
      <List sx={{ p: 1.25 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={onLogout}
            sx={{ minHeight: 44, borderRadius: 2.15, color: 'rgba(255,255,255,.72)', '&:hover': { bgcolor: 'rgba(255,255,255,.075)', color: 'common.white' } }}
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
            bgcolor: 'rgba(255,255,255,.86)',
            color: 'text.primary',
            backdropFilter: 'blur(18px) saturate(140%)',
            zIndex: (value) => value.zIndex.drawer - 1,
            ...(mode === 'dark' && { bgcolor: 'rgba(29,32,38,.88)' }),
          }}
        >
          <Toolbar sx={{ gap: { xs: 0.75, sm: 1.2 }, px: { xs: 1.5, sm: 3.25 } }}>
            <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography component="h1" variant="h6" noWrap sx={{ fontSize: { xs: '1rem', sm: '1.08rem' } }}>{title}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Quirino High School / {roleLabel} workspace
              </Typography>
            </Box>
            <Chip
              icon={<WifiTetheringIcon />}
              label="Live inventory"
              size="small"
              variant="outlined"
              sx={{ display: { xs: 'none', lg: 'inline-flex' }, color: 'success.main', borderColor: 'success.main', bgcolor: 'success.50', '& .MuiChip-icon': { color: 'inherit', fontSize: 15 } }}
            />
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
                sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontSize: '0.82rem', fontWeight: 800, border: '2px solid', borderColor: 'background.paper', boxShadow: '0 0 0 1px', color: 'primary.contrastText' }}
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
                bgcolor: '#350A18',
                backgroundImage: 'radial-gradient(circle at 25% -5%, rgba(210,151,66,.17), transparent 22rem), linear-gradient(180deg, #350A18 0%, #501126 58%, #2B0914 100%)',
                color: 'common.white',
                overflowX: 'hidden',
                '&::after': {
                  position: 'absolute',
                  right: -110,
                  bottom: 80,
                  width: 240,
                  height: 240,
                  border: '1px solid rgba(255,255,255,.045)',
                  borderRadius: '50%',
                  content: '""',
                  pointerEvents: 'none',
                },
              },
            }}
          >
            {drawerContent}
          </Drawer>
        </Box>

        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${drawerWidth}px)` }, position: 'relative' }}>
          <Toolbar />
          <Box className="staff-content">{children}</Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
