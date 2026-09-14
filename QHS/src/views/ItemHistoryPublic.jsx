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

export default function ItemHistoryPublic() {
  const { unitID } = useParams();
  const { user } = useStateContext();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axiosClient.get(`/item/${unitID}/history`);
        if (!active) return;
        const payload = data.data || {};
        setHistory(payload.history || []);
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
  const isBorrowed = [true, 1, '1', 'true'].includes(current?.isBorrowed);

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
              <Grid item xs={12} sm={4}><MetricCard icon={<Inventory2OutlinedIcon />} label="Unit ID" value={current.unit_id || current.id} /></Grid>
              <Grid item xs={12} sm={4}><MetricCard icon={<BuildOutlinedIcon />} label="Condition" value={current.condition || 'Unknown'} tone={['Damaged', 'Missing'].includes(current.condition) ? 'error' : current.condition === 'Under Repair' ? 'warning' : 'success'} /></Grid>
              <Grid item xs={12} sm={4}><MetricCard icon={<HistoryOutlinedIcon />} label="Borrowing records" value={history.length} tone="info" /></Grid>
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
          </>
        ) : !error && <SectionCard><EmptyState title="Unit not found" description={`No tracked equipment unit matches ${unitID}.`} /></SectionCard>}
      </Container>
    </Box>
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}
