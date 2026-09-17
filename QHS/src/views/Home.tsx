import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HistoryIcon from '@mui/icons-material/History';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../axiosClient';
import { useStateContext } from '../Context/ContextProvider';

interface TransactionSummary {
  status?: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useStateContext();
  const [stats, setStats] = useState({ active: 0, pending: 0, returned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    axiosClient.get<{ data: TransactionSummary[] }>('/transactions', { params: { per_page: 100 } })
      .then(({ data }) => {
        if (!active) return;
        const rows = data.data || [];
        setStats({
          active: rows.filter((item) => item.status === 'borrowed').length,
          pending: rows.filter((item) => item.status === 'pending').length,
          returned: rows.filter((item) => item.status === 'returned').length,
        });
      })
      .catch(() => active && setStats({ active: 0, pending: 0, returned: 0 }))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, []);

  const summary = [
    { label: 'Awaiting approval', value: stats.pending, icon: <HourglassEmptyIcon />, tone: 'warning.main' },
    { label: 'Currently borrowed', value: stats.active, icon: <LocalShippingOutlinedIcon />, tone: 'info.main' },
    { label: 'Returned requests', value: stats.returned, icon: <CheckCircleOutlineIcon />, tone: 'success.main' },
  ];

  const actions = [
    {
      title: 'Browse equipment',
      description: 'See what is available across every laboratory and add the units you need.',
      icon: <Inventory2OutlinedIcon />,
      action: 'Browse inventory',
      onClick: () => navigate('/laboratories'),
    },
    {
      title: 'Track my requests',
      description: 'Review pending approvals, active loans, returns, and staff updates.',
      icon: <HistoryIcon />,
      action: 'View request history',
      onClick: () => navigate('/borrow-history'),
    },
    {
      title: 'Keep details current',
      description: 'Check your contact details before requesting equipment from a laboratory.',
      icon: <PersonOutlineIcon />,
      action: 'Review profile',
      onClick: () => navigate('/profile'),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4.5 } }}>
      <Paper
        component="section"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 3, sm: 4.5, md: 5.5 },
          bgcolor: '#350A18',
          color: 'common.white',
          border: 0,
          borderRadius: { xs: 3, md: 4 },
          backgroundImage: 'radial-gradient(circle at 84% 15%, rgba(221,169,80,.24), transparent 24rem), linear-gradient(135deg, #350A18 0%, #65162F 68%, #791D3A 100%)',
          boxShadow: '0 24px 60px rgba(53,10,24,.2)',
          '&::after': {
            position: 'absolute',
            right: -135,
            bottom: -210,
            width: 480,
            height: 480,
            border: '72px solid rgba(255,255,255,.045)',
            borderRadius: '50%',
            content: '""',
          },
        }}
      >
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid item xs={12} md={7.3}>
            <Box sx={{ maxWidth: 720 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 22, height: 2, borderRadius: 2, bgcolor: '#E7B75E' }} />
                <Typography variant="overline" sx={{ color: '#F0CE91', fontWeight: 850, letterSpacing: '.15em' }}>
                  Student equipment portal
                </Typography>
              </Stack>
              <Typography component="h1" variant="h2" sx={{ mt: 1.2, fontSize: { xs: '2.2rem', sm: '3rem', md: '3.6rem' }, maxWidth: 680 }}>
                Ready for your next laboratory session.
              </Typography>
              <Typography sx={{ mt: 1.7, maxWidth: 600, color: 'rgba(255,255,255,.72)', fontSize: { sm: '1.04rem' }, lineHeight: 1.72 }}>
                Welcome, {user?.name || 'student'}. Find available equipment, send a request, and follow each handover from approval to return.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3.25 }}>
                <Button size="large" variant="contained" color="secondary" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/laboratories')}>
                  Browse equipment
                </Button>
                <Button
                  size="large"
                  variant="outlined"
                  onClick={() => navigate('/borrow-history')}
                  sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,.34)', '&:hover': { borderColor: 'common.white', bgcolor: 'rgba(255,255,255,.07)' } }}
                >
                  Track my requests
                </Button>
              </Stack>
            </Box>
          </Grid>
          <Grid item xs={12} md={4.7}>
            <Box sx={{ p: { xs: 2.25, sm: 2.75 }, border: '1px solid rgba(255,255,255,.13)', borderRadius: 3, bgcolor: 'rgba(24,2,10,.25)', backdropFilter: 'blur(12px)' }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,.52)' }}>My request snapshot</Typography>
              <Stack spacing={0} sx={{ mt: 1 }}>
                {summary.map((item, index) => (
                  <Stack key={item.label} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.4, borderBottom: index === summary.length - 1 ? 0 : '1px solid rgba(255,255,255,.1)' }}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Box sx={{ display: 'grid', width: 32, height: 32, placeItems: 'center', borderRadius: 1.8, bgcolor: 'rgba(255,255,255,.08)', color: '#F0CE91', '& svg': { fontSize: 18 } }}>{item.icon}</Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.72)' }}>{item.label}</Typography>
                    </Stack>
                    {loading ? <Skeleton width={26} sx={{ bgcolor: 'rgba(255,255,255,.1)' }} /> : <Typography variant="h6">{item.value}</Typography>}
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mt: 1.25 }}>
        {summary.map((item) => (
          <Grid item xs={12} sm={4} key={item.label}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden', '&::before': { position: 'absolute', inset: '0 auto 0 0', width: 4, bgcolor: item.tone, content: '""' } }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.75, p: { xs: 2.25, sm: 2.5 } }}>
                <Box sx={{ display: 'grid', width: 46, height: 46, placeItems: 'center', borderRadius: 2.4, bgcolor: `${item.tone.replace('.main', '.50')}`, color: item.tone, border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                  {item.icon}
                </Box>
                <Box>
                  {loading ? <Skeleton width={45} height={36} /> : <Typography variant="h4" fontSize="1.65rem">{item.value}</Typography>}
                  <Typography variant="body2" color="text.secondary" fontWeight={620}>{item.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box component="section" sx={{ mt: { xs: 4.5, md: 6 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-end' }} justifyContent="space-between" spacing={1} sx={{ mb: 2.75 }}>
          <Box>
            <Typography variant="overline" color="primary" fontWeight={850} letterSpacing=".12em">Quick actions</Typography>
            <Typography component="h2" variant="h4" sx={{ mt: 0.25 }}>What do you need today?</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">Choose a task to continue</Typography>
        </Stack>
        <Grid container spacing={2.5}>
          {actions.map((item) => (
            <Grid item xs={12} md={4} key={item.title}>
              <Card sx={{ height: '100%', transition: 'border-color .2s, transform .2s, box-shadow .2s', '&:hover': { borderColor: 'primary.light', transform: 'translateY(-3px)', boxShadow: '0 16px 36px rgba(24,33,43,.08)' } }}>
                <CardContent sx={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'flex-start', p: 3 }}>
                  <Box sx={{ display: 'grid', width: 48, height: 48, mb: 2.25, placeItems: 'center', borderRadius: 2.5, bgcolor: 'primary.50', color: 'primary.main', border: '1px solid', borderColor: 'divider' }}>
                    {item.icon}
                  </Box>
                  <Typography variant="h6">{item.title}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.75, mb: 2.5, lineHeight: 1.65 }}>{item.description}</Typography>
                  <Button onClick={item.onClick} endIcon={<ArrowForwardIcon />} sx={{ mt: 'auto', ml: -1, px: 1 }}>
                    {item.action}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Paper component="section" variant="outlined" sx={{ mt: { xs: 4, md: 5 }, p: { xs: 2.75, sm: 3.75 }, borderRadius: 3 }}>
        <Typography variant="overline" color="primary">Simple and accountable</Typography>
        <Typography component="h2" variant="h5" sx={{ mt: 0.15 }}>How borrowing works</Typography>
        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          {[
            ['01', 'Choose equipment', 'Browse a laboratory and add available equipment to your request.'],
            ['02', 'Wait for approval', 'The assigned custodian reviews your request and confirms the available units.'],
            ['03', 'Collect and return', 'Collect approved equipment, use it responsibly, and return it on time.'],
          ].map(([number, title, description]) => (
            <Grid item xs={12} md={4} key={number}>
              <Stack direction="row" spacing={1.6} alignItems="flex-start">
                <Box sx={{ display: 'grid', width: 34, height: 34, placeItems: 'center', borderRadius: '50%', bgcolor: 'primary.50', color: 'primary.main', fontSize: '0.72rem', fontWeight: 850, flexShrink: 0 }}>{number}</Box>
                <Box>
                  <Typography fontWeight={750}>{title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.6 }}>{description}</Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
}
