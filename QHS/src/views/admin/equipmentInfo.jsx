import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosClient, { backendBaseUrl } from "../../axiosClient";
import { useStateContext } from "../../Context/ContextProvider";
import { writePrintDocument } from '../../printDocument';
import QRCode from 'qrcode';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Checkbox,
  Chip,
  Stack
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from '@mui/icons-material/History';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PrintIcon from '@mui/icons-material/Print';
import Select from "react-select";
import PageHeader from "../../Components/PageHeader";
import { EmptyState, SectionCard } from "../../Components/WorkspaceUI";

export default function EquipmentInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useStateContext();
  const equipmentPath = user?.role === 'custodian' ? '/custodian/equipment' : '/admin/equipment';

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState(null);
  const [items, setItems] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Modal States
  const [openModal, setOpenModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  // History Modal States
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyItem, setHistoryItem] = useState(null);
  
  // Single QR Preview States
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [qrPreviewUrl, setQrPreviewUrl] = useState('');
  const [qrPreviewMeta, setQrPreviewMeta] = useState(null);
  
  // Bulk Selection & Print States
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);

  const BASE_URL = backendBaseUrl;

  // ---------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // ---------------------------------------------------------------------------

  const getImageSrc = (imagePath) => {
    if (!imagePath || imagePath.trim() === "" || imagePath === "null") {
      return `${BASE_URL}/storage/itemImage/No-image-default.png`;
    }
    return `${BASE_URL}/storage/${imagePath}`;
  };

  const isBorrowed = (value) => {
    return value === true || value === "true" || value === 1 || value === "1";
  };

  const getLabName = (labId) => {
    const lab = laboratories.find(l => l.id === labId);
    return lab ? lab.name : "Unknown Lab";
  };

  const getStatus = (item) => {
    // If condition field doesn't exist, treat as Good
    const condition = item.condition ?? 'Good';
    
    if (['New', 'Good', 'Fair', 'Poor'].includes(condition)) {
      if (isBorrowed(item.isBorrowed)) {
        return { text: "Borrowed", color: "warning" };
      }
      return { text: "Available", color: "success" };
    }
    return { text: condition, color: condition === 'Under Repair' ? 'warning' : 'error' };
  };

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch Equipment Details
        const eqRes = await axiosClient.get(`/equipment/${id}`);
        const eq = eqRes.data.data;
        setEquipment(eq);

        // Fetch All Items and Filter
        const itemsRes = await axiosClient.get("/item");
        const filtered = itemsRes.data.data.filter(
          item => item.equipment_id === parseInt(id)
        );
        setItems(filtered);

        // Fetch Labs and Categories
        const [labRes, catRes] = await Promise.all([
          axiosClient.get("/laboratories"),
          axiosClient.get("/categories")
        ]);

        setLaboratories(labRes.data.data || []);
        setCategories(catRes.data.data || []);

        // Set Selected Categories for React-Select
        if (eq.categories) {
          setSelectedCategories(
            eq.categories.map(c => ({ value: c.id, label: c.name }))
          );
        }

      } catch (err) {
        console.error("Failed to load data:", err);
        if (err.response && err.response.status === 404) {
          setEquipment(null);
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAllData();
    }
  }, [id]);

  // ---------------------------------------------------------------------------
  // SELECTION LOGIC
  // ---------------------------------------------------------------------------

  const handleSelectItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      // Deselect All
      setSelectedItems(new Set());
    } else {
      // Select All
      const allIds = items.map(item => item.id);
      setSelectedItems(new Set(allIds));
    }
  };

  // ---------------------------------------------------------------------------
  // BULK PRINTING LOGIC (NIIMBOT OPTIMIZED)
  // ---------------------------------------------------------------------------

  const handleBulkPrint = () => {
    const selectedItemsArray = items.filter(item => selectedItems.has(item.id));
    if (selectedItemsArray.length === 0) {
      alert('No items selected for printing');
      return;
    }
    setBulkPrintOpen(true);
  };

  const printBulkQRCodes = async () => {
    const selectedItemsArray = items.filter(item => selectedItems.has(item.id));
    
    const qrItems = await Promise.all(selectedItemsArray.map(async item => {
      const url = `${window.location.origin}/item-history/${item.unit_id}`;
      const qrSrc = await QRCode.toDataURL(url, {
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
      return { item, qrSrc, url };
    }));

    // Create HTML with optimized layout for 25x15mm Niimbot labels
    // We use a "page" class that forces a page break after every label
    let html = `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>QR Codes - Bulk Print</title>
      <style>
        /* Define the exact paper size for the printer driver */
        @page {
          size: 25mm 15mm;
          margin: 0;
        }
        
        body {
          font-family: Arial, sans-serif;
          padding: 0;
          margin: 0;
          background: white;
        }

        /* Container for a single label */
        .label-container {
          width: 25mm;
          height: 15mm;
          position: relative;
          page-break-after: always; /* Critical for thermal printers */
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: flex-start;
          box-sizing: border-box;
          padding: 1mm;
          overflow: hidden;
        }

        /* The QR Code Image */
        .qr-code {
          width: 12mm;
          height: 12mm;
          object-fit: contain;
          display: block;
        }

        /* The Text Info Section */
        .info-section {
          width: 11mm;
          height: 13mm;
          margin-left: 1mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
        }

        /* Equipment Name Styling */
        .eq-name {
          font-size: 5px;
          line-height: 1.1;
          font-weight: bold;
          text-transform: uppercase;
          max-height: 8mm;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          word-wrap: break-word;
        }

        /* Unit ID Styling */
        .unit-id {
          font-family: 'Courier New', monospace;
          font-size: 6px;
          font-weight: bold;
          margin-top: 1mm;
          white-space: nowrap;
        }

        @media print {
          body { -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>`;

    qrItems.forEach(({ item, qrSrc }) => {
      html += `
        <div class="label-container">
          <img src="${qrSrc}" alt="qr" class="qr-code" />
          <div class="info-section">
            <div class="eq-name">${equipment?.name || 'EQUIPMENT'}</div>
            <div class="unit-id">${item.unit_id}</div>
          </div>
        </div>`;
    });

    html += `</body></html>`;

    // Open a new window for printing
    const w = window.open('', '_blank');
    if (!w) {
      alert('Popup blocked. Please enable popups for this site.');
      return;
    }
    
    writePrintDocument(w, html);
    setBulkPrintOpen(false);

    // Wait for images to load before printing
    setTimeout(() => {
        w.focus();
        w.print();
        // Optional: w.close(); 
    }, 500);
  };

  // ---------------------------------------------------------------------------
  // CATEGORY SAVE LOGIC
  // ---------------------------------------------------------------------------

  const saveCategories = async () => {
    try {
      await axiosClient.put(`/equipment/${id}`, {
        category_ids: selectedCategories.map(c => c.value)
      });

      // Refresh data to show changes
      const { data } = await axiosClient.get(`/equipment/${id}`);
      setEquipment(data.data);

      setSelectedCategories(
        (data.data.categories || []).map(c => ({ value: c.id, label: c.name }))
      );

      setOpenModal(false);
    } catch (err) {
      console.error("Failed to save categories:", err);
      alert("Failed to save categories. Please try again.");
    }
  };

  // ---------------------------------------------------------------------------
  // CALCULATIONS FOR DASHBOARD
  // ---------------------------------------------------------------------------

  // Safety check before calculations
  if (!equipment && !loading) return null;

  const total = items.length;
  
  const available = items.filter(item => {
    const condition = item.condition ?? 'Good';
    return !isBorrowed(item.isBorrowed) && ['New', 'Good', 'Fair', 'Poor'].includes(condition);
  }).length;
  
  const borrowed = items.filter(item => isBorrowed(item.isBorrowed)).length;

  // ---------------------------------------------------------------------------
  // RENDER LOADING STATE
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // RENDER NOT FOUND STATE
  // ---------------------------------------------------------------------------

  if (!equipment) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <SectionCard>
          <EmptyState
            title="Equipment not found"
            description={`No equipment record was found for ID ${id}.`}
            action={<Button component={Link} to={equipmentPath} variant="contained">Back to equipment</Button>}
          />
        </SectionCard>
      </Container>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ maxWidth: 1240, mx: 'auto' }}>
      <PageHeader
        backTo={equipmentPath}
        eyebrow="Equipment record"
        title={equipment.name}
        description="Review availability, manage categories, and maintain each individually tracked unit."
        actions={<Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`${equipmentPath}/${equipment.id}`)}>Edit equipment</Button>}
      />

      {/* Main Info Card */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={{ xs: 2.5, md: 4 }}>
            {/* Left Side: Image */}
            <Grid item xs={12} md={4}>
              <CardMedia
                component="img"
                image={getImageSrc(equipment.image)}
                alt={equipment.name}
                sx={{ borderRadius: 2.5, height: { xs: 240, md: 320 }, objectFit: "cover", bgcolor: 'action.hover' }}
              />
            </Grid>
            
            {/* Right Side: Details */}
            <Grid item xs={12} md={8}>
              <Typography variant="overline" color="text.secondary" fontWeight={800}>Laboratory</Typography>
              <Typography variant="h5">{getLabName(equipment.laboratory_id)}</Typography>

              {/* Status Dashboard Box */}
              <Box sx={{ mt: 2.5, p: 2.5, bgcolor: 'action.hover', borderRadius: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2}>
                  <Box>
                    <Typography variant="overline" color="text.secondary" fontWeight={800}>Units available</Typography>
                    <Typography variant="h3" color={available === 0 ? 'error.main' : available <= 2 ? 'warning.main' : 'success.main'}>{available}<Typography component="span" variant="h5" color="text.secondary"> / {total}</Typography></Typography>
                  </Box>
                  <Chip label={borrowed > 0 ? `${borrowed} borrowed` : total > 0 ? 'All units ready' : 'No units'} color={borrowed > 0 ? 'warning' : total > 0 ? 'success' : 'default'} />
                </Stack>
              </Box>

              <Typography variant="body1" color="text.secondary" sx={{ mt: 2.5, lineHeight: 1.7 }}>
                {equipment.description || "No description has been added."}
              </Typography>

              {/* Categories Section */}
              <Box sx={{ mt: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="body2" fontWeight={750}>Categories</Typography>
                <Box sx={{ flexGrow: 1 }}>
                  <Select
                    isMulti
                    isDisabled
                    value={(equipment.categories || []).map(c => ({ value: c.id, label: c.name }))}
                    options={[]}
                    styles={{
                      control: base => ({ 
                        ...base, 
                        border: "none", 
                        background: "transparent", 
                        boxShadow: "none",
                        minHeight: "40px"
                      }),
                      multiValue: base => ({ 
                        ...base, 
                        backgroundColor: "#F7EBEF",
                        borderRadius: "8px"
                      }),
                      multiValueLabel: base => ({ 
                        ...base, 
                        color: "#711A34",
                        fontWeight: "bold"
                      })
                    }}
                  />
                </Box>
                <IconButton 
                  color="primary" 
                  onClick={() => setOpenModal(true)}
                  size="small"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Units Section Header */}
      <Box sx={{ mb: 1.75, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
        <Box>
          <Typography variant="h6">Tracked units</Typography>
          <Typography variant="body2" color="text.secondary">Select units to print inventory labels.</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(`${equipmentPath}/info/${id}/add-item`)}
            >
              Add New Unit
            </Button>
            
            {/* Show Bulk Print Button only if items are selected */}
            {selectedItems.size > 0 && (
              <Button 
                variant="contained" 
                color="secondary" 
                startIcon={<PrintIcon />}
                onClick={handleBulkPrint}
              >
                Print {selectedItems.size} QR Label{selectedItems.size !== 1 ? 's' : ''}
              </Button>
            )}
        </Box>
      </Box>

      {/* Units Table */}
      <Paper variant="outlined">
        <TableContainer sx={{ maxHeight: "60vh" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.size === items.length && items.length > 0}
                    indeterminate={selectedItems.size > 0 && selectedItems.size < items.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Unit ID</TableCell>
                <TableCell>Condition</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography variant="h6" color="text.secondary">
                      No units added yet
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => {
                  const s = getStatus(item);
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                        />
                      </TableCell>
                      
                      <TableCell sx={{ fontWeight: "bold", fontFamily: "monospace" }}>
                        {item.unit_id}
                      </TableCell>
                      
                      <TableCell>
                        <Chip label={item.condition || 'Unknown'} size="small" color={['Damaged', 'Missing'].includes(item.condition) ? 'error' : ['Under Repair', 'Poor'].includes(item.condition) ? 'warning' : item.condition === 'Fair' ? 'info' : 'success'} />
                      </TableCell>
                      
                      <TableCell>
                        <Chip label={s.text} size="small" color={s.color} />
                      </TableCell>
                      
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {/* Edit Button */}
                            <Tooltip title="Edit Unit">
                                <Link to={`${equipmentPath}/info/${id}/edit-item/${item.id}`}>
                                <IconButton color="primary">
                                    <EditIcon />
                                </IconButton>
                                </Link>
                            </Tooltip>

                            {/* History Button with Fetch Logic */}
                            <Tooltip title="View Borrower History">
                                <IconButton
                                color="primary"
                                onClick={async () => {
                                    setHistoryItem(item);
                                    setHistoryOpen(true);
                                    setHistoryLoading(true);
                                    try {
                                    const { data } = await axiosClient.get(`/item/${encodeURIComponent(item.unit_id)}/history`);
                                    setHistoryData(data.data?.history || []);
                                    } catch (err) {
                                    console.error('Failed to load history', err);
                                    setHistoryData([]);
                                    } finally {
                                    setHistoryLoading(false);
                                    }
                                }}
                                >
                                <HistoryIcon />
                                </IconButton>
                            </Tooltip>
                            
                            {/* Single QR Print Button */}
                            <Tooltip title="Print QR Code">
                                <IconButton
                                color="primary"
                                onClick={async () => {
                                    const url = `${window.location.origin}/item-history/${item.unit_id}`;
                                    setQrPreviewMeta({ 
                                        item, 
                                        equipmentName: equipment?.name, 
                                        equipment_item_id: item.unit_id 
                                    });
                                    setQrPreviewOpen(true);
                                    setQrPreviewUrl('');

                                    try {
                                      setQrPreviewUrl(await QRCode.toDataURL(url, {
                                        width: 600,
                                        margin: 2,
                                        errorCorrectionLevel: 'M',
                                      }));
                                    } catch (error) {
                                      console.error('QR generation failed', error);
                                      alert('Unable to generate this QR code.');
                                      setQrPreviewOpen(false);
                                    }
                                }}
                                >
                                <QrCodeIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* --------------------------------------------------------------------------- */}
      {/* DIALOGS / MODALS */}
      {/* --------------------------------------------------------------------------- */}

      {/* 1. Edit Categories Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", pb: 1 }}>
          Edit Categories - {equipment.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Select
              isMulti
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              value={selectedCategories}
              onChange={setSelectedCategories}
              placeholder="Select categories..."
              menuPortalTarget={document.body}
              styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button 
            onClick={saveCategories} 
            variant="contained" 
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2. History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
            Borrower History: {historyItem ? historyItem.unit_id : ''}
        </DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : historyData.length === 0 ? (
            <Typography sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                No borrower history found for this unit.
            </Typography>
          ) : (
            <TableContainer>
                <Table size="small">
                <TableHead>
                    <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date Borrowed</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Borrower</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {historyData.map(tx => (
                    <TableRow key={tx.id} hover>
                        <TableCell>
                            {tx.borrow_date ? new Date(tx.borrow_date).toLocaleString() : new Date(tx.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                            {tx.borrower_name || (tx.user ? tx.user.name : 'Unknown')}
                        </TableCell>
                        <TableCell>{tx.type || 'Standard'}</TableCell>
                        <TableCell>
                            <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                backgroundColor: tx.status === 'completed' ? '#e8f5e9' : '#fff3e0',
                                color: tx.status === 'completed' ? '#2e7d32' : '#ef6c00'
                            }}>
                                {tx.status.toUpperCase()}
                            </span>
                        </TableCell>
                        <TableCell>{tx.notes || '-'}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)} variant="outlined" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* 3. Single QR Preview Dialog */}
      <Dialog open={qrPreviewOpen} onClose={() => setQrPreviewOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
            {qrPreviewMeta?.equipmentName || 'Item QR'}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          {qrPreviewUrl ? (
            <img
              src={qrPreviewUrl}
              alt="qr"
              style={{ maxWidth: '100%', height: 'auto', border: '1px solid #eee' }}
            />
          ) : (
            <Typography>Generating QR...</Typography>
          )}
          <Typography variant="h6" sx={{ mt: 2, fontFamily: 'monospace', bgcolor: '#eee', py: 1 }}>
            {qrPreviewMeta?.equipment_item_id || ''}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button onClick={() => setQrPreviewOpen(false)} variant="outlined">Close</Button>
          <Button 
            onClick={() => {
                // Print logic for Single Item (re-using the logic, but for 1 item)
                const item = qrPreviewMeta.item;
                const html = `<!doctype html><html><head><style>@page{size:25mm 15mm;margin:0}body{margin:0;display:flex;align-items:center;padding:1mm}.qr{width:12mm;height:12mm}.info{margin-left:1mm;font-family:Arial;font-size:5px;font-weight:bold;text-transform:uppercase}.unit{font-family:'Courier New';font-size:6px;margin-top:2px}</style></head><body><img class="qr" src="${qrPreviewUrl}"/><div class="info"><div>${qrPreviewMeta.equipmentName}</div><div class="unit">${qrPreviewMeta.equipment_item_id}</div></div></body></html>`;
                const w = window.open('', '_blank');
                if(!w) return alert('Popup blocked');
                writePrintDocument(w, html);
                setTimeout(()=>w.print(), 300);
            }} 
            variant="contained" 
            startIcon={<PrintIcon />}
          >
            Print Label
          </Button>
        </DialogActions>
      </Dialog>

      {/* 4. Bulk Print Confirmation Dialog */}
      <Dialog open={bulkPrintOpen} onClose={() => setBulkPrintOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Print QR Codes - Bulk</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            You are about to print <strong>{selectedItems.size}</strong> QR code labels.
          </Typography>
          
          <Box sx={{ bgcolor: '#fff3e0', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">Printer Settings (Niimbot B1 / Thermal):</Typography>
            <ul style={{ margin: '8px 0 0 20px', fontSize: '0.9rem' }}>
                <li>Paper Size: <strong>25mm x 15mm</strong></li>
                <li>Margins: <strong>None / 0</strong></li>
                <li>Scale: <strong>100%</strong></li>
            </ul>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkPrintOpen(false)}>Cancel</Button>
          <Button 
            onClick={printBulkQRCodes} 
            variant="contained" 
            color="primary"
            startIcon={<PrintIcon />}
          >
            Print Now
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
