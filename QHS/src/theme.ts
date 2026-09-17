import { alpha, createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

export const brand = {
  maroon: '#68162F',
  maroonDark: '#350A18',
  maroonLight: '#A74462',
  gold: '#C58A24',
  goldLight: '#F3D9A5',
  canvas: '#F4F6F8',
  cream: '#FCFAF7',
  ink: '#18212B',
  slate: '#667085',
};

export const createAppTheme = (mode: PaletteMode = 'light') => {
  const dark = mode === 'dark';
  const divider = dark ? alpha('#FFFFFF', 0.12) : '#E3E7EC';
  const paper = dark ? '#1D2026' : '#FFFFFF';
  const canvas = dark ? '#12151A' : brand.canvas;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: dark ? '#E6A0B4' : brand.maroon,
        dark: dark ? '#F4C9D5' : brand.maroonDark,
        light: dark ? '#C8738C' : brand.maroonLight,
        contrastText: '#FFFFFF',
        50: dark ? 'rgba(230,160,180,.12)' : '#F8ECF0',
      },
      secondary: {
        main: dark ? '#E8BB69' : brand.gold,
        dark: dark ? '#F0D398' : '#8D5C0D',
        light: dark ? '#CAA056' : brand.goldLight,
        contrastText: dark ? '#211A0F' : '#FFFFFF',
        50: dark ? 'rgba(232,187,105,.13)' : '#FCF4E5',
      },
      success: { main: dark ? '#61C795' : '#187A55', 50: dark ? 'rgba(97,199,149,.12)' : '#E8F5EE' },
      warning: { main: dark ? '#F4B860' : '#B96212', 50: dark ? 'rgba(244,184,96,.12)' : '#FFF2E1' },
      error: { main: dark ? '#F2848C' : '#C03442', 50: dark ? 'rgba(242,132,140,.12)' : '#FCECEE' },
      info: { main: dark ? '#6DB5EA' : '#256FA6', 50: dark ? 'rgba(109,181,234,.12)' : '#EAF3FA' },
      background: { default: canvas, paper },
      text: {
        primary: dark ? '#F6F7F9' : brand.ink,
        secondary: dark ? '#AEB6C2' : brand.slate,
      },
      divider,
      action: {
        hover: dark ? 'rgba(255,255,255,.055)' : 'rgba(24,33,43,.035)',
        selected: dark ? 'rgba(230,160,180,.12)' : 'rgba(104,22,47,.07)',
      },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: { fontWeight: 780, letterSpacing: '-0.045em', lineHeight: 1.08 },
      h2: { fontWeight: 770, letterSpacing: '-0.038em', lineHeight: 1.1 },
      h3: { fontWeight: 760, letterSpacing: '-0.032em', lineHeight: 1.14 },
      h4: { fontWeight: 750, letterSpacing: '-0.027em', lineHeight: 1.18 },
      h5: { fontWeight: 740, letterSpacing: '-0.02em', lineHeight: 1.22 },
      h6: { fontWeight: 730, letterSpacing: '-0.012em', lineHeight: 1.28 },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 700 },
      body1: { lineHeight: 1.65 },
      body2: { lineHeight: 1.55 },
      overline: { fontSize: '0.7rem', fontWeight: 800, letterSpacing: '.14em', lineHeight: 1.8 },
      button: { fontWeight: 720, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { minWidth: 320, scrollBehavior: 'smooth' },
          body: {
            minWidth: 320,
            minHeight: '100vh',
            backgroundColor: canvas,
            backgroundImage: dark
              ? 'radial-gradient(circle at 90% 8%, rgba(200,115,140,.08), transparent 24rem)'
              : 'radial-gradient(circle at 90% 8%, rgba(104,22,47,.045), transparent 27rem)',
            backgroundAttachment: 'fixed',
          },
          '#root': { minHeight: '100vh' },
          '::selection': { backgroundColor: alpha(brand.maroon, 0.2) },
          '*': { scrollbarColor: `${dark ? '#4C515C' : '#C9CED6'} transparent` },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: dark ? '#4C515C' : '#C9CED6',
            border: `3px solid ${canvas}`,
            borderRadius: 10,
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: 'none', borderBottom: `1px solid ${divider}` } },
      },
      MuiToolbar: { styleOverrides: { root: { minHeight: 72 } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 42,
            borderRadius: 11,
            paddingInline: 18,
            textTransform: 'none',
            boxShadow: 'none',
            transition: 'background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease, box-shadow .18s ease',
            '&:active': { transform: 'translateY(1px)' },
          },
          containedPrimary: {
            backgroundImage: dark ? 'none' : `linear-gradient(135deg, ${brand.maroon}, #841D3C)`,
            '&:hover': { boxShadow: dark ? 'none' : '0 8px 20px rgba(104,22,47,.2)' },
          },
          outlined: { borderColor: divider },
          sizeSmall: { minHeight: 36, borderRadius: 9, paddingInline: 13 },
          sizeLarge: { minHeight: 48, borderRadius: 12, paddingInline: 22 },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            width: 40,
            height: 40,
            borderRadius: 11,
            transition: 'background-color .18s ease, color .18s ease, transform .18s ease',
            '&:active': { transform: 'scale(.96)' },
          },
          sizeSmall: { width: 34, height: 34, borderRadius: 9 },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          rounded: { borderRadius: 18 },
          elevation1: { border: `1px solid ${divider}`, boxShadow: dark ? 'none' : '0 1px 2px rgba(24,33,43,.03)' },
          elevation2: { border: `1px solid ${divider}`, boxShadow: dark ? 'none' : '0 10px 32px rgba(24,33,43,.06)' },
          elevation3: { border: `1px solid ${divider}`, boxShadow: dark ? 'none' : '0 14px 38px rgba(24,33,43,.075)' },
          elevation4: { border: `1px solid ${divider}`, boxShadow: dark ? 'none' : '0 18px 46px rgba(24,33,43,.085)' },
          elevation6: { border: `1px solid ${divider}`, boxShadow: dark ? '0 20px 52px rgba(0,0,0,.28)' : '0 22px 54px rgba(24,33,43,.11)' },
          elevation8: { border: `1px solid ${divider}`, boxShadow: dark ? '0 24px 62px rgba(0,0,0,.32)' : '0 26px 68px rgba(24,33,43,.13)' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${divider}`,
            borderRadius: 18,
            backgroundColor: paper,
            backgroundImage: 'none',
            boxShadow: dark ? 'none' : '0 1px 2px rgba(24,33,43,.025)',
          },
        },
      },
      MuiCardContent: { styleOverrides: { root: { padding: 24, '&:last-child': { paddingBottom: 24 } } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 46,
            borderRadius: 11,
            backgroundColor: paper,
            transition: 'box-shadow .18s ease, background-color .18s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: dark ? '#89919D' : '#98A2B3' },
            '&.Mui-focused': { boxShadow: `0 0 0 4px ${alpha(dark ? '#E6A0B4' : brand.maroon, 0.09)}` },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1.5 },
          },
          notchedOutline: { borderColor: divider },
        },
      },
      MuiInputLabel: { styleOverrides: { root: { fontWeight: 650 } } },
      MuiFormHelperText: { styleOverrides: { root: { marginLeft: 2, lineHeight: 1.45 } } },
      MuiTableContainer: { styleOverrides: { root: { border: `1px solid ${divider}`, borderRadius: 16, boxShadow: 'none' } } },
      MuiTableHead: { styleOverrides: { root: { backgroundColor: dark ? '#272B32' : '#F7F8FA' } } },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: divider, paddingBlock: 15 },
          head: {
            backgroundColor: 'transparent', color: dark ? '#DBDEE4' : '#475467', fontSize: '0.7rem',
            fontWeight: 800, letterSpacing: '0.065em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:last-child td': { borderBottom: 0 } },
          hover: { '&:hover': { backgroundColor: `${alpha(brand.maroon, dark ? 0.13 : 0.026)} !important` } },
        },
      },
      MuiTabs: { styleOverrides: { root: { minHeight: 48 }, indicator: { height: 3, borderRadius: '3px 3px 0 0' } } },
      MuiTab: { styleOverrides: { root: { minHeight: 48, paddingInline: 17, textTransform: 'none', fontWeight: 700 } } },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            minHeight: 38, borderColor: divider, borderRadius: '10px !important', textTransform: 'none', fontWeight: 700,
            '&.Mui-selected': { color: dark ? '#F2CCD7' : brand.maroon, backgroundColor: alpha(brand.maroon, dark ? .18 : .07) },
          },
        },
      },
      MuiToggleButtonGroup: { styleOverrides: { root: { gap: 6, flexWrap: 'wrap' }, grouped: { margin: 0, border: `1px solid ${divider} !important` } } },
      MuiTablePagination: { styleOverrides: { toolbar: { minHeight: 60, paddingInline: 16 } } },
      MuiDialog: {
        styleOverrides: {
          paper: { border: `1px solid ${divider}`, borderRadius: 20, boxShadow: dark ? '0 28px 90px rgba(0,0,0,.48)' : '0 28px 90px rgba(24,33,43,.2)' },
        },
      },
      MuiDialogTitle: { styleOverrides: { root: { padding: '24px 26px 14px', fontWeight: 750 } } },
      MuiDialogContent: { styleOverrides: { root: { paddingInline: 26 } } },
      MuiDialogActions: { styleOverrides: { root: { gap: 8, padding: '18px 26px 24px' } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 12, alignItems: 'center' }, message: { lineHeight: 1.55 } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 9, fontWeight: 700 }, sizeSmall: { height: 26, fontSize: '0.72rem' } } },
      MuiMenu: { styleOverrides: { paper: { marginTop: 8, borderRadius: 14, paddingBlock: 6 } } },
      MuiMenuItem: { styleOverrides: { root: { minHeight: 42, marginInline: 6, borderRadius: 9 } } },
      MuiPopover: { styleOverrides: { paper: { borderRadius: 16, boxShadow: dark ? '0 24px 70px rgba(0,0,0,.42)' : '0 22px 60px rgba(24,33,43,.15)' } } },
      MuiTooltip: { defaultProps: { arrow: true }, styleOverrides: { tooltip: { borderRadius: 8, fontSize: '0.72rem' } } },
      MuiSkeleton: { styleOverrides: { root: { borderRadius: 7 } } },
    },
  });
};

export const appTheme = createAppTheme('light');
