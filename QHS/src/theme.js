import { alpha, createTheme } from '@mui/material/styles';

export const brand = {
  maroon: '#741B32',
  maroonDark: '#4C1020',
  maroonLight: '#9B3B54',
  gold: '#B7791F',
  canvas: '#F7F6F3',
  ink: '#241C1E',
};

export const createAppTheme = (mode = 'light') => {
  const dark = mode === 'dark';
  const divider = dark ? alpha('#FFFFFF', 0.12) : '#E6DFDC';
  const paper = dark ? '#211D1F' : '#FFFFFF';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: dark ? '#E6A0B2' : brand.maroon,
        dark: dark ? '#F2C2CE' : brand.maroonDark,
        light: dark ? '#C77C91' : brand.maroonLight,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: dark ? '#E8BC72' : brand.gold,
        dark: '#82540F',
        contrastText: dark ? '#241C1E' : '#FFFFFF',
      },
      success: { main: dark ? '#6CCB91' : '#267A4A' },
      warning: { main: dark ? '#F2B85B' : '#A85D0B' },
      error: { main: dark ? '#F28B8B' : '#B3262E' },
      info: { main: dark ? '#72B9ED' : '#276B9A' },
      background: {
        default: dark ? '#171416' : brand.canvas,
        paper,
      },
      text: {
        primary: dark ? '#F7F2F3' : brand.ink,
        secondary: dark ? '#C8BEC1' : '#6B6063',
      },
      divider,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: { fontWeight: 760, letterSpacing: '-0.035em' },
      h2: { fontWeight: 750, letterSpacing: '-0.03em' },
      h3: { fontWeight: 740, letterSpacing: '-0.025em' },
      h4: { fontWeight: 730, letterSpacing: '-0.02em' },
      h5: { fontWeight: 720, letterSpacing: '-0.015em' },
      h6: { fontWeight: 700, letterSpacing: '-0.01em' },
      button: { fontWeight: 700, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { minWidth: 320, scrollBehavior: 'smooth' },
          body: {
            minWidth: 320,
            minHeight: '100vh',
            backgroundImage: dark
              ? 'radial-gradient(circle at top right, rgba(116, 27, 50, 0.12), transparent 28rem)'
              : 'radial-gradient(circle at top right, rgba(116, 27, 50, 0.045), transparent 32rem)',
          },
          '#root': { minHeight: '100vh' },
          '::selection': {
            backgroundColor: alpha(brand.maroon, 0.2),
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderBottom: `1px solid ${divider}`,
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: { minHeight: 68 },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 40,
            borderRadius: 10,
            paddingInline: 16,
            textTransform: 'none',
            boxShadow: 'none',
          },
          containedPrimary: {
            '&:hover': { boxShadow: `0 8px 22px ${alpha(brand.maroon, 0.2)}` },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            width: 40,
            height: 40,
            borderRadius: 10,
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          rounded: { borderRadius: 14 },
          elevation1: { border: `1px solid ${divider}`, boxShadow: 'none' },
          elevation2: { border: `1px solid ${divider}`, boxShadow: dark ? 'none' : '0 8px 28px rgba(58, 36, 42, 0.06)' },
          elevation3: { border: `1px solid ${divider}`, boxShadow: dark ? 'none' : '0 12px 34px rgba(58, 36, 42, 0.07)' },
          elevation4: { border: `1px solid ${divider}`, boxShadow: dark ? 'none' : '0 14px 38px rgba(58, 36, 42, 0.08)' },
          elevation6: { border: `1px solid ${divider}`, boxShadow: dark ? 'none' : '0 18px 46px rgba(58, 36, 42, 0.1)' },
          elevation8: { border: `1px solid ${divider}`, boxShadow: dark ? 'none' : '0 20px 52px rgba(58, 36, 42, 0.11)' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${divider}`,
            borderRadius: 14,
            backgroundImage: 'none',
            boxShadow: dark ? 'none' : '0 8px 24px rgba(58, 36, 42, 0.055)',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 22,
            '&:last-child': { paddingBottom: 22 },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: paper,
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: dark ? '#A68F96' : '#9D8E92' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 2 },
          },
          notchedOutline: { borderColor: divider },
        },
      },
      MuiInputLabel: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
      MuiFormHelperText: {
        styleOverrides: { root: { marginLeft: 2 } },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            border: `1px solid ${divider}`,
            borderRadius: 14,
            boxShadow: 'none',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: { backgroundColor: dark ? '#2C2729' : '#F2EFED' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: divider,
            paddingBlock: 14,
          },
          head: {
            backgroundColor: 'transparent',
            color: dark ? '#F5EDEF' : brand.maroonDark,
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.055em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:last-child td': { borderBottom: 0 } },
          hover: { '&:hover': { backgroundColor: `${alpha(brand.maroon, dark ? 0.14 : 0.035)} !important` } },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          toolbar: { minHeight: 58, paddingInline: 16 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            border: `1px solid ${divider}`,
            borderRadius: 16,
            boxShadow: dark ? '0 24px 80px rgba(0,0,0,.45)' : '0 24px 80px rgba(51, 30, 36, .18)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { padding: '22px 24px 14px', fontWeight: 750 } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { gap: 8, padding: '16px 24px 22px' } },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10, alignItems: 'center' },
          message: { lineHeight: 1.5 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 650 },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: true },
      },
    },
  });
};

export const appTheme = createAppTheme('light');
