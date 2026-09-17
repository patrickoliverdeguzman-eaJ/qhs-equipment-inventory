import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Chip, CircularProgress, Container, Grid, LinearProgress, Paper, Stack, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import axiosClient, { getApiErrorMessage } from '../axiosClient';
import { useStateContext } from '../Context/ContextProvider';
import PageHeader from '../Components/PageHeader';
import { EmptyState, MetricCard, SectionCard } from '../Components/WorkspaceUI';

interface RequestEquipment {
  id?: number;
  name?: string;
  quantity?: number;
  items?: Array<{
    unit_id: string;
    returned_at?: string | null;
    condition_at_return?: string | null;
    return_notes?: string | null;
  }>;
}

interface BorrowTransaction {
  id: number;
  status?: string;
  lifecycle_stage?: string;
  is_overdue?: boolean;
  is_due_today?: boolean;
  return_date?: string | null;
  issued_at?: string | null;
  issued_by_name?: string | null;
  issued_count?: number;
  returned_count?: number;
  outstanding_count?: number;
  laboratory_id?: number;
  laboratory?: { name?: string } | null;
  equipment?: RequestEquipment[];
  created_at?: string;
  accepted_at?: string | null;
  returned_at?: string | null;
  rejected_at?: string | null;
  accepted_by_name?: string | null;
  returned_by_name?: string | null;
  rejected_by_name?: string | null;
  rejection_reason?: string | null;
}

type RequestTone = Exclude<ChipProps['color'], undefined>;

interface RequestGroup {
  label: string;
  tone: 'warning' | 'info' | 'success' | 'error';
  icon: ReactNode;
  rows: BorrowTransaction[];
  empty: string;
}

const statusMeta = (status?: string): { color: RequestTone; icon: ReactNode } => {
  switch (status?.toLowerCase()) {
    case 'pending': return { color: 'warning', icon: <HourglassTopIcon /> };
    case 'approved': return { color: 'secondary', icon: <CheckCircleOutlineIcon /> };
    case 'partially_returned': return { color: 'warning', icon: <LocalShippingOutlinedIcon /> };
    case 'overdue': return { color: 'error', icon: <LocalShippingOutlinedIcon /> };
    case 'accepted':
    case 'borrowed': return { color: 'info', icon: <LocalShippingOutlinedIcon /> };
    case 'returned':
    case 'completed': return { color: 'success', icon: <CheckCircleOutlineIcon /> };
    case 'rejected': return { color: 'error', icon: <CancelOutlinedIcon /> };
    default: return { color: 'default', icon: <HistoryOutlinedIcon /> };
  }
};

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  : '—';

