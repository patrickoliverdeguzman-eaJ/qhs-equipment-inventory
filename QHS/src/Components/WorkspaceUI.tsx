import type { ReactNode } from 'react';
import {
  Box,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import type { ChipProps, PaperProps, SxProps, Theme } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

const mergeSx = (base: SxProps<Theme>, sx?: SxProps<Theme>): SxProps<Theme> => (
  [base, ...(Array.isArray(sx) ? sx : [sx])].filter(Boolean) as SxProps<Theme>
);

interface SectionCardProps extends Omit<PaperProps, 'children'> {
  children: ReactNode;
}

export function SectionCard({ children, sx, ...props }: SectionCardProps) {
  return (
    <Paper
      variant="outlined"
      {...props}
      sx={mergeSx({
        overflow: 'hidden',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderRadius: 3,
        boxShadow: '0 1px 2px rgba(24,33,43,.025)',
      }, sx)}
    >
      {children}
    </Paper>
  );
}

interface SectionHeadingProps {
  action?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
  sx?: SxProps<Theme>;
}

export function SectionHeading({ action, description, icon, title, sx }: SectionHeadingProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={mergeSx({ px: { xs: 2.25, sm: 3 }, py: 2.25, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }, sx)}
    >
      <Stack direction="row" spacing={1.4} alignItems="center" sx={{ minWidth: 0 }}>
        {icon && (
          <Box sx={{ display: 'grid', width: 40, height: 40, flexShrink: 0, placeItems: 'center', borderRadius: 2.25, bgcolor: 'primary.50', color: 'primary.main', border: '1px solid', borderColor: 'divider', '& svg': { fontSize: 21 } }}>
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="subtitle1" fontWeight={770} letterSpacing="-.01em">{title}</Typography>
          {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2 }}>{description}</Typography>}
        </Box>
      </Stack>
      {action}
    </Stack>
  );
}

type MetricTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

interface MetricCardProps {
  icon: ReactNode;
  label: ReactNode;
  loading?: boolean;
  tone?: MetricTone;
  value: ReactNode;
  helper?: ReactNode;
}

export function MetricCard({ icon, label, loading, tone = 'primary', value, helper }: MetricCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        p: { xs: 2.25, sm: 2.5 },
        borderColor: 'divider',
        transition: 'border-color .2s ease, transform .2s ease, box-shadow .2s ease',
        '&::before': { position: 'absolute', inset: '0 auto 0 0', width: 4, bgcolor: `${tone}.main`, content: '""' },
        '&:hover': { borderColor: `${tone}.main`, transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(24,33,43,.07)' },
      }}
    >
      <Stack direction="row" spacing={1.75} alignItems="center">
        <Box
          sx={{
            display: 'grid',
            width: 46,
            height: 46,
            flexShrink: 0,
            placeItems: 'center',
            borderRadius: 2.4,
            bgcolor: `${tone}.50`,
            color: `${tone}.main`,
            border: '1px solid',
            borderColor: 'divider',
            '& svg': { fontSize: 23 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          {loading ? <Skeleton width={52} height={34} /> : <Typography variant="h4" fontSize="1.65rem" lineHeight={1.05}>{value}</Typography>}
          <Typography variant="body2" color="text.secondary" fontWeight={620} sx={{ mt: 0.45 }}>{label}</Typography>
          {helper && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>{helper}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}

interface EmptyStateProps {
  action?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  sx?: SxProps<Theme>;
}

export function EmptyState({ action, description, icon, title = 'Nothing here yet', sx }: EmptyStateProps) {
  return (
    <Box
      sx={mergeSx({
        display: 'grid',
        minHeight: 240,
        placeItems: 'center',
        px: 3,
        py: 6,
        textAlign: 'center',
      }, sx)}
    >
      <Box sx={{ maxWidth: 430 }}>
        <Box sx={{ display: 'grid', width: 56, height: 56, mx: 'auto', mb: 1.75, placeItems: 'center', borderRadius: 3, bgcolor: 'primary.50', color: 'primary.main', border: '1px solid', borderColor: 'divider' }}>
          {icon || <InboxOutlinedIcon />}
        </Box>
        <Typography variant="h6">{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.65 }}>{description}</Typography>}
        {action && <Box sx={{ mt: 2.25 }}>{action}</Box>}
      </Box>
    </Box>
  );
}

interface StatusPillProps extends Omit<ChipProps, 'color' | 'label' | 'variant'> {
  label: ReactNode;
  tone?: ChipProps['color'];
}

export function StatusPill({ label, tone = 'default', ...props }: StatusPillProps) {
  return <Chip label={label} color={tone} size="small" variant={tone === 'default' ? 'outlined' : 'filled'} sx={{ px: 0.25 }} {...props} />;
}

interface DetailRowProps {
  label: ReactNode;
  value?: ReactNode;
  divider?: boolean;
}

export function DetailRow({ label, value, divider = true }: DetailRowProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      spacing={0.5}
      sx={{ py: 1.4, borderBottom: divider ? 1 : 0, borderColor: 'divider' }}
    >
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={700} sx={{ textAlign: { sm: 'right' }, wordBreak: 'break-word' }}>{value ?? '—'}</Typography>
    </Stack>
  );
}
