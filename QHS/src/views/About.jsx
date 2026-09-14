import {
  Box,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';

const values = [
  { icon: <SchoolOutlinedIcon />, title: 'Learning first', description: 'Equipment should be easy to find and ready when a class or activity needs it.' },
  { icon: <HandshakeOutlinedIcon />, title: 'Shared responsibility', description: 'Clear ownership and borrowing records help everyone care for school resources.' },
  { icon: <TrackChangesOutlinedIcon />, title: 'Reliable records', description: 'Accurate status and history support better planning, maintenance, and decisions.' },
  { icon: <GroupsOutlinedIcon />, title: 'One school community', description: 'Students, custodians, and administrators work from the same trusted information.' },
];

const capabilities = [
  'Browse equipment by laboratory and availability',
  'Submit borrowing requests from one simple cart',
  'Follow approvals, active loans, and returns',
  'Maintain a clear unit-level inventory history',
];

export default function About() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
      <Grid container spacing={{ xs: 3, md: 5 }} alignItems="stretch">
        <Grid item xs={12} md={7}>
          <Box component="header" sx={{ py: { xs: 1, md: 4 } }}>
            <Typography variant="overline" color="primary" fontWeight={850} letterSpacing=".14em">About the platform</Typography>
            <Typography component="h1" variant="h2" sx={{ mt: 1, maxWidth: 720, fontSize: { xs: '2.25rem', sm: '3.25rem', md: '4rem' }, lineHeight: 1.04 }}>
              Better stewardship of every learning resource.
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2.25, maxWidth: 650, fontSize: { sm: '1.08rem' }, lineHeight: 1.8 }}>
              QHS Inventory gives Quirino High School one dependable place to organize laboratory equipment, coordinate borrowing, and keep an accountable record of every unit.
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ height: '100%', p: { xs: 3, md: 4 }, bgcolor: 'primary.main', color: 'common.white', border: 0 }}>
            <Typography variant="overline" sx={{ color: 'secondary.light', fontWeight: 850, letterSpacing: '.14em' }}>Our purpose</Typography>
            <Typography component="h2" variant="h4" sx={{ mt: 1.25 }}>Equipment ready for real learning.</Typography>
            <Typography sx={{ mt: 2, color: 'rgba(255,255,255,.75)', lineHeight: 1.75 }}>
              We reduce uncertainty around what the school owns, where it belongs, who is using it, and what needs attention—so staff can spend less time reconciling records and more time supporting students.
            </Typography>
            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,.16)' }} />
            <Stack direction="row" spacing={1.4} alignItems="center">
              <Inventory2OutlinedIcon sx={{ color: 'secondary.light' }} />
              <Typography variant="body2" fontWeight={720}>Built for the daily rhythm of a school laboratory</Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Box component="section" sx={{ mt: { xs: 6, md: 9 } }}>
        <Typography variant="overline" color="primary" fontWeight={850} letterSpacing=".12em">Principles</Typography>
        <Typography component="h2" variant="h4" sx={{ mt: 0.5, mb: 3 }}>What guides the experience</Typography>
        <Grid container columnSpacing={4} rowSpacing={0}>
          {values.map((item) => (
            <Grid item xs={12} md={6} key={item.title}>
              <Stack direction="row" spacing={2} sx={{ py: 3, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'grid', width: 44, height: 44, flexShrink: 0, placeItems: 'center', borderRadius: 2.25, bgcolor: 'primary.50', color: 'primary.main' }}>{item.icon}</Box>
                <Box>
                  <Typography variant="h6">{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6, maxWidth: 460, lineHeight: 1.7 }}>{item.description}</Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Paper component="section" variant="outlined" sx={{ mt: { xs: 5, md: 7 }, p: { xs: 3, md: 4.5 } }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={5}>
            <Typography variant="overline" color="primary" fontWeight={850} letterSpacing=".12em">One connected workflow</Typography>
            <Typography component="h2" variant="h4" sx={{ mt: 0.5 }}>From discovery to return</Typography>
            <Typography color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.7 }}>
              Every part of the system supports the same record, reducing duplicate work and keeping the next action clear.
            </Typography>
          </Grid>
          <Grid item xs={12} md={7}>
            <Stack spacing={1.5}>
              {capabilities.map((item) => (
                <Stack direction="row" spacing={1.4} alignItems="center" key={item}>
                  <CheckCircleOutlineIcon color="success" fontSize="small" />
                  <Typography>{item}</Typography>
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
