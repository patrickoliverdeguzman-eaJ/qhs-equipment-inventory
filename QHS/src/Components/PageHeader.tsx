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
    <Box component="header" sx={{ mb: { xs: 2.5, md: 3.5 } }}>
      {backTo && (
        <Button component={Link} to={backTo} startIcon={<ArrowBackIcon />} size="small" color="inherit" sx={{ mb: 1.25, ml: -1 }}>
          Back
        </Button>
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={2.5}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          px: { xs: 2.4, sm: 3.25 },
          py: { xs: 2.5, sm: 3 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3.25,
          bgcolor: 'background.paper',
          boxShadow: '0 1px 2px rgba(24,33,43,.025)',
          '&::after': {
            position: 'absolute',
            top: -76,
            right: -36,
            width: 220,
            height: 220,
            border: '34px solid',
            borderColor: 'primary.50',
            borderRadius: '50%',
            content: '""',
            opacity: 0.72,
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.55 }}>
            {eyebrow && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, color: 'primary.main' }}>
                <Box sx={{ width: 17, height: 2, borderRadius: 1, bgcolor: 'secondary.main' }} />
                <Typography variant="overline" color="inherit" fontWeight={850} letterSpacing=".13em" lineHeight={1.4}>
                  {eyebrow}
                </Typography>
              </Box>
            )}
            {meta && <Chip label={meta} size="small" variant="outlined" />}
          </Stack>
          <Typography component="h1" variant="h4" sx={{ color: 'text.primary', fontSize: { xs: '1.65rem', sm: '2.05rem' }, maxWidth: 820 }}>
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary" sx={{ mt: 0.8, maxWidth: 760, lineHeight: 1.65 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
