import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, Grid, Stack, ToggleButton,
  ToggleButtonGroup, Typography,
} from '@mui/material';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import axiosClient from '../../axiosClient';
import { useStateContext } from '../../Context/ContextProvider';
import PageHeader from '../../Components/PageHeader';
import { SectionCard, SectionHeading } from '../../Components/WorkspaceUI';
import type { ApiErrors } from '../../types/domain';

interface ItemFormState {
  id: number | null;
  equipment_id: number | null;
  unit_id: string;
  condition: string;
}

interface ConditionOption {
  value: string;
  description: string;
  tone: 'success' | 'info' | 'warning' | 'error';
}

const conditions: ConditionOption[] = [
  { value: 'New', description: 'Unused or newly acquired', tone: 'success' },
  { value: 'Good', description: 'Fully functional', tone: 'success' },
  { value: 'Fair', description: 'Usable with visible wear', tone: 'info' },
  { value: 'Poor', description: 'Limited but still usable', tone: 'warning' },
  { value: 'Under Repair', description: 'Temporarily unavailable', tone: 'warning' },
  { value: 'Damaged', description: 'Not safe to issue', tone: 'error' },
  { value: 'Missing', description: 'Location unknown', tone: 'error' },
];

export default function ItemForm() {
  const { id, equipmentID } = useParams();
  const navigate = useNavigate();
  const { user } = useStateContext();
  const basePath = user?.role === 'custodian' ? '/custodian' : '/admin';
  const [item, setItem] = useState<ItemFormState>({ id: null, equipment_id: equipmentID ? Number(equipmentID) : null, unit_id: '', condition: 'Good' });
  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<ApiErrors>({});

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    axiosClient.get<{ data: ItemFormState }>(`/item/${id}`)
      .then(({ data }) => {
        if (!active) return;
        const record = data.data;
        setItem({ id: record.id, equipment_id: record.equipment_id, unit_id: record.unit_id || '', condition: record.condition || 'Good' });
      })
      .catch(() => active && setErrors({ general: ['Unit details could not be loaded.'] }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const detailPath = `${basePath}/equipment/info/${equipmentID || item.equipment_id}`;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    const payload = item.id
      ? { condition: item.condition || 'Good' }
      : { equipment_id: Number(item.equipment_id), condition: item.condition || 'Good' };
    try {
      if (item.id) await axiosClient.put(`/item/${item.id}`, payload);
      else await axiosClient.post('/item', payload);
      navigate(detailPath);
    } catch (requestError: unknown) {
      const validation = axios.isAxiosError<{ errors?: ApiErrors }>(requestError) ? requestError.response?.data?.errors || {} : {};
      const first = Object.values(validation)[0]?.[0];
      setErrors({ ...validation, general: [first || 'The unit could not be saved. Please try again.'] });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageHeader backTo={detailPath} eyebrow={item.id ? 'Edit tracked unit' : 'Add tracked unit'} title={item.id ? 'Update unit condition' : 'Create an equipment unit'} description="Each physical unit receives its own identifier and condition history." />
      {errors.general && <Alert severity="error" sx={{ mb: 2.5 }}>{errors.general.join(' ')}</Alert>}

      {loading ? (
        <Box sx={{ display: 'grid', minHeight: 320, placeItems: 'center' }}><CircularProgress /></Box>
      ) : (
        <Box component="form" onSubmit={onSubmit}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={4}>
              <SectionCard sx={{ height: '100%' }}>
                <SectionHeading icon={<QrCode2OutlinedIcon />} title="Unit identifier" description="Permanent inventory reference" />
                <Stack alignItems="center" spacing={2} sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                  <Box sx={{ display: 'grid', width: 72, height: 72, placeItems: 'center', borderRadius: 3, bgcolor: 'primary.50', color: 'primary.main' }}><Inventory2OutlinedIcon sx={{ fontSize: 34 }} /></Box>
                  <Box>
                    <Typography variant="overline" color="text.secondary" fontWeight={800}>Inventory code</Typography>
                    <Typography variant="h5" sx={{ mt: 0.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '.035em', wordBreak: 'break-word' }}>{item.unit_id || 'Assigned after save'}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>Unit IDs are generated automatically to keep numbering consistent.</Typography>
                </Stack>
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={8}>
              <SectionCard>
                <SectionHeading icon={<BuildOutlinedIcon />} title="Physical condition" description="Choose the option that best describes this unit now." />
                <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <ToggleButtonGroup exclusive value={item.condition} onChange={(_, value) => value && setItem((current) => ({ ...current, condition: value }))} aria-label="Unit condition" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25, '& .MuiToggleButtonGroup-grouped': { m: 0, border: '1px solid', borderColor: 'divider !important', borderRadius: '10px !important' } }}>
                    {conditions.map((condition) => (
                      <ToggleButton key={condition.value} value={condition.value} color={condition.tone} sx={{ display: 'block', minHeight: 74, px: 1.75, py: 1.25, textAlign: 'left' }}>
                        <Typography variant="body2" fontWeight={800}>{condition.value}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3, textTransform: 'none', lineHeight: 1.35 }}>{condition.description}</Typography>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  {errors.condition && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>{errors.condition[0]}</Typography>}
                </Box>
              </SectionCard>
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="flex-end" spacing={1} sx={{ mt: 2.5 }}>
            <Button color="inherit" onClick={() => navigate(detailPath)} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>{submitting ? <CircularProgress size={21} color="inherit" /> : item.id ? 'Save condition' : 'Create unit'}</Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
