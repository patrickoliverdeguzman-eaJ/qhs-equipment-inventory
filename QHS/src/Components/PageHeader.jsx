import { Box, Stack, Typography } from '@mui/material';

export default function PageHeader({ actions, description, eyebrow, title }) {
  return (
    <Stack
      component="header"
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography variant="overline" color="primary" fontWeight={850} letterSpacing=".12em">
            {eyebrow}
          </Typography>
        )}
        <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary" sx={{ mt: 0.65, maxWidth: 680, lineHeight: 1.6 }}>
            {description}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexShrink: 0 }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
