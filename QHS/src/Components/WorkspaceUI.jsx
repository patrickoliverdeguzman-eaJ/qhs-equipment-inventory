import {
  Box,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export function SectionCard({ children, sx, ...props }) {
  return (
    <Paper
      variant="outlined"
      {...props}
      sx={{
        overflow: 'hidden',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

export function SectionHeading({ action, description, icon, title, sx }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ px: { xs: 2, sm: 2.5 }, py: 2, borderBottom: 1, borderColor: 'divider', ...sx }}
    >
      <Stack direction="row" spacing={1.4} alignItems="center" sx={{ minWidth: 0 }}>
        {icon && (
          <Box sx={{ display: 'grid', width: 36, height: 36, flexShrink: 0, placeItems: 'center', borderRadius: 2, bgcolor: 'primary.50', color: 'primary.main' }}>
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="subtitle1" fontWeight={780}>{title}</Typography>
          {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2 }}>{description}</Typography>}
        </Box>
      </Stack>
      {action}
    </Stack>
  );
}

export function MetricCard({ icon, label, loading, tone = 'primary', value, helper }) {
  return (
    <Paper variant="outlined" sx={{ height: '100%', p: { xs: 2, sm: 2.25 }, borderColor: 'divider' }}>
      <Stack direction="row" spacing={1.6} alignItems="center">
        <Box
          sx={{
            display: 'grid',
            width: 42,
            height: 42,
            flexShrink: 0,
            placeItems: 'center',
            borderRadius: 2,
            bgcolor: `${tone}.50`,
            color: `${tone}.main`,
            '& svg': { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          {loading ? <Skeleton width={52} height={34} /> : <Typography variant="h5" lineHeight={1.1}>{value}</Typography>}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>{label}</Typography>
          {helper && <Typography variant="caption" color="text.secondary">{helper}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}

export function EmptyState({ action, description, icon, title = 'Nothing here yet', sx }) {
  return (
    <Box
      sx={{
        display: 'grid',
        minHeight: 220,
        placeItems: 'center',
        px: 3,
        py: 6,
        textAlign: 'center',
        ...sx,
      }}
    >
      <Box sx={{ maxWidth: 430 }}>
        <Box sx={{ display: 'grid', width: 52, height: 52, mx: 'auto', mb: 1.75, placeItems: 'center', borderRadius: 2.5, bgcolor: 'action.hover', color: 'text.secondary' }}>
          {icon || <InboxOutlinedIcon />}
        </Box>
        <Typography variant="h6">{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.65 }}>{description}</Typography>}
        {action && <Box sx={{ mt: 2.25 }}>{action}</Box>}
      </Box>
    </Box>
  );
}

export function StatusPill({ label, tone = 'default', ...props }) {
  return <Chip label={label} color={tone} size="small" variant={tone === 'default' ? 'outlined' : 'filled'} {...props} />;
}

export function DetailRow({ label, value, divider = true }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      spacing={0.5}
      sx={{ py: 1.25, borderBottom: divider ? 1 : 0, borderColor: 'divider' }}
    >
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={700} sx={{ textAlign: { sm: 'right' }, wordBreak: 'break-word' }}>{value || '—'}</Typography>
    </Stack>
  );
}
