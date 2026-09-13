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

export default function Home() {
  const navigate = useNavigate();
  const { user } = useStateContext();
  const [stats, setStats] = useState({ active: 0, pending: 0, returned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    axiosClient.get('/transactions', { params: { per_page: 100 } })
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
          p: { xs: 3, sm: 4.5, md: 6 },
          bgcolor: '#4C1020',
          color: 'common.white',
          border: 0,
          '&::after': {
            position: 'absolute',
            top: -150,
            right: -100,
            width: 360,
            height: 360,
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: '50%',
            content: '""',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 720 }}>
          <Typography variant="overline" sx={{ color: '#E7BF7C', fontWeight: 850, letterSpacing: '.15em' }}>
            Student equipment portal
          </Typography>
          <Typography component="h1" variant="h3" sx={{ mt: 0.75, fontSize: { xs: '2rem', sm: '2.75rem', md: '3.25rem' } }}>
            Welcome, {user?.name || 'student'}
          </Typography>
          <Typography sx={{ mt: 1.5, maxWidth: 610, color: 'rgba(255,255,255,.74)', fontSize: { sm: '1.05rem' }, lineHeight: 1.7 }}>
            Find laboratory equipment, submit a clear borrowing request, and follow every update in one place.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3 }}>
            <Button variant="contained" color="secondary" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/laboratories')}>
              Browse equipment
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/borrow-history')}
              sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,.4)', '&:hover': { borderColor: 'common.white', bgcolor: 'rgba(255,255,255,.06)' } }}
            >
              My requests
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {summary.map((item) => (
          <Grid item xs={12} sm={4} key={item.label}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Box sx={{ display: 'grid', width: 44, height: 44, placeItems: 'center', borderRadius: 2.25, bgcolor: item.tone, color: 'common.white', flexShrink: 0 }}>
                  {item.icon}
                </Box>
                <Box>
                  {loading ? <Skeleton width={45} height={36} /> : <Typography variant="h5">{item.value}</Typography>}
                  <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box component="section" sx={{ mt: { xs: 4, md: 5 } }}>
        <Typography variant="overline" color="primary" fontWeight={850} letterSpacing=".12em">Quick actions</Typography>
        <Typography component="h2" variant="h4" sx={{ mt: 0.25, mb: 2.5 }}>What do you need today?</Typography>
        <Grid container spacing={2.5}>
          {actions.map((item) => (
            <Grid item xs={12} md={4} key={item.title}>
              <Card sx={{ height: '100%', transition: 'border-color .2s, transform .2s', '&:hover': { borderColor: 'primary.light', transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'grid', width: 46, height: 46, mb: 2, placeItems: 'center', borderRadius: 2.25, bgcolor: 'rgba(116,27,50,.08)', color: 'primary.main' }}>
                    {item.icon}
                  </Box>
                  <Typography variant="h6">{item.title}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.75, mb: 2.5, lineHeight: 1.65 }}>{item.description}</Typography>
                  <Button onClick={item.onClick} endIcon={<ArrowForwardIcon />} sx={{ mt: 'auto', ml: -1 }}>
                    {item.action}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Paper component="section" sx={{ mt: { xs: 4, md: 5 }, p: { xs: 2.5, sm: 3.5 } }}>
        <Typography component="h2" variant="h5">How borrowing works</Typography>
        <Grid container spacing={2.5} sx={{ mt: 0.25 }}>
          {[
            ['01', 'Choose equipment', 'Browse a laboratory and add available equipment to your request.'],
            ['02', 'Wait for approval', 'The assigned custodian reviews your request and confirms the available units.'],
            ['03', 'Collect and return', 'Collect approved equipment, use it responsibly, and return it on time.'],
          ].map(([number, title, description]) => (
            <Grid item xs={12} md={4} key={number}>
              <Stack direction="row" spacing={1.6} alignItems="flex-start">
                <Typography sx={{ color: 'primary.main', fontWeight: 850, letterSpacing: '.08em' }}>{number}</Typography>
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
