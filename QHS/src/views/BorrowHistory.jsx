import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Chip, CircularProgress, Container, Grid, Paper, Stack, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography,
} from '@mui/material';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import axiosClient from '../axiosClient';
import { useStateContext } from '../Context/ContextProvider';
import PageHeader from '../Components/PageHeader';
import { EmptyState, MetricCard, SectionCard } from '../Components/WorkspaceUI';

const statusMeta = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return { color: 'warning', icon: <HourglassTopIcon /> };
    case 'accepted':
    case 'borrowed': return { color: 'info', icon: <LocalShippingOutlinedIcon /> };
    case 'returned':
    case 'completed': return { color: 'success', icon: <CheckCircleOutlineIcon /> };
    case 'rejected': return { color: 'error', icon: <CancelOutlinedIcon /> };
    default: return { color: 'default', icon: <HistoryOutlinedIcon /> };
  }
};

const formatDate = (value) => value
  ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  : '—';

export default function BorrowHistory() {
  const { user, token } = useStateContext();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const fetchTransactions = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const response = await axiosClient.get('/transactions');
      setTransactions(response.data.data || response.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your request history could not be loaded.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return undefined;
    }
    fetchTransactions();
    const refresh = () => fetchTransactions(false);
    window.addEventListener('transactionUpdated', refresh);
    const interval = window.setInterval(refresh, 10_000);
    if (window.Echo) {
      try { window.Echo.private(`transactions.user.${user.id}`).listen('.transaction.updated', refresh); }
      catch { /* Polling remains available. */ }
    }
    return () => {
      window.removeEventListener('transactionUpdated', refresh);
      window.clearInterval(interval);
      if (window.Echo) {
        try { window.Echo.leave(`transactions.user.${user.id}`); } catch { /* Already disconnected. */ }
      }
    };
  }, [token, user?.id, navigate]);

  const groups = [
    { label: 'Pending', tone: 'warning', icon: <HourglassTopIcon />, rows: transactions.filter((item) => item.status?.toLowerCase() === 'pending'), empty: 'No requests are waiting for review.' },
    { label: 'Borrowed', tone: 'info', icon: <LocalShippingOutlinedIcon />, rows: transactions.filter((item) => ['accepted', 'borrowed'].includes(item.status?.toLowerCase())), empty: 'You do not have equipment currently checked out.' },
    { label: 'Returned', tone: 'success', icon: <CheckCircleOutlineIcon />, rows: transactions.filter((item) => ['returned', 'completed'].includes(item.status?.toLowerCase())), empty: 'Returned requests will appear here.' },
    { label: 'Rejected', tone: 'error', icon: <CancelOutlinedIcon />, rows: transactions.filter((item) => item.status?.toLowerCase() === 'rejected'), empty: 'You have no rejected requests.' },
  ];
  const current = groups[tabValue];

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <PageHeader eyebrow="Borrowing" title="My requests" description="Track every approval, active loan, return, and decision in one place." />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {groups.slice(0, 3).map((group) => (
          <Grid item xs={12} sm={4} key={group.label}>
            <MetricCard icon={group.icon} label={group.label === 'Pending' ? 'Awaiting approval' : group.label === 'Borrowed' ? 'Currently borrowed' : 'Returned requests'} value={group.rows.length} tone={group.tone} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5 }}>{error}</Alert>}

      <SectionCard>
        <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} variant="scrollable" scrollButtons="auto" aria-label="Request status filters" sx={{ px: { xs: 0.5, sm: 1.5 }, borderBottom: 1, borderColor: 'divider' }}>
          {groups.map((group) => <Tab key={group.label} label={`${group.label} (${group.rows.length})`} />)}
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'grid', minHeight: 280, placeItems: 'center' }}><CircularProgress /></Box>
        ) : current.rows.length === 0 ? (
          <EmptyState icon={current.icon} title={`No ${current.label.toLowerCase()} requests`} description={current.empty} />
        ) : (
          <RequestList rows={current.rows} group={current.label.toLowerCase()} />
        )}
      </SectionCard>
    </Container>
  );
}

