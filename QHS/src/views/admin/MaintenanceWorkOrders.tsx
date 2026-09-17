import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import axiosClient, { getApiErrorMessage } from '../../axiosClient';
import PageHeader from '../../Components/PageHeader';
import { EmptyState, MetricCard, SectionCard, SectionHeading } from '../../Components/WorkspaceUI';
import { useStateContext } from '../../Context/ContextProvider';
import type {
  AppUser,
  Equipment,
  Laboratory,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceType,
  MaintenanceWorkOrder,
} from '../../types/domain';

type FilterValue = 'all' | 'active' | 'overdue' | 'due_soon' | 'completed' | 'cancelled';

interface WorkOrderForm {
  equipment_item_id: number | '';
  type: MaintenanceType;
  priority: MaintenancePriority;
  status: Exclude<MaintenanceStatus, 'completed' | 'cancelled'>;
  title: string;
  description: string;
  assigned_to_id: number | '';
  scheduled_at: string;
  due_at: string;
  service_provider: string;
  estimated_cost: string;
  recurrence_interval_days: string;
}

interface CompleteForm {
  result_condition: string;
  completion_notes: string;
  actual_cost: string;
  service_provider: string;
  recurrence_interval_days: string;
}

const ACTIVE_STATUSES: MaintenanceStatus[] = ['open', 'assigned', 'in_progress', 'waiting_for_parts'];
const TYPES: Array<{ value: MaintenanceType; label: string }> = [
  { value: 'incident', label: 'Incident investigation' },
  { value: 'repair', label: 'Repair' },
  { value: 'preventive_maintenance', label: 'Preventive maintenance' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'safety_inspection', label: 'Safety inspection' },
  { value: 'validation', label: 'Validation' },
];
const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged', 'Missing'];

const emptyForm = (): WorkOrderForm => ({
  equipment_item_id: '',
  type: 'repair',
  priority: 'normal',
  status: 'open',
  title: '',
  description: '',
  assigned_to_id: '',
  scheduled_at: '',
  due_at: '',
  service_provider: '',
  estimated_cost: '',
  recurrence_interval_days: '',
});

const emptyCompleteForm = (): CompleteForm => ({
  result_condition: 'Good',
  completion_notes: '',
  actual_cost: '',
  service_provider: '',
  recurrence_interval_days: '',
});

const labelize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not set';

const toLocalInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const compactPayload = (values: Record<string, unknown>) => Object.fromEntries(
  Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]),
);

