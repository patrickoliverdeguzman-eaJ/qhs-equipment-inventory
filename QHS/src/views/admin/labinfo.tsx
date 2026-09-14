import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, CircularProgress, FormControl, Grid, InputLabel,
  MenuItem, Select, Stack, Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import axiosClient, { getApiErrorMessage } from '../../axiosClient';
import PageHeader from '../../Components/PageHeader';
import { DetailRow, SectionCard, SectionHeading } from '../../Components/WorkspaceUI';
import { getInitials } from '../../utils';
import type { AppUser, Laboratory } from '../../types/domain';

interface LaboratoryAssignment extends Laboratory {
  custodianID?: number | null;
  custodian?: AppUser | null;
  gallery?: unknown;
}

export default function LabInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [laboratory, setLaboratory] = useState<LaboratoryAssignment | null>(null);
  const [custodians, setCustodians] = useState<AppUser[]>([]);
  const [selectedCustodian, setSelectedCustodian] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [labResponse, usersResponse, labsResponse] = await Promise.all([
          axiosClient.get<{ data: LaboratoryAssignment } | LaboratoryAssignment>(`/laboratories/${id}`),
          axiosClient.get<{ data: AppUser[] }>('/users', { params: { role: 'custodian' } }),
          axiosClient.get<{ data: LaboratoryAssignment[] }>('/laboratories'),
        ]);
        if (!active) return;
        const record = 'data' in labResponse.data ? labResponse.data.data : labResponse.data;
        const assignedToOtherLabs = (labsResponse.data.data || [])
          .filter((lab) => lab.id !== Number(id))
          .map((lab) => lab.custodianID)
          .filter(Boolean);
        setLaboratory(record);
        setSelectedCustodian(record.custodianID || '');
        setCustodians((usersResponse.data.data || []).filter((person) => !assignedToOtherLabs.includes(person.id) || person.id === record.custodianID));
        setError('');
      } catch {
        if (active) setError('Laboratory details could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!laboratory) return;
    setSubmitting(true);
    setError('');
    const { gallery: _gallery, custodian: _custodian, ...laboratoryData } = laboratory;
    const payload = { ...laboratoryData, custodianID: selectedCustodian || null };
    try {
      await axiosClient.put(`/laboratories/${laboratory.id}`, payload);
      navigate('../lab');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'The assignment could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  };

  const assignedPerson = custodians.find((person) => person.id === Number(selectedCustodian));

  return (
    <Box sx={{ maxWidth: 1020, mx: 'auto' }}>
      <PageHeader backTo="../lab" eyebrow="Laboratory access" title={laboratory?.name || 'Laboratory assignment'} description="Assign one custodian who will manage this room’s equipment and borrowing requests." />
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'grid', minHeight: 320, placeItems: 'center' }}><CircularProgress /></Box>
      ) : laboratory && (
        <Grid container spacing={2.5} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <SectionCard sx={{ height: '100%' }}>
              <SectionHeading icon={<ScienceOutlinedIcon />} title="Room overview" description="Current laboratory record" />
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Typography variant="h5">{laboratory.name}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1, mb: 2.25, lineHeight: 1.7 }}>{laboratory.description || 'No description has been added.'}</Typography>
                <DetailRow label="Record ID" value={`LAB-${String(laboratory.id).padStart(3, '0')}`} />
                <DetailRow label="Location" value={laboratory.location} />
                <DetailRow label="Current custodian" value={laboratory.custodian?.name || assignedPerson?.name || 'Not assigned'} divider={false} />
              </Box>
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={7}>
            <SectionCard component="form" onSubmit={onSubmit} sx={{ height: '100%' }}>
              <SectionHeading icon={<PersonOutlineIcon />} title="Custodian assignment" description="Only unassigned custodians are shown." />
              <Stack spacing={2.5} sx={{ p: { xs: 2, sm: 2.5 } }}>
                <FormControl fullWidth>
                  <InputLabel id="custodian-select-label">Assigned custodian</InputLabel>
                  <Select labelId="custodian-select-label" value={selectedCustodian} label="Assigned custodian" onChange={(event) => setSelectedCustodian(event.target.value === '' ? '' : Number(event.target.value))}>
                    <MenuItem value=""><em>No custodian assigned</em></MenuItem>
                    {custodians.map((custodian) => <MenuItem key={custodian.id} value={custodian.id}>{custodian.name}</MenuItem>)}
                  </Select>
                </FormControl>

                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                  {assignedPerson ? (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.main', fontSize: '0.8rem', fontWeight: 800 }}>{getInitials(assignedPerson.name)}</Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={750}>{assignedPerson.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{assignedPerson.email || 'Laboratory custodian'}</Typography>
                      </Box>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No custodian will have access to manage this laboratory until someone is assigned.</Typography>
                  )}
                </Box>

                <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="flex-end" spacing={1} sx={{ mt: 'auto' }}>
                  <Button color="inherit" onClick={() => navigate('../lab')} disabled={submitting}>Cancel</Button>
                  <Button type="submit" variant="contained" disabled={submitting}>{submitting ? <CircularProgress size={21} color="inherit" /> : 'Save assignment'}</Button>
                </Stack>
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