function RequestList({ rows, group }) {
  return (
    <>
      <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' }, p: 1.5 }}>
        {rows.map((transaction) => (
          <Paper variant="outlined" key={transaction.id} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">Request</Typography>
                <Typography variant="h6">#{transaction.id}</Typography>
              </Box>
              <RequestStatus status={transaction.status} />
            </Stack>
            <Typography variant="body2" fontWeight={720} sx={{ mt: 1.75 }}>{transaction.laboratory?.name || `Laboratory ${transaction.laboratory_id || ''}`}</Typography>
            <Stack spacing={0.4} sx={{ mt: 1 }}>
              {transaction.equipment?.length ? transaction.equipment.map((item, index) => (
                <Stack direction="row" justifyContent="space-between" spacing={2} key={`${item.id || item.name}-${index}`}>
                  <Typography variant="body2" color="text.secondary">{item.name || 'Equipment'}</Typography>
                  <Typography variant="body2" fontWeight={700}>×{item.quantity || 1}</Typography>
                </Stack>
              )) : <Typography variant="body2" color="text.secondary">No equipment details</Typography>}
            </Stack>
            <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mt: 1.75, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">Requested {formatDate(transaction.created_at)}</Typography>
              {group === 'rejected' && transaction.rejection_reason && <Typography variant="caption" color="error.main" sx={{ textAlign: 'right' }}>{transaction.rejection_reason}</Typography>}
            </Stack>
          </Paper>
        ))}
      </Stack>

      <TableContainer sx={{ display: { xs: 'none', md: 'block' }, border: 0, borderRadius: 0 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Request</TableCell>
              <TableCell>Laboratory</TableCell>
              <TableCell>Equipment</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Requested</TableCell>
              <TableCell>Processed</TableCell>
              {group === 'rejected' && <TableCell>Reason</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((transaction) => (
              <TableRow key={transaction.id} hover>
                <TableCell><Typography fontWeight={780}>#{transaction.id}</Typography></TableCell>
                <TableCell>{transaction.laboratory?.name || transaction.laboratory_id || 'Unknown laboratory'}</TableCell>
                <TableCell>
                  <Stack spacing={0.35}>
                    {transaction.equipment?.length ? transaction.equipment.map((item, index) => <Typography variant="body2" key={`${item.id || item.name}-${index}`}>{item.name || 'Equipment'} <Chip label={`×${item.quantity || 1}`} size="small" variant="outlined" sx={{ ml: 0.5, height: 21 }} /></Typography>) : <Typography variant="body2" color="text.secondary">No details</Typography>}
                  </Stack>
                </TableCell>
                <TableCell><RequestStatus status={transaction.status} /></TableCell>
                <TableCell>{formatDate(transaction.created_at)}</TableCell>
                <TableCell>{processedText(transaction, group)}</TableCell>
                {group === 'rejected' && <TableCell sx={{ maxWidth: 260 }}><Typography variant="body2" color={transaction.rejection_reason ? 'error.main' : 'text.secondary'}>{transaction.rejection_reason || '—'}</Typography></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

function RequestStatus({ status }) {
  const meta = statusMeta(status);
  return <Chip label={status || 'Pending'} color={meta.color} size="small" sx={{ textTransform: 'capitalize' }} />;
}

function processedText(transaction, group) {
  if (group === 'borrowed') return transaction.accepted_by_name ? `Approved by ${transaction.accepted_by_name}` : 'Approved';
  if (group === 'returned') return transaction.returned_by_name ? `Returned to ${transaction.returned_by_name}` : formatDate(transaction.returned_at);
  if (group === 'rejected') return transaction.rejected_by_name ? `Reviewed by ${transaction.rejected_by_name}` : 'Reviewed';
  return 'Awaiting review';
}
