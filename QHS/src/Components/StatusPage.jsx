import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from 'react-router-dom';
import qhsMark from '../assets/qhs-mark.svg';

export default function StatusPage({ code, eyebrow, message, title, to }) {
  return (
    <Box
      component="main"
      sx={{
        display: 'grid',
        minHeight: '100vh',
        p: 2,
        placeItems: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Paper sx={{ width: 'min(100%, 560px)', p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
        <Box component="img" src={qhsMark} alt="QHS Inventory" sx={{ width: 58, height: 58, mb: 2.5 }} />
        <Typography variant="overline" color="primary" fontWeight={850} letterSpacing=".15em">
          {eyebrow}
        </Typography>
        <Typography sx={{ mt: 0.5, color: 'text.disabled', fontSize: 'clamp(3.5rem, 12vw, 6rem)', fontWeight: 850, lineHeight: 1 }}>
          {code}
        </Typography>
        <Typography component="h1" variant="h4" sx={{ mt: 1.5 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 430, mx: 'auto', mt: 1.5, lineHeight: 1.7 }}>
          {message}
        </Typography>
        <Stack direction="row" justifyContent="center" sx={{ mt: 3.5 }}>
          <Button component={Link} to={to} variant="contained" startIcon={<ArrowBackIcon />}>
            Return to dashboard
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