export default function BorrowHistory() {
  const { user, token } = useStateContext();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<BorrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const fetchTransactions = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const response = await axiosClient.get<{ data?: BorrowTransaction[] } | BorrowTransaction[]>('/transactions');
      setTransactions(Array.isArray(response.data) ? response.data : response.data.data || []);
      setError('');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Your request history could not be loaded.'));
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !user?.id) {
      navigate('/auth');
      return undefined;
    }
    fetchTransactions();
    const refresh = () => fetchTransactions(false);
    window.addEventListener('transactionUpdated', refresh);
    const interval = window.setInterval(refresh, 10_000);
    const echo = window.Echo;
    if (echo) {
      try { echo.private(`transactions.user.${user.id}`).listen('.transaction.updated', refresh); }
      catch { /* Polling remains available. */ }
    }
    return () => {
      window.removeEventListener('transactionUpdated', refresh);
      window.clearInterval(interval);
      if (echo) {
        try { echo.leave(`transactions.user.${user.id}`); } catch { /* Already disconnected. */ }
      }
    };
  }, [token, user?.id, navigate]);

  const groups: RequestGroup[] = [
    { label: 'Pending', tone: 'warning', icon: <HourglassTopIcon />, rows: transactions.filter((item) => item.status?.toLowerCase() === 'pending'), empty: 'No requests are waiting for review.' },
    { label: 'Approved', tone: 'info', icon: <CheckCircleOutlineIcon />, rows: transactions.filter((item) => item.status?.toLowerCase() === 'approved'), empty: 'No approved requests are waiting for pickup.' },
    { label: 'Borrowed', tone: 'info', icon: <LocalShippingOutlinedIcon />, rows: transactions.filter((item) => item.status?.toLowerCase() === 'borrowed'), empty: 'You do not have equipment currently checked out.' },
    { label: 'Returned', tone: 'success', icon: <CheckCircleOutlineIcon />, rows: transactions.filter((item) => ['returned', 'completed'].includes(item.status?.toLowerCase() || '')), empty: 'Returned requests will appear here.' },
    { label: 'Rejected', tone: 'error', icon: <CancelOutlinedIcon />, rows: transactions.filter((item) => item.status?.toLowerCase() === 'rejected'), empty: 'You have no rejected requests.' },
  ];
  const current = groups[tabValue];

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <PageHeader eyebrow="Borrowing" title="My requests" description="Track every approval, active loan, return, and decision in one place." />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {groups.slice(0, 4).map((group) => (
          <Grid item xs={12} sm={6} md={3} key={group.label}>
            <MetricCard icon={group.icon} label={group.label === 'Pending' ? 'Awaiting approval' : group.label === 'Approved' ? 'Ready for pickup' : group.label === 'Borrowed' ? 'Currently borrowed' : 'Returned requests'} value={group.rows.length} tone={group.tone} loading={loading} />
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

interface RequestListProps {
  rows: BorrowTransaction[];
  group: string;
}

function RequestList({ rows, group }: RequestListProps) {
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
              <RequestStatus transaction={transaction} />
            </Stack>
            {transaction.status === 'approved' && (
              <Alert severity="success" sx={{ mt: 1.5 }}>Approved and ready for pickup. Staff will verify every unit at handover.</Alert>
            )}
            {transaction.status === 'borrowed' && (transaction.issued_count || 0) > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Return progress</Typography><Typography variant="caption" fontWeight={700}>{transaction.returned_count || 0}/{transaction.issued_count} returned</Typography></Stack>
                <LinearProgress variant="determinate" color={transaction.is_overdue ? 'error' : 'primary'} value={((transaction.returned_count || 0) / (transaction.issued_count || 1)) * 100} sx={{ mt: 0.5 }} />
              </Box>
            )}
            {returnFindings(transaction).length > 0 && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>{returnFindings(transaction).join(' • ')}</Alert>
            )}
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
                <TableCell>
                  <RequestStatus transaction={transaction} />
                  {transaction.status === 'borrowed' && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{transaction.returned_count || 0}/{transaction.issued_count || 0} returned</Typography>}
                </TableCell>
                <TableCell>{formatDate(transaction.created_at)}</TableCell>
                <TableCell>
                  <Typography variant="body2">{processedText(transaction, group)}</Typography>
                  {returnFindings(transaction).map((finding) => (
                    <Typography key={finding} variant="caption" color="warning.dark" display="block" sx={{ mt: 0.5 }}>
                      {finding}
                    </Typography>
                  ))}
                </TableCell>
                {group === 'rejected' && <TableCell sx={{ maxWidth: 260 }}><Typography variant="body2" color={transaction.rejection_reason ? 'error.main' : 'text.secondary'}>{transaction.rejection_reason || '—'}</Typography></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

function RequestStatus({ transaction }: { transaction: BorrowTransaction }) {
  const stage = transaction.lifecycle_stage || transaction.status || 'pending';
  const meta = statusMeta(stage);
  const label = transaction.status === 'approved'
    ? 'Approved — awaiting pickup'
    : stage === 'partially_returned'
      ? transaction.is_overdue ? 'Partially returned — overdue' : 'Partially returned'
      : transaction.is_due_today ? 'Due today'
        : stage.replaceAll('_', ' ');
  return <Chip label={label} color={meta.color} size="small" sx={{ textTransform: 'capitalize' }} />;
}

function processedText(transaction: BorrowTransaction, group: string) {
  if (group === 'approved') return transaction.accepted_by_name ? `Ready for pickup · approved by ${transaction.accepted_by_name}` : 'Ready for pickup';
  if (group === 'borrowed') return transaction.issued_by_name ? `Issued by ${transaction.issued_by_name} · ${formatDate(transaction.issued_at)}` : formatDate(transaction.issued_at);
  if (group === 'returned') return transaction.returned_by_name ? `Returned to ${transaction.returned_by_name}` : formatDate(transaction.returned_at);
  if (group === 'rejected') return transaction.rejected_by_name ? `Reviewed by ${transaction.rejected_by_name}` : 'Reviewed';
  return 'Awaiting review';
}

function returnFindings(transaction: BorrowTransaction): string[] {
  return (transaction.equipment || []).flatMap((equipment) => (equipment.items || []))
    .filter((item) => item.returned_at && ['Damaged', 'Missing', 'Under Repair'].includes(item.condition_at_return || ''))
    .map((item) => `${item.unit_id}: ${item.condition_at_return}${item.return_notes ? ` — ${item.return_notes}` : ''}`);
}
