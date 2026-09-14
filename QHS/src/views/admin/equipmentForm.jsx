import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, FormControlLabel,
  FormHelperText, FormLabel, Grid, InputLabel, MenuItem, Radio, RadioGroup,
  Select, Stack, TextField, Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import UploadOutlinedIcon from '@mui/icons-material/UploadOutlined';
import axiosClient, { assetUrl } from '../../axiosClient';
import { useStateContext } from '../../Context/ContextProvider';
import PageHeader from '../../Components/PageHeader';
import { SectionCard, SectionHeading } from '../../Components/WorkspaceUI';

const emptyEquipment = {
  id: null,
  name: '',
  condition: 'New',
  description: '',
  image: null,
  laboratory_id: '',
  category_ids: [],
};

export default function EquipmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useStateContext();
  const equipmentPath = user?.role === 'custodian' ? '/custodian/equipment' : '/admin/equipment';
  const [equipment, setEquipment] = useState(emptyEquipment);
  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [laboratories, setLaboratories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      axiosClient.get('/laboratories'),
      axiosClient.get('/categories'),
      id ? axiosClient.get(`/equipment/${id}`) : Promise.resolve(null),
    ]).then(([labResponse, categoryResponse, equipmentResponse]) => {
      if (!active) return;
      setLaboratories(labResponse.data.data || []);
      setCategories(categoryResponse.data.data || []);
      if (equipmentResponse) {
        const record = equipmentResponse.data.data;
        setEquipment({
          id: record.id,
          name: record.name || '',
          condition: record.condition || 'New',
          description: record.description || '',
          image: record.image,
          laboratory_id: record.laboratory_id || '',
          category_ids: record.categories?.map((category) => category.id) || [],
        });
        setPreviewImage(record.image ? assetUrl(`/storage/${record.image}`) : null);
      }
      setErrors({});
    }).catch(() => setErrors({ general: ['Equipment details could not be loaded.'] }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  useEffect(() => () => {
    if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage);
  }, [previewImage]);

  const selectedLabName = useMemo(() => laboratories.find((lab) => lab.id === Number(equipment.laboratory_id))?.name, [equipment.laboratory_id, laboratories]);

  const handleImageSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage);
    setSelectedImage(file);
    setPreviewImage(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage);
    setSelectedImage(null);
    setPreviewImage(null);
    setRemoveImage(true);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    const payload = new FormData();
    payload.append('name', equipment.name);
    payload.append('condition', equipment.condition);
    payload.append('description', equipment.description || '');
    payload.append('laboratory_id', equipment.laboratory_id);
    equipment.category_ids.forEach((categoryId) => payload.append('category_ids[]', categoryId));
    if (selectedImage) payload.append('image', selectedImage);
    else if (removeImage && equipment.id) payload.append('remove_image', '1');
    if (equipment.id) payload.append('_method', 'PUT');

    try {
      await axiosClient.post(equipment.id ? `/equipment/${equipment.id}` : '/equipment', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(equipmentPath);
    } catch (requestError) {
      if (requestError.response?.status === 422) setErrors(requestError.response.data.errors || {});
      else setErrors({ general: ['Equipment could not be saved. Please try again.'] });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
      <PageHeader backTo={equipmentPath} eyebrow={equipment.id ? 'Edit record' : 'New record'} title={equipment.id ? 'Edit equipment' : 'Add equipment'} description="Create the shared equipment record first. Individual trackable units can be added from its detail page." />
      {errors.general && <Alert severity="error" sx={{ mb: 2.5 }}>{errors.general.join(' ')}</Alert>}

      {loading ? (
        <Box sx={{ display: 'grid', minHeight: 360, placeItems: 'center' }}><CircularProgress /></Box>
      ) : (
        <Box component="form" onSubmit={onSubmit} noValidate>
          <Grid container spacing={2.5} alignItems="stretch">
            <Grid item xs={12} md={7}>
              <Stack spacing={2.5}>
                <SectionCard>
                  <SectionHeading icon={<Inventory2OutlinedIcon />} title="Equipment details" description="Give staff and borrowers a clear, recognizable record." />
                  <Stack spacing={2.25} sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <TextField fullWidth required label="Equipment name" value={equipment.name} onChange={(event) => setEquipment((current) => ({ ...current, name: event.target.value }))} error={Boolean(errors.name)} helperText={errors.name?.[0] || 'Use the common name shown on the item or storage label.'} />
                    <TextField fullWidth label="Description" value={equipment.description} onChange={(event) => setEquipment((current) => ({ ...current, description: event.target.value }))} multiline minRows={4} error={Boolean(errors.description)} helperText={errors.description?.[0] || 'Optional: include model, intended use, or handling notes.'} />
                    <FormControl fullWidth required error={Boolean(errors.laboratory_id)}>
                      <InputLabel id="equipment-lab-label">Laboratory</InputLabel>
                      <Select labelId="equipment-lab-label" value={equipment.laboratory_id} label="Laboratory" onChange={(event) => setEquipment((current) => ({ ...current, laboratory_id: event.target.value }))}>
                        {laboratories.map((lab) => <MenuItem key={lab.id} value={lab.id}>{lab.name}</MenuItem>)}
                      </Select>
                      <FormHelperText>{errors.laboratory_id?.[0] || 'The equipment will appear in this laboratory.'}</FormHelperText>
                    </FormControl>
                    <FormControl fullWidth error={Boolean(errors.category_ids)}>
                      <InputLabel id="equipment-category-label">Categories</InputLabel>
                      <Select labelId="equipment-category-label" multiple value={equipment.category_ids} label="Categories" onChange={(event) => setEquipment((current) => ({ ...current, category_ids: event.target.value }))} renderValue={(selected) => <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">{selected.map((categoryId) => <Chip key={categoryId} label={categories.find((category) => category.id === categoryId)?.name || categoryId} size="small" />)}</Stack>}>
                        {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
                      </Select>
                      <FormHelperText>{errors.category_ids?.[0] || 'Choose any labels that help people find this equipment.'}</FormHelperText>
                    </FormControl>
                    <FormControl error={Boolean(errors.condition)}>
                      <FormLabel>Overall condition</FormLabel>
                      <RadioGroup row value={equipment.condition} onChange={(event) => setEquipment((current) => ({ ...current, condition: event.target.value }))} sx={{ mt: 0.75, gap: 0.5 }}>
                        {['New', 'Used', 'Damaged'].map((condition) => <FormControlLabel key={condition} value={condition} control={<Radio />} label={condition} sx={{ mr: 2 }} />)}
                      </RadioGroup>
                      <FormHelperText>{errors.condition?.[0] || 'This summarizes the equipment type; each unit also has its own condition.'}</FormHelperText>
                    </FormControl>
                  </Stack>
                </SectionCard>
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <SectionCard sx={{ height: '100%' }}>
                <SectionHeading icon={<ImageOutlinedIcon />} title="Equipment image" description="A simple photo makes the item easier to identify." />
                <Stack spacing={2} sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Box sx={{ display: 'grid', width: '100%', aspectRatio: '4 / 3', placeItems: 'center', overflow: 'hidden', borderRadius: 2.5, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
                    {previewImage ? <Box component="img" src={previewImage} alt="Equipment preview" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Stack alignItems="center" spacing={1} color="text.secondary"><ImageOutlinedIcon sx={{ fontSize: 44 }} /><Typography variant="body2">No image selected</Typography></Stack>}
                  </Box>
                  <Button component="label" variant="outlined" startIcon={<UploadOutlinedIcon />}>
                    {previewImage ? 'Choose another image' : 'Choose image'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleImageSelection} />
                  </Button>
                  {previewImage && <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={handleRemoveImage}>Remove image</Button>}
                  {removeImage && <Alert severity="warning">The current image will be removed when you save.</Alert>}
                  <Box sx={{ mt: 'auto', pt: 1 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight={800}>Record preview</Typography>
                    <Typography variant="h6" sx={{ mt: 0.4 }}>{equipment.name || 'Untitled equipment'}</Typography>
                    <Typography variant="body2" color="text.secondary">{selectedLabName || 'No laboratory selected'}</Typography>
                  </Box>
                </Stack>
              </SectionCard>
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="flex-end" spacing={1} sx={{ mt: 2.5 }}>
            <Button color="inherit" onClick={() => navigate(equipmentPath)} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>{submitting ? <CircularProgress size={21} color="inherit" /> : equipment.id ? 'Save changes' : 'Create equipment'}</Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
