import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  useTheme,
  useMediaQuery,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Rating,
} from '@mui/material';
import {
  AddShoppingCart as AddToCartIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from '@mui/icons-material';
import axiosClient, { assetUrl, backendBaseUrl } from '../axiosClient';

export default function UserLab() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [equipment, setEquipment] = useState([]);
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [equipmentItemCounts, setEquipmentItemCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState(() => {
    // Initialize cart from localStorage
    const savedCart = localStorage.getItem('equipment_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [favorites, setFavorites] = useState([]);
  const [selectedLab, setSelectedLab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Load cart from localStorage on mount and listen for updates
  useEffect(() => {
    // Listen for cart updates from UserLayout (when items are deleted/modified in cart drawer)
    const handleCartUpdate = (e) => {
      setCart(e.detail);
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('equipment_cart', JSON.stringify(cart));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
  }, [cart]);

  // Fetch equipment and laboratories
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [equipRes, labRes, itemsRes] = await Promise.all([
          axiosClient.get('/equipment'),
          axiosClient.get('/laboratories'),
          axiosClient.get('/item'), // Fetch all equipment items
        ]);
        
        setEquipment(equipRes.data.data || []);
        setFilteredEquipment(equipRes.data.data || []);
        setLaboratories(labRes.data.data || []);

        // Calculate available units per equipment
        const items = itemsRes.data.data || [];
        const counts = {};
        
        equipRes.data.data?.forEach(eq => {
          const eqItems = items.filter(item => item.equipment_id === eq.id);
          const totalItems = eqItems.length;
          
          // Count as available only if:
          // 1. Not borrowed (isBorrowed === false)
          // 2. Condition is good (New, Good, Fair, or Poor)
          const availableItems = eqItems.filter(item => {
            const isNotBorrowed = item.isBorrowed === 'false' || item.isBorrowed === false;
            // If condition field doesn't exist, default to true (assume available)
            const isInGoodCondition = !item.condition || ['New', 'Good', 'Fair', 'Poor'].includes(item.condition);
            return isNotBorrowed && isInGoodCondition;
          }).length;
          
          counts[eq.id] = {
            total: totalItems,
            available: availableItems,
            borrowed: totalItems - availableItems,
          };
        });

        setEquipmentItemCounts(counts);
        setError('');
      } catch (e) {
        console.error('Failed to load data:', e);
        setError('Failed to load equipment data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter equipment based on search and lab selection
  useEffect(() => {
    let filtered = equipment;

    if (selectedLab) {
      filtered = filtered.filter(eq => eq.laboratory_id === parseInt(selectedLab));
    }

    if (searchTerm) {
      filtered = filtered.filter(eq =>
        eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (eq.description && eq.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredEquipment(filtered);
  }, [searchTerm, selectedLab, equipment]);

  const handleAddToCart = (eq) => {
    const availableCount = getAvailableCount(eq);
    const existingItem = cart.find(item => item.id === eq.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === eq.id
          ? { ...item, quantity: Math.min(item.quantity + 1, availableCount) }
          : item
      ));
    } else {
      setCart([...cart, { ...eq, quantity: 1, available_count: availableCount, cartItemId: Date.now() }]);
    }
  };

  const handleRemoveFromCart = (equipmentId) => {
    setCart(cart.filter(item => item.id !== equipmentId));
  };

  const handleToggleFavorite = (equipmentId) => {
    if (favorites.includes(equipmentId)) {
      setFavorites(favorites.filter(id => id !== equipmentId));
    } else {
      setFavorites([...favorites, equipmentId]);
    }
  };

  const handleViewDetails = (eq) => {
    setSelectedEquipment(eq);
    setQuantity(1);
    setDetailsOpen(true);
  };

  const handleAddFromDetails = () => {
    const availableCount = getAvailableCount(selectedEquipment);
    const existingItem = cart.find(item => item.id === selectedEquipment.id);
    const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;
    
    // Validate total quantity doesn't exceed available
    if (newQuantity > availableCount) {
      alert(`Only ${availableCount} unit(s) available. Currently trying to add ${newQuantity}.`);
      return;
    }
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === selectedEquipment.id
          ? { ...item, quantity: newQuantity, available_count: availableCount }
          : item
      ));
    } else {
      setCart([...cart, { ...selectedEquipment, quantity, available_count: availableCount, cartItemId: Date.now() }]);
    }
    setDetailsOpen(false);
  };

  const getLabName = (labId) => {
    const lab = laboratories.find(l => l.id === labId);
    return lab?.name || 'Unknown Lab';
  };

  const getImageSrc = (imagePath) => {
    // Match the logic from admin equipment.jsx
    const BASE_URL = backendBaseUrl;
    if (!imagePath || imagePath.trim() === '' || imagePath === 'null' || imagePath === null) {
      return `${BASE_URL}/storage/itemImage/No-image-default.png`;
    }
    return `${BASE_URL}/storage/${imagePath}`;
  };

  const getAvailableCount = (eq) => {
    const counts = equipmentItemCounts[eq.id];
    return counts ? counts.available : 0;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant={isMobile ? 'h4' : 'h3'}
          fontWeight="bold"
          sx={{ color: '#800000', mb: 2 }}
        >
          Browse Equipment
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {filteredEquipment.length} equipment available
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filters Section */}
      <Card sx={{ mb: 4, p: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Search Equipment"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} /> }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Laboratory</InputLabel>
              <Select
                value={selectedLab}
                label="Laboratory"
                onChange={(e) => setSelectedLab(e.target.value)}
              >
                <MenuItem value="">All Laboratories</MenuItem>
                {laboratories.map(lab => (
                  <MenuItem key={lab.id} value={lab.id}>
                    {lab.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setSelectedLab('');
              }}
              sx={{ color: '#800000', borderColor: '#800000', '&:hover': { bgcolor: 'rgba(128, 0, 0, 0.04)' } }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Equipment Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredEquipment.length === 0 ? (
        <Alert severity="info">No equipment found. Try adjusting your filters.</Alert>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {filteredEquipment.map(eq => {
            const isFavorite = favorites.includes(eq.id);
            const inCart = cart.find(item => item.id === eq.id);
            const availableCount = getAvailableCount(eq);

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={eq.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  {/* Image Section */}
                  <Box
                    sx={{
                      bgcolor: '#f5f5f5',
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      borderBottom: '1px solid #eee',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      component="img"
                      src={getImageSrc(eq.image)}
                      alt={eq.name}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        },
                      }}
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.target.src = assetUrl(null);
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'rgba(255,255,255,0.9)',
                        borderRadius: '50%',
                        p: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleToggleFavorite(eq.id)}
                    >
                      {isFavorite ? (
                        <FavoriteIcon sx={{ color: '#d32f2f' }} />
                      ) : (
                        <FavoriteBorderIcon />
                      )}
                    </Box>
                  </Box>

                  {/* Content Section */}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      {eq.name}
                    </Typography>

                    <Stack spacing={1} sx={{ my: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Laboratory:
                        </Typography>
                        <Chip
                          label={getLabName(eq.laboratory_id)}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: '#800000', color: '#800000' }}
                        />
                      </Box>

                      {eq.categories && eq.categories.length > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Category:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {eq.categories.map(cat => (
                              <Chip
                                key={cat.id}
                                label={cat.name}
                                size="small"
                                variant="filled"
                                color="secondary"
                                sx={{ maxWidth: '100px' }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Available:
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{
                            color: availableCount > 0 ? '#388e3c' : '#d32f2f',
                          }}
                        >
                          {availableCount} units
                        </Typography>
                      </Box>

                      {eq.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          {eq.description.substring(0, 60)}...
                        </Typography>
                      )}
                    </Stack>

                    {inCart && (
                      <Chip
                        label={`In Cart (${inCart.quantity})`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </CardContent>

                  <Divider />

                  {/* Actions Section */}
                  <CardActions sx={{ pt: 2, pb: 2, justifyContent: 'space-between', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<InfoIcon />}
                      onClick={() => handleViewDetails(eq)}
                      fullWidth
                      sx={{ color: '#800000', borderColor: '#800000', '&:hover': { bgcolor: 'rgba(128, 0, 0, 0.04)' } }}
                    >
                      Details
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddToCartIcon />}
                      onClick={() => handleAddToCart(eq)}
                      disabled={availableCount === 0}
                      fullWidth
                      sx={{ bgcolor: '#800000', color: 'white', '&:hover': { bgcolor: '#600000' } }}
                    >
                      Add Cart
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Equipment Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        {selectedEquipment && (
          <>
            <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#800000', color: 'white' }}>
              {selectedEquipment.name}
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Laboratory
                  </Typography>
                  <Chip
                    label={getLabName(selectedEquipment.laboratory_id)}
                    sx={{ mt: 0.5, borderColor: '#800000', color: '#800000' }}
                    variant="outlined"
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {selectedEquipment.description || 'No description available'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Quantity to Borrow
                  </Typography>
                  <TextField
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    inputProps={{ min: 1, max: getAvailableCount(selectedEquipment) }}
                    fullWidth
                    size="small"
                  />
                </Box>

                <Box sx={{ p: 2, bgcolor: '#f0f7ff', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    ℹ️ Equipment will be held temporarily in your cart. Submit your borrow request to confirm.
                  </Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setDetailsOpen(false)} variant="outlined" sx={{ color: '#800000', borderColor: '#800000' }}>
                Cancel
              </Button>
              <Button
                onClick={handleAddFromDetails}
                variant="contained"
                startIcon={<AddToCartIcon />}
                sx={{ bgcolor: '#800000', color: 'white', '&:hover': { bgcolor: '#600000' } }}
              >
                Add {quantity} to Cart
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Cart Summary Footer */}
      {/* Cart is now managed in UserLayout - removed footer from here */}
    </Container>
  );
}
