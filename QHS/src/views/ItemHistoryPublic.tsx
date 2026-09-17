import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert, Box, Chip, CircularProgress, Container, Grid, Paper, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import axiosClient from '../axiosClient';
import { useStateContext } from '../Context/ContextProvider';
import PageHeader from '../Components/PageHeader';
import { EmptyState, MetricCard, SectionCard } from '../Components/WorkspaceUI';
import type { EquipmentUnit } from '../types/domain';

interface UnitHistoryRecord {
  id: number;
  borrower_name?: string | null;
  borrow_date?: string | null;
  assigned_at?: string | null;
  created_at?: string | null;
  status?: string | null;
  notes?: string | null;
}

interface UnitHistoryPayload {
  current?: EquipmentUnit | null;
  history?: UnitHistoryRecord[];
  maintenance?: UnitMaintenanceRecord[];
}

interface UnitMaintenanceRecord {
  id: number;
  type: string;
  status: string;
  priority: string;
  source_transaction_id?: number | null;
  title: string;
  description?: string | null;
  assigned_to_name?: string | null;
  reported_by_name?: string | null;
  scheduled_at?: string | null;
  due_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  result_condition?: string | null;
  completion_notes?: string | null;
  next_due_at?: string | null;
}

export default function ItemHistoryPublic() {
  const { unitID } = useParams();
  const { user } = useStateContext();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<UnitHistoryRecord[]>([]);
  const [maintenance, setMaintenance] = useState<UnitMaintenanceRecord[]>([]);
  const [current, setCurrent] = useState<EquipmentUnit | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axiosClient.get<{ data?: UnitHistoryPayload }>(`/item/${unitID}/history`);
        if (!active) return;
        const payload = data.data || {};
        setHistory(payload.history || []);
        setMaintenance(payload.maintenance || []);
        setCurrent(payload.current || null);
        setError('');
      } catch {
        if (active) setError('This unit history could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    };
    if (unitID) load();
    return () => { active = false; };
  }, [unitID]);

  const backTo = user?.role === 'custodian' ? '/custodian/equipment' : '/admin/equipment';
  const isBorrowed = [true, 1, '1', 'true'].includes(current?.isBorrowed ?? false);
  const condition = current?.condition || 'Unknown';

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <PageHeader backTo={backTo} eyebrow="Unit audit trail" title={current?.unit_id || unitID || 'Equipment unit'} description="Review the unit’s current condition and every recorded borrower handoff." />
        {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'grid', minHeight: 420, placeItems: 'center' }}><CircularProgress /></Box>
        ) : current ? (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}><MetricCard icon={<Inventory2OutlinedIcon />} label="Unit ID" value={current.unit_id || current.id} /></Grid>
              <Grid item xs={12} sm={6} md={3}><MetricCard icon={<BuildOutlinedIcon />} label="Condition" value={condition} tone={['Damaged', 'Missing'].includes(condition) ? 'error' : condition === 'Under Repair' ? 'warning' : 'success'} /></Grid>
              <Grid item xs={12} sm={6} md={3}><MetricCard icon={<HistoryOutlinedIcon />} label="Borrowing records" value={history.length} tone="info" /></Grid>
              <Grid item xs={12} sm={6} md={3}><MetricCard icon={<BuildOutlinedIcon />} label="Maintenance records" value={maintenance.length} tone="warning" /></Grid>
            </Grid>

            <SectionCard>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: { xs: 2, sm: 2.5 }, py: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box><Typography variant="h6">Borrower history</Typography><Typography variant="body2" color="text.secondary">Newest activity appears first.</Typography></Box>
                <Chip label={isBorrowed ? 'Currently borrowed' : 'Available'} color={isBorrowed ? 'warning' : 'success'} size="small" />
              </Stack>
              {history.length === 0 ? (
                <EmptyState title="No borrowing history" description="This unit has not been included in a recorded borrowing transaction." />
              ) : (
                <>
                  <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' }, p: 1.5 }}>
                    {history.map((record) => (
                      <Paper variant="outlined" key={record.id} sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Box><Typography fontWeight={750}>{record.borrower_name || 'Unknown borrower'}</Typography><Typography variant="caption" color="text.secondary">{formatDate(record.borrow_date || record.assigned_at || record.created_at)}</Typography></Box>
                          <Chip label={record.status || 'Recorded'} size="small" />
                        </Stack>
                        {record.notes && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>{record.notes}</Typography>}
                      </Paper>
                    ))}
                  </Stack>
                  <TableContainer sx={{ display: { xs: 'none', md: 'block' }, border: 0, borderRadius: 0 }}>
                    <Table>
                      <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Borrower</TableCell><TableCell>Status</TableCell><TableCell>Notes</TableCell></TableRow></TableHead>
                      <TableBody>
                        {history.map((record) => (
                          <TableRow key={record.id} hover>
                            <TableCell>{formatDate(record.borrow_date || record.assigned_at || record.created_at)}</TableCell>
                            <TableCell><Typography fontWeight={700}>{record.borrower_name || '—'}</Typography></TableCell>
                            <TableCell><Chip label={record.status || 'Recorded'} size="small" /></TableCell>
                            <TableCell>{record.notes || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </SectionCard>

            <SectionCard sx={{ mt: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: { xs: 2, sm: 2.5 }, py: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box><Typography variant="h6">Maintenance history</Typography><Typography variant="body2" color="text.secondary">Repairs, calibration, inspection, and validation records.</Typography></Box>
                <Chip label={`${maintenance.length} record${maintenance.length === 1 ? '' : 's'}`} size="small" variant="outlined" />
              </Stack>
              {maintenance.length === 0 ? (
                <EmptyState icon={<BuildOutlinedIcon />} title="No maintenance history" description="Maintenance work orders for this unit will appear here." />
              ) : (
                <Stack spacing={1.25} sx={{ p: 1.5 }}>
                  {maintenance.map((record) => (
                    <Paper variant="outlined" key={record.id} sx={{ p: 2 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }} spacing={1.5}>
                        <Box>
                          <Typography variant="overline" color="primary">#{record.id} · {labelize(record.type)}</Typography>
                          <Typography fontWeight={760}>{record.title}</Typography>
                          {record.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{record.description}</Typography>}
                        </Box>
                        <Stack direction="row" spacing={0.75}>
                          <Chip label={labelize(record.priority)} size="small" variant="outlined" color={record.priority === 'critical' ? 'error' : record.priority === 'high' ? 'warning' : 'default'} />
                          <Chip label={labelize(record.status)} size="small" color={record.status === 'completed' ? 'success' : record.status === 'cancelled' ? 'default' : 'info'} />
                        </Stack>
                      </Stack>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.4, sm: 2 }} sx={{ mt: 1.25 }}>
                        <Typography variant="caption" color="text.secondary">Reported by {record.reported_by_name || 'System'}</Typography>
                        <Typography variant="caption" color="text.secondary">Due {formatDate(record.due_at)}</Typography>
                        {record.source_transaction_id && <Typography variant="caption" color="text.secondary">Return #{record.source_transaction_id}</Typography>}
                      </Stack>
                      {record.completion_notes && <Alert severity={record.result_condition && ['Damaged', 'Missing'].includes(record.result_condition) ? 'warning' : 'success'} sx={{ mt: 1.25 }}>{record.completion_notes}{record.result_condition ? ` · Result: ${record.result_condition}` : ''}</Alert>}
                    </Paper>
                  ))}
                </Stack>
              )}
            </SectionCard>
          </>
        ) : !error && <SectionCard><EmptyState title="Unit not found" description={`No tracked equipment unit matches ${unitID}.`} /></SectionCard>}
      </Container>
    </Box>
  );
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

function labelize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
