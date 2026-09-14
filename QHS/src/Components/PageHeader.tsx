import type { ReactNode } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  actions?: ReactNode;
  backTo?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
}

export default function PageHeader({ actions, backTo, description, eyebrow, meta, title }: PageHeaderProps) {
  return (
    <Box component="header" sx={{ mb: { xs: 2.5, md: 3.25 } }}>
      {backTo && (
        <Button component={Link} to={backTo} startIcon={<ArrowBackIcon />} size="small" color="inherit" sx={{ mb: 1.5, ml: -1 }}>
          Back
        </Button>
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.55 }}>
            {eyebrow && (
              <Typography variant="overline" color="primary" fontWeight={850} letterSpacing=".13em" lineHeight={1.4}>
                {eyebrow}
              </Typography>
            )}
            {meta && <Chip label={meta} size="small" variant="outlined" />}
          </Stack>
          <Typography component="h1" variant="h4" sx={{ color: 'text.primary', fontSize: { xs: '1.65rem', sm: '2rem' } }}>
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary" sx={{ mt: 0.7, maxWidth: 720, lineHeight: 1.65 }}>
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
    </Box>
  );
}
