import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import {
  Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress,
  Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, Grid, IconButton, InputAdornment, InputLabel, MenuItem, Paper,
  Select, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import axiosClient, { assetUrl, backendBaseUrl } from '../axiosClient';
import PageHeader from '../Components/PageHeader';
import { EmptyState, SectionCard } from '../Components/WorkspaceUI';
import type { Category, Equipment, EquipmentUnit, Laboratory } from '../types/domain';

interface DirectoryEquipment extends Equipment {
  laboratory_id: number;
  categories: Category[];
}

interface DirectoryUnit extends EquipmentUnit {
  equipment_id: number;
}

interface EquipmentCounts {
  total: number;
  available: number;
  borrowed: number;
}

interface CartEquipment extends DirectoryEquipment {
  quantity: number;
  available_count: number;
  cartItemId?: number;
}

export default function UserLab() {
  const [equipment, setEquipment] = useState<DirectoryEquipment[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [equipmentItemCounts, setEquipmentItemCounts] = useState<Record<number, EquipmentCounts>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartEquipment[]>(() => {
    try { return JSON.parse(localStorage.getItem('equipment_cart') || '[]') as CartEquipment[]; }
    catch { return []; }
  });
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selectedLab, setSelectedLab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<DirectoryEquipment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const handleCartUpdate = (event: Event) => setCart((event as CustomEvent<CartEquipment[]>).detail);
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  useEffect(() => {
    localStorage.setItem('equipment_cart', JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
  }, [cart]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [equipmentResponse, labResponse, itemResponse] = await Promise.all([
          axiosClient.get<{ data: DirectoryEquipment[] }>('/equipment'),
          axiosClient.get<{ data: Laboratory[] }>('/laboratories'),
          axiosClient.get<{ data: DirectoryUnit[] }>('/item'),
        ]);
        if (!active) return;
        const equipmentRows = equipmentResponse.data.data || [];
        const items = itemResponse.data.data || [];
        const counts: Record<number, EquipmentCounts> = {};
        equipmentRows.forEach((record) => {
          const units = items.filter((item) => item.equipment_id === record.id);
          const available = units.filter((item) => {
            const notBorrowed = [false, 0, '0', 'false'].includes(item.isBorrowed ?? false);
            const usable = !item.condition || ['New', 'Good', 'Fair', 'Poor'].includes(item.condition);
            return notBorrowed && usable;
          }).length;
          counts[record.id] = { total: units.length, available, borrowed: units.length - available };
        });
        setEquipment(equipmentRows);
        setLaboratories(labResponse.data.data || []);
        setEquipmentItemCounts(counts);
        setError('');
      } catch {
        if (active) setError('Equipment could not be loaded. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, []);

  const filteredEquipment = useMemo(() => equipment.filter((record) => {
    if (selectedLab && record.laboratory_id !== Number(selectedLab)) return false;
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return record.name.toLowerCase().includes(query) || record.description?.toLowerCase().includes(query) || record.categories?.some((category) => category.name.toLowerCase().includes(query));
  }), [equipment, searchTerm, selectedLab]);

  const getAvailableCount = (record: DirectoryEquipment) => equipmentItemCounts[record.id]?.available || 0;
  const getLabName = (labId: number) => laboratories.find((lab) => lab.id === labId)?.name || 'Unassigned laboratory';
  const getImageSrc = (imagePath?: string | null) => imagePath ? `${backendBaseUrl}/storage/${imagePath}` : assetUrl(null);
  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.src = assetUrl(null); };

  const addQuantityToCart = (record: DirectoryEquipment, amount = 1) => {
    const available = getAvailableCount(record);
    const existing = cart.find((item) => item.id === record.id);
    const nextQuantity = (existing?.quantity || 0) + amount;
    if (nextQuantity > available) {
      alert(`Only ${available} unit(s) are available.`);
      return false;
    }
    if (existing) setCart((current) => current.map((item) => item.id === record.id ? { ...item, quantity: nextQuantity, available_count: available } : item));
    else setCart((current) => [...current, { ...record, quantity: amount, available_count: available, cartItemId: Date.now() }]);
    return true;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLab('');
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <PageHeader eyebrow="Equipment directory" title="Find equipment" description="Browse available units across QHS laboratories and build a borrowing request." meta={`${filteredEquipment.length} result${filteredEquipment.length === 1 ? '' : 's'}`} />
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5 }}>{error}</Alert>}

      <SectionCard sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center" sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              label="Search equipment"
              placeholder="Name, description, or category"
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={7} md={4}>
            <FormControl fullWidth>
              <InputLabel id="laboratory-filter-label">Laboratory</InputLabel>
              <Select labelId="laboratory-filter-label" value={selectedLab} label="Laboratory" onChange={(event) => setSelectedLab(String(event.target.value))}>
                <MenuItem value="">All laboratories</MenuItem>
                {laboratories.map((lab) => <MenuItem key={lab.id} value={String(lab.id)}>{lab.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={5} md={2}>
            <Button fullWidth variant="outlined" color="inherit" startIcon={<TuneIcon />} onClick={clearFilters} disabled={!searchTerm && !selectedLab}>Clear filters</Button>
          </Grid>
        </Grid>
      </SectionCard>

      {loading ? (
        <Box sx={{ display: 'grid', minHeight: 340, placeItems: 'center' }}><CircularProgress /></Box>
      ) : filteredEquipment.length === 0 ? (
        <SectionCard><EmptyState icon={<Inventory2OutlinedIcon />} title="No equipment matches" description="Try another keyword or clear the laboratory filter." action={<Button onClick={clearFilters} variant="outlined">Clear filters</Button>} /></SectionCard>
      ) : (
        <Grid container spacing={2.5}>
          {filteredEquipment.map((record) => {
            const available = getAvailableCount(record);
            const inCart = cart.find((item) => item.id === record.id);
            const favorite = favorites.includes(record.id);
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={record.id}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { borderColor: 'primary.light' } }}>
                  <Box sx={{ position: 'relative', height: 190, overflow: 'hidden', bgcolor: 'action.hover' }}>
                    <Box component="img" src={getImageSrc(record.image)} alt={record.name} onError={handleImageError} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <Tooltip title={favorite ? 'Remove from saved items' : 'Save for later'}>
                      <IconButton aria-label={favorite ? `Remove ${record.name} from saved items` : `Save ${record.name}`} onClick={() => setFavorites((current) => current.includes(record.id) ? current.filter((id) => id !== record.id) : [...current, record.id])} sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(255,255,255,.94)', color: favorite ? 'error.main' : 'text.secondary', '&:hover': { bgcolor: 'common.white' } }}>
                        {favorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                      </IconButton>
                    </Tooltip>
                    <Chip label={available > 0 ? `${available} available` : 'Unavailable'} color={available > 0 ? 'success' : 'default'} size="small" sx={{ position: 'absolute', left: 10, bottom: 10 }} />
                  </Box>
                  <CardContent sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem' }}>{record.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65 }}>{getLabName(record.laboratory_id)}</Typography>
                    {record.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{record.description}</Typography>}
                    {record.categories?.length > 0 && (
                      <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                        {record.categories.slice(0, 2).map((category) => <Chip key={category.id} label={category.name} size="small" variant="outlined" />)}
                        {record.categories.length > 2 && <Chip label={`+${record.categories.length - 2}`} size="small" variant="outlined" />}
                      </Stack>
                    )}
                    {inCart && <Typography variant="caption" color="primary" fontWeight={760} sx={{ display: 'block', mt: 1.5 }}>{inCart.quantity} in your cart</Typography>}
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ p: 1.5, gap: 0.75 }}>
                    <Button fullWidth color="inherit" onClick={() => { setSelectedEquipment(record); setQuantity(1); setDetailsOpen(true); }}>Details</Button>
                    <Button fullWidth variant="contained" startIcon={<AddShoppingCartOutlinedIcon />} disabled={available === 0 || (inCart?.quantity || 0) >= available} onClick={() => addQuantityToCart(record)}>Add</Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        {selectedEquipment && (
          <>
            <DialogTitle>
              <Typography variant="overline" color="primary" fontWeight={820}>Equipment details</Typography>
              <Typography variant="h5">{selectedEquipment.name}</Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={5}>
                  <Box component="img" src={getImageSrc(selectedEquipment.image)} alt={selectedEquipment.name} onError={handleImageError} sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 2, bgcolor: 'action.hover' }} />
                </Grid>
                <Grid item xs={12} sm={7}>
                  <Typography variant="caption" color="text.secondary">Laboratory</Typography>
                  <Typography fontWeight={720}>{getLabName(selectedEquipment.laboratory_id)}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Description</Typography>
                  <Typography variant="body2" sx={{ mt: 0.4, lineHeight: 1.65 }}>{selectedEquipment.description || 'No description provided.'}</Typography>
                  <Chip label={`${getAvailableCount(selectedEquipment)} units available`} color={getAvailableCount(selectedEquipment) > 0 ? 'success' : 'default'} size="small" sx={{ mt: 2 }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth type="number" label="Quantity to borrow" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number.parseInt(event.target.value, 10) || 1))} inputProps={{ min: 1, max: getAvailableCount(selectedEquipment) }} helperText="The custodian will confirm the exact units when approving your request." />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button color="inherit" onClick={() => setDetailsOpen(false)}>Close</Button>
              <Button variant="contained" startIcon={<AddShoppingCartOutlinedIcon />} disabled={getAvailableCount(selectedEquipment) === 0} onClick={() => { if (addQuantityToCart(selectedEquipment, quantity)) setDetailsOpen(false); }}>Add {quantity} to cart</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}