export default function MaintenanceWorkOrders() {
  const { user } = useStateContext();
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [staff, setStaff] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceWorkOrder | null>(null);
  const [form, setForm] = useState<WorkOrderForm>(emptyForm);
  const [completeTarget, setCompleteTarget] = useState<MaintenanceWorkOrder | null>(null);
  const [completeForm, setCompleteForm] = useState<CompleteForm>(emptyCompleteForm);
  const [cancelTarget, setCancelTarget] = useState<MaintenanceWorkOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [workOrderResponse, equipmentResponse] = await Promise.all([
        axiosClient.get<{ data: MaintenanceWorkOrder[] }>('/maintenance-work-orders', { params: { per_page: 500 } }),
        axiosClient.get<{ equipment: Equipment[]; laboratories: Laboratory[] }>('/equipment-data'),
      ]);
      setWorkOrders(workOrderResponse.data.data || []);
      setEquipment(equipmentResponse.data.equipment || []);
      setLaboratories(equipmentResponse.data.laboratories || []);

      if (user?.role === 'admin') {
        const staffResponse = await axiosClient.get<{ data: AppUser[] }>('/users', { params: { per_page: 100 } });
        setStaff((staffResponse.data.data || []).filter((person) => person.isActive !== false && ['admin', 'custodian'].includes(person.role)));
      } else {
        setStaff(user ? [user] : []);
      }
      setError('');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Maintenance records could not be loaded.'));
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const units = useMemo(() => equipment.flatMap((record) => (record.items || []).map((item) => ({
    ...item,
    equipmentId: record.id,
    equipmentName: record.name,
    laboratoryId: record.laboratory_id,
    laboratoryName: laboratories.find((lab) => lab.id === record.laboratory_id)?.name || 'Unknown laboratory',
  }))).sort((a, b) => String(a.unit_id).localeCompare(String(b.unit_id))), [equipment, laboratories]);

  const metrics = useMemo(() => ({
    active: workOrders.filter((record) => ACTIVE_STATUSES.includes(record.status)).length,
    overdue: workOrders.filter((record) => record.is_overdue).length,
    dueSoon: workOrders.filter((record) => record.is_due_soon).length,
    completed: workOrders.filter((record) => record.status === 'completed').length,
  }), [workOrders]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return workOrders.filter((record) => {
      const matchesFilter = filter === 'all'
        || (filter === 'active' && ACTIVE_STATUSES.includes(record.status))
        || (filter === 'overdue' && record.is_overdue)
        || (filter === 'due_soon' && record.is_due_soon)
        || record.status === filter;
      const matchesSearch = !needle || [record.title, record.unit_id, record.equipment_name, record.laboratory?.name, record.assigned_to_name]
        .some((value) => value?.toLowerCase().includes(needle));
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, workOrders]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (record: MaintenanceWorkOrder) => {
    setEditing(record);
    setForm({
      equipment_item_id: record.equipment_item_id,
      type: record.type,
      priority: record.priority,
      status: ACTIVE_STATUSES.includes(record.status) ? record.status as WorkOrderForm['status'] : 'open',
      title: record.title,
      description: record.description || '',
      assigned_to_id: record.assigned_to_id || '',
      scheduled_at: toLocalInput(record.scheduled_at),
      due_at: toLocalInput(record.due_at),
      service_provider: record.service_provider || '',
      estimated_cost: record.estimated_cost || '',
      recurrence_interval_days: record.recurrence_interval_days?.toString() || '',
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    setSaving(true);
    try {
      const payload = compactPayload({
        ...form,
        equipment_item_id: editing ? undefined : form.equipment_item_id,
        type: editing ? undefined : form.type,
        status: editing ? form.status : undefined,
        assigned_to_id: form.assigned_to_id,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
        recurrence_interval_days: form.recurrence_interval_days ? Number(form.recurrence_interval_days) : null,
      });
      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
      if (editing) await axiosClient.patch(`/maintenance-work-orders/${editing.id}`, payload);
      else await axiosClient.post('/maintenance-work-orders', payload);
      setFormOpen(false);
      setNotice(editing ? 'Work order updated.' : 'Maintenance work order opened.');
      await load(false);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'The maintenance work order could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const startWork = async (record: MaintenanceWorkOrder) => {
    try {
      await axiosClient.post(`/maintenance-work-orders/${record.id}/start`);
      setNotice('Maintenance work started.');
      await load(false);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Maintenance could not be started.'));
    }
  };

  const submitCompletion = async () => {
    if (!completeTarget) return;
    setSaving(true);
    try {
      await axiosClient.post(`/maintenance-work-orders/${completeTarget.id}/complete`, compactPayload({
        ...completeForm,
        actual_cost: completeForm.actual_cost ? Number(completeForm.actual_cost) : null,
        recurrence_interval_days: completeForm.recurrence_interval_days ? Number(completeForm.recurrence_interval_days) : null,
      }));
      setCompleteTarget(null);
      setNotice('Maintenance completed and unit availability recalculated.');
      await load(false);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Maintenance could not be completed.'));
    } finally {
      setSaving(false);
    }
  };

  const submitCancellation = async () => {
    if (!cancelTarget) return;
    setSaving(true);
    try {
      await axiosClient.post(`/maintenance-work-orders/${cancelTarget.id}/cancel`, { reason: cancelReason });
      setCancelTarget(null);
      setCancelReason('');
      setNotice('Work order cancelled and the previous condition restored.');
      await load(false);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'The work order could not be cancelled.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
      <PageHeader
        eyebrow="Asset health"
        title="Maintenance & calibration"
        description="Keep damaged, calibration-due, and inspection-required units out of circulation until staff record a verified outcome."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New work order</Button>}
      />

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}><MetricCard icon={<BuildOutlinedIcon />} label="Active work orders" value={metrics.active} tone="primary" loading={loading} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard icon={<WarningAmberOutlinedIcon />} label="Overdue" value={metrics.overdue} tone="error" loading={loading} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard icon={<ScheduleOutlinedIcon />} label="Due within 7 days" value={metrics.dueSoon} tone="warning" loading={loading} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard icon={<CheckCircleOutlineIcon />} label="Completed records" value={metrics.completed} tone="success" loading={loading} /></Grid>
      </Grid>

      <SectionCard>
        <SectionHeading
          icon={<BuildOutlinedIcon />}
          title="Work-order queue"
          description={`${visible.length} matching record${visible.length === 1 ? '' : 's'}`}
          action={(
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { sm: 430 } }}>
              <TextField size="small" fullWidth label="Search unit, equipment, or title" value={search} onChange={(event) => setSearch(event.target.value)} InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }} />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Queue</InputLabel>
                <Select value={filter} label="Queue" onChange={(event) => setFilter(event.target.value as FilterValue)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                  <MenuItem value="due_soon">Due soon</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}
        />

        {loading ? (
          <Box sx={{ display: 'grid', minHeight: 300, placeItems: 'center' }}><CircularProgress /></Box>
        ) : visible.length === 0 ? (
          <EmptyState icon={<BuildOutlinedIcon />} title="No matching work orders" description="Open a work order manually or return a damaged unit to create one automatically." />
        ) : (
          <Grid container spacing={2} sx={{ p: { xs: 1.5, sm: 2 } }}>
            {visible.map((record) => {
              const active = ACTIVE_STATUSES.includes(record.status);
              return (
                <Grid item xs={12} md={6} xl={4} key={record.id}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderColor: record.is_overdue ? 'error.main' : 'divider' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="overline" color="primary">#{record.id} · {labelize(record.type)}</Typography>
                          <Typography variant="h6" sx={{ mt: -0.25 }}>{record.title}</Typography>
                        </Box>
                        <Chip size="small" color={record.is_overdue ? 'error' : record.status === 'completed' ? 'success' : record.status === 'cancelled' ? 'default' : 'info'} label={record.is_overdue ? 'Overdue' : labelize(record.status)} />
                      </Stack>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                        <Chip size="small" variant="outlined" color={record.priority === 'critical' ? 'error' : record.priority === 'high' ? 'warning' : 'default'} label={`${labelize(record.priority)} priority`} />
                        {record.source_transaction_id && <Chip size="small" variant="outlined" label={`Return #${record.source_transaction_id}`} />}
                      </Stack>
                      <Typography variant="body2" fontWeight={750} sx={{ mt: 1.75 }}>{record.equipment_name || 'Equipment'} · {record.unit_id || `Unit ${record.equipment_item_id}`}</Typography>
                      <Typography variant="body2" color="text.secondary">{record.laboratory?.name || `Laboratory ${record.laboratory_id}`}</Typography>
                      {record.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>{record.description}</Typography>}
                      <Box sx={{ mt: 1.75, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary" display="block">Assigned: {record.assigned_to_name || 'Unassigned'}</Typography>
                        <Typography variant="caption" color={record.is_overdue ? 'error.main' : 'text.secondary'} display="block">Due: {formatDate(record.due_at)}</Typography>
                        {record.completed_at && <Typography variant="caption" color="text.secondary" display="block">Completed: {formatDate(record.completed_at)}</Typography>}
                        {record.next_due_at && <Typography variant="caption" color="text.secondary" display="block">Next service: {formatDate(record.next_due_at)}</Typography>}
                      </Box>
                    </CardContent>
                    {active && (
                      <CardActions sx={{ px: 2, pb: 2, pt: 0, flexWrap: 'wrap' }}>
                        {record.status !== 'in_progress' && <Button size="small" startIcon={<PlayArrowOutlinedIcon />} onClick={() => startWork(record)}>Start</Button>}
                        <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => openEdit(record)}>Edit</Button>
                        <Button size="small" color="success" startIcon={<CheckCircleOutlineIcon />} onClick={() => { setCompleteTarget(record); setCompleteForm({ ...emptyCompleteForm(), service_provider: record.service_provider || '', recurrence_interval_days: record.recurrence_interval_days?.toString() || '' }); }}>Complete</Button>
                        <Button size="small" color="error" startIcon={<CancelOutlinedIcon />} onClick={() => setCancelTarget(record)}>Cancel</Button>
                      </CardActions>
                    )}
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </SectionCard>

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? `Update work order #${editing.id}` : 'Open maintenance work order'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {!editing && (
              <Grid item xs={12}>
                <TextField select fullWidth label="Equipment unit" value={form.equipment_item_id} onChange={(event) => setForm((current) => ({ ...current, equipment_item_id: Number(event.target.value) }))}>
                  {units.filter((unit) => !Boolean(unit.isBorrowed)).map((unit) => <MenuItem key={unit.id} value={unit.id}>{unit.unit_id} · {unit.equipmentName} · {unit.laboratoryName} · {unit.condition}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            {!editing && <Grid item xs={12} sm={6}><TextField select fullWidth label="Work type" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as MaintenanceType }))}>{TYPES.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}</TextField></Grid>}
            <Grid item xs={12} sm={6}><TextField select fullWidth label="Priority" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as MaintenancePriority }))}>{['low', 'normal', 'high', 'critical'].map((priority) => <MenuItem key={priority} value={priority}>{labelize(priority)}</MenuItem>)}</TextField></Grid>
            {editing && <Grid item xs={12} sm={6}><TextField select fullWidth label="Status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as WorkOrderForm['status'] }))}>{ACTIVE_STATUSES.map((status) => <MenuItem key={status} value={status}>{labelize(status)}</MenuItem>)}</TextField></Grid>}
            <Grid item xs={12}><TextField fullWidth label="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField select fullWidth label="Assigned staff" value={form.assigned_to_id} onChange={(event) => setForm((current) => ({ ...current, assigned_to_id: event.target.value === '' ? '' : Number(event.target.value) }))}><MenuItem value="">Unassigned</MenuItem>{staff.map((person) => <MenuItem key={person.id} value={person.id}>{person.name} · {labelize(person.role)}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Service provider" value={form.service_provider} onChange={(event) => setForm((current) => ({ ...current, service_provider: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth type="datetime-local" label="Scheduled" value={form.scheduled_at} onChange={(event) => setForm((current) => ({ ...current, scheduled_at: event.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth type="datetime-local" label="Due" value={form.due_at} onChange={(event) => setForm((current) => ({ ...current, due_at: event.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Estimated cost" value={form.estimated_cost} onChange={(event) => setForm((current) => ({ ...current, estimated_cost: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Repeat every (days)" value={form.recurrence_interval_days} onChange={(event) => setForm((current) => ({ ...current, recurrence_interval_days: event.target.value }))} inputProps={{ min: 1, max: 3650 }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setFormOpen(false)} disabled={saving}>Close</Button><Button variant="contained" onClick={submitForm} disabled={saving || !form.title.trim() || (!editing && !form.equipment_item_id)}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Open work order'}</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(completeTarget)} onClose={() => !saving && setCompleteTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Complete work order #{completeTarget?.id}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">The selected result becomes the unit’s current condition and determines whether it is available again.</Alert>
            <TextField select fullWidth label="Resulting condition" value={completeForm.result_condition} onChange={(event) => setCompleteForm((current) => ({ ...current, result_condition: event.target.value }))}>{CONDITIONS.map((condition) => <MenuItem key={condition} value={condition}>{condition}</MenuItem>)}</TextField>
            <TextField fullWidth multiline minRows={4} label="Completion and inspection notes" value={completeForm.completion_notes} onChange={(event) => setCompleteForm((current) => ({ ...current, completion_notes: event.target.value }))} />
            <TextField fullWidth label="Service provider" value={completeForm.service_provider} onChange={(event) => setCompleteForm((current) => ({ ...current, service_provider: event.target.value }))} />
            <TextField fullWidth type="number" label="Actual cost" value={completeForm.actual_cost} onChange={(event) => setCompleteForm((current) => ({ ...current, actual_cost: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} />
            <TextField fullWidth type="number" label="Next service interval (days)" value={completeForm.recurrence_interval_days} onChange={(event) => setCompleteForm((current) => ({ ...current, recurrence_interval_days: event.target.value }))} inputProps={{ min: 1, max: 3650 }} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setCompleteTarget(null)} disabled={saving}>Back</Button><Button variant="contained" color="success" onClick={submitCompletion} disabled={saving || !completeForm.completion_notes.trim()}>{saving ? 'Completing…' : 'Complete maintenance'}</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(cancelTarget)} onClose={() => !saving && setCancelTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Cancel work order #{cancelTarget?.id}</DialogTitle>
        <DialogContent dividers><Alert severity="warning" sx={{ mb: 2 }}>Cancellation restores the condition recorded before this work order opened.</Alert><TextField fullWidth multiline minRows={3} label="Cancellation reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></DialogContent>
        <DialogActions><Button onClick={() => setCancelTarget(null)} disabled={saving}>Back</Button><Button variant="contained" color="error" onClick={submitCancellation} disabled={saving || !cancelReason.trim()}>{saving ? 'Cancelling…' : 'Cancel work order'}</Button></DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice('')} message={notice} />
    </Container>
  );
}
