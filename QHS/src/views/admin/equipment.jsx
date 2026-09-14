import { useState, useEffect, useRef, memo } from "react";
import { Link } from "react-router-dom";
import axiosClient, { backendBaseUrl } from "../../axiosClient";
import { useStateContext } from "../../Context/ContextProvider";
import Select from "react-select";
import { downloadCsv, parseCsv } from '../../csv';

// MUI Components
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Paper, Button, IconButton, Checkbox, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Box, Grid, Card, CardMedia, CardContent, CardActions,
  ToggleButton, ToggleButtonGroup, useMediaQuery, useTheme, Typography, Alert,
  CircularProgress, Input, List, ListItem, ListItemIcon, ListItemText
} from "@mui/material";
import {
  FormatListBulleted as FormatListBulletedIcon,
  GridView as GridViewIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  ErrorOutline as ErrorIcon,
  Unarchive as UnarchiveIcon,
  Inventory2Outlined as EmptyEquipmentIcon
} from "@mui/icons-material";
import PageHeader from "../../Components/PageHeader";
import { SectionCard } from "../../Components/WorkspaceUI";


export default memo(function Equipment() {
  const [equipment, setEquipment] = useState([]);
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [viewMode, setViewMode] = useState("table");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importStatus, setImportStatus] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [isFileValid, setIsFileValid] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const selectRef = useRef(null);
  const { user } = useStateContext();
  const isCustodian = user?.role === 'custodian';
  const [custodianLabId, setCustodianLabId] = useState(null);

  useEffect(() => {
    if (isSmallScreen) setViewMode('grid');
  }, [isSmallScreen]);

  const BASE_URL = backendBaseUrl;

  // Safe image fallback
  const getImageSrc = (imagePath) => {
    if (!imagePath || imagePath.trim() === "" || imagePath === "null" || imagePath === null) {
      return `${BASE_URL}/storage/itemImage/No-image-default.png`;
    }
    return `${BASE_URL}/storage/${imagePath}`;
  };

  /* ==================== FETCH DATA ==================== */
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/equipment-data");

      // CORRECT WAY — data.equipment is an array, not an object
      const eq = data.equipment || [];
      const labs = data.laboratories || [];
      const cats = data.categories || [];

      const normalized = eq.map(item => ({
        ...item,
        total_quantity: item.total_quantity || 0,
        borrowed_quantity: item.borrowed_quantity || 0,
        available_quantity: item.available_quantity || 0,
        isActive: Boolean(item.isActive),
        categories: Array.isArray(item.categories) ? item.categories : []
      }));

      setEquipment(normalized);
      setFilteredEquipment(normalized);
      setLaboratories(labs);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load equipment:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAllData();
  }, []);

  // Resolve custodian's lab ID after laboratories are loaded
  useEffect(() => {
    if (isCustodian && laboratories.length > 0) {
      axiosClient.get('/laboratories').then(({ data }) => {
        const labs = data.data || data || [];
        // Find the lab where custodianID matches current user
        const myLab = labs.find(l => l.custodianID === user?.id);
        if (myLab) setCustodianLabId(myLab.id);
      }).catch(() => { });
    }
  }, [isCustodian, laboratories, user?.id]);

  /* ==================== DELETE LOGIC ==================== */
  const onDeleteClick = async (item) => {
    setDeleteError("");

    if (item.isBulk) {
      const blockedItems = equipment.filter(eq =>
        item.ids.includes(eq.id) && eq.borrowed_quantity > 0
      );

      if (blockedItems.length > 0) {
        setDeleteError(
          `Cannot delete ${blockedItems.length} item(s) because they have borrowed units: ` +
          blockedItems.map(i => `"${i.name}"`).join(", ")
        );
        handleClose();
        return;
      }

      try {
        await Promise.all(item.ids.map(id => axiosClient.delete(`equipment/${id}`)));
        fetchAllData();
        handleClose();
        setSelectedItems([]);
        setSelectAll(false);
      } catch (err) {
        setDeleteError("Failed to delete some items.");
        handleClose();
      }
    } else {
      if (item.borrowed_quantity > 0) {
        setDeleteError(
          `Cannot delete "${item.name}" — ${item.borrowed_quantity} unit(s) are currently borrowed.`
        );
        handleClose();
        return;
      }

      try {
        await axiosClient.delete(`equipment/${item.id}`);
        fetchAllData();
        handleClose();
      } catch (err) {
        setDeleteError("Failed to delete item.");
        handleClose();
      }
    }
  };

  /* ==================== HELPERS ==================== */
  const getQuantityColor = (available) => {
    if (available === 0) return "#d32f2f";
    if (available <= 2) return "#ff9800";
    if (available <= 5) return "#ffc107";
    return "#4caf50";
  };

  const getLaboratoryName = (id) => laboratories.find(l => l.id === id)?.name || "Unknown";
  const getCategoryNames = (cats) => cats?.length ? cats.map(c => c.name).join(", ") : "None";

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    setOpen(true);
    setSelectedItem({ ids: selectedItems, isBulk: true });
  };

  const handleCheckboxChange = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSelectAllChange = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const all = searchData(filteredEquipment);
      const currentPageItems = rowsPerPage === -1 ? all : all.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
      setSelectedItems(currentPageItems.map(i => i.id));
    } else {
      setSelectedItems([]);
    }
  };

  const isItemSelected = (itemId) => selectedItems.includes(itemId);
  const isSelectAllChecked = () => {
    const all = searchData(filteredEquipment);
    const currentPageItems = rowsPerPage === -1 ? all : all.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    return currentPageItems.length > 0 && currentPageItems.every(i => isItemSelected(i.id));
  };

  const toggleActiveStatus = async (item) => {
    const action = item.isActive ? "archive" : "unarchive";
    if (!confirm(`Are you sure you want to ${action} "${item.name}"?`)) return;

    try {
      await axiosClient.put(`/equipment/${item.id}/toggle-active`); // ← PUT, not PATCH

      const updated = equipment.map(e =>
        e.id === item.id ? { ...e, isActive: !e.isActive } : e
      );
      setEquipment(updated);
      setFilteredEquipment(updated);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status.");
    }
  };

  const searchData = (data) => {
    return data.filter(item => {
      const searchTerms = [...selectedFilters.filter(f => f.type === "search").map(f => f.value), query].filter(Boolean);
      const matchesQuery = searchTerms.length === 0 || searchTerms.some(t =>
        item.name.toLowerCase().includes(t.toLowerCase()) ||
        item.description?.toLowerCase().includes(t.toLowerCase()) ||
        item.id.toString().includes(t)
      );
      const selLabs = selectedFilters.filter(f => f.type === "laboratory");
      const matchesLab = selLabs.length === 0 || selLabs.some(l => l.value === item.laboratory_id);
      const selCats = selectedFilters.filter(f => f.type === "category");
      const matchesCat = selCats.length === 0 || (item.categories && item.categories.some(c => selCats.some(s => s.value === c.id)));
      return matchesQuery && matchesLab && matchesCat;
    });
  };

  const handleChangePage = (_, newPage) => { setPage(newPage); setSelectedItems([]); setSelectAll(false); };
  const handleChangeRowsPerPage = (e) => {
    const val = +e.target.value;
    if (val === -1) {
      setRowsPerPage(-1);
      setPage(0);
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      setRowsPerPage(val);
      setPage(0);
      setSelectedItems([]);
      setSelectAll(false);
    }
  };
  const handleClickOpen = (item) => { setSelectedItem(item); setOpen(true); };
  const handleClose = () => { setOpen(false); setSelectedItem(null); setDeleteError(""); };

  const handleViewModeChange = (_, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
      setSelectedItems([]);
      setSelectAll(false);
    }
  };

  const handleInputChange = (v) => setQuery(v);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      setSelectedFilters([...selectedFilters, { value: query.trim(), label: `Search: ${query.trim()}`, type: "search" }]);
      setQuery("");
      selectRef.current?.focus();
    }
  };
  const handleSelectionChange = (opts) => setSelectedFilters(opts || []);

  const groupedOptions = [
    { label: "Laboratories", options: laboratories.map(l => ({ value: l.id, label: l.name, type: "laboratory" })) },
    { label: "Categories", options: categories.map(c => ({ value: c.id, label: c.name, type: "category" })) },
  ];

  /* ==================== IMPORT LOGIC ==================== */
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);
    setImportStatus("Validating file...");
    setValidationErrors([]);
    setIsFileValid(false);

    try {
        const json = parseCsv(await file.text());

        if (json.length === 0) {
          setImportStatus("Error: File is empty");
          return;
        }

        const errors = [];
        json.forEach((row, idx) => {
          const rowNum = idx + 2;
          const rowErrors = [];

          if (!row.name || row.name.toString().toString().trim() === "") rowErrors.push("Name is missing");
          if (!row.laboratory_id) rowErrors.push("Laboratory ID is missing");

          if (rowErrors.length > 0) {
            errors.push({ row: rowNum, errors: rowErrors });
          }
        });

        setValidationErrors(errors);

        if (errors.length === 0) {
          setIsFileValid(true);
          setImportStatus(`File is valid! ${json.length} items ready to import.`);
        } else {
          setImportStatus(`Found ${errors.length} row(s) with errors.`);
        }
    } catch {
      setImportStatus("Error: Invalid or corrupted CSV file");
    }
  };

  const handleImport = async () => {
    if (!importFile || !isFileValid) return;

    setImportStatus("Uploading...");
    try {
        const json = parseCsv(await importFile.text());

        await axiosClient.post("/equipment/import", { data: json });
        setImportStatus(`Success! Imported ${json.length} items.`);
        fetchAllData();
        setTimeout(() => {
          setImportModalOpen(false);
          setImportFile(null);
          setImportStatus("");
          setValidationErrors([]);
          setIsFileValid(false);
        }, 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Import failed on server';
      setImportStatus(`Import failed: ${errorMsg}`);
    }
  };

  const downloadTemplate = () => {
    const labId = isCustodian && custodianLabId ? custodianLabId : 1;
    const template = [
      { name: "Microscope", description: "High quality", laboratory_id: labId, category_ids: "1,2", quantity: 10, is_active: true },
      { name: "Beaker Set", description: "Glass", laboratory_id: labId, category_ids: "3", quantity: 20, is_active: true }
    ];
    downloadCsv('equipment_import_template.csv', template);
  };

  // Export currently selected equipment items to Excel (only when items are selected)
  const exportToExcel = () => {
    if (!selectedItems || selectedItems.length === 0) {
      alert('No items selected to export.');
      return;
    }

    const rows = equipment
      .filter(item => selectedItems.includes(item.id))
      .map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        laboratory: getLaboratoryName(item.laboratory_id),
        total_quantity: item.total_quantity,
        available_quantity: item.available_quantity,
        borrowed_quantity: item.borrowed_quantity,
        categories: getCategoryNames(item.categories),
        isActive: item.isActive ? 'Yes' : 'No'
      }));

    downloadCsv(`equipment_selected_export_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <>
      {/* DELETE ERROR ALERT */}
      {deleteError && (
        <Alert severity="error" onClose={() => setDeleteError("")} sx={{ mb: 3, mx: 3, borderRadius: 2 }}>
          {deleteError}
        </Alert>
      )}

      <PageHeader
        eyebrow="Inventory catalog"
        title="Equipment"
        description="Search equipment, review availability, and manage the records assigned to each laboratory."
        actions={(
          <>
            {selectedItems.length > 0 && <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleBulkDelete}>Delete {selectedItems.length}</Button>}
            {!isCustodian && <Button component={Link} to="new/" variant="contained" startIcon={<AddIcon />}>Add equipment</Button>}
            <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setImportModalOpen(true)}>Import</Button>
            {selectedItems.length > 0 && <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportToExcel()}>Export selected</Button>}
          </>
        )}
      />

      <SectionCard sx={{ mb: 2.5, overflow: 'visible' }}>
        <Grid container spacing={2} alignItems="center" sx={{ p: 2 }}>
          <Grid item xs={12} md={9}>
            <Select
              ref={selectRef}
              isMulti
              options={groupedOptions}
              value={selectedFilters}
              onChange={handleSelectionChange}
              onInputChange={handleInputChange}
              onKeyDown={handleKeyDown}
              inputValue={query}
              placeholder="Search by name, laboratory, category, or status…"
              styles={{
                container: (base) => ({ ...base, width: '100%', zIndex: 1300 }),
                control: (base) => ({ ...base, minHeight: 44, borderColor: theme.palette.divider, backgroundColor: theme.palette.background.paper, boxShadow: 'none' }),
                menu: (base) => ({ ...base, backgroundColor: theme.palette.background.paper }),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: { xs: 'space-between', md: 'flex-end' }, alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{searchData(filteredEquipment).length} records</Typography>
            <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange} size="small" aria-label="Equipment view">
              <ToggleButton value="table" aria-label="Table view"><FormatListBulletedIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="card" aria-label="Card view"><GridViewIcon fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </SectionCard>

      {/* TABLE VIEW */}
      {viewMode === "table" ? (
        <TableContainer component={Paper} variant="outlined" sx={{ overflow: 'hidden' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Checkbox
                    indeterminate={selectedItems.length > 0 && !isSelectAllChecked()}
                    checked={selectAll || isSelectAllChecked()}
                    onChange={e => handleSelectAllChange(e.target.checked)}
                  />
                </TableCell>
                {["ID", "Image", "Name", "Availability", "Description", "Laboratory", "Categories", "Actions"].map(header => (
                  <TableCell key={header}>
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
              ) : searchData(filteredEquipment).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                    <Typography variant="h6" color="text.secondary">No Equipment Found</Typography>
                    <Button component={Link} to="new/" variant="contained" sx={{ mt: 2 }}>Add First Item</Button>
                  </TableCell>
                </TableRow>
              ) : (
                (() => {
                  const all = searchData(filteredEquipment);
                  const itemsToShow = rowsPerPage === -1 ? all : all.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
                  return itemsToShow.map(item => (
                    <TableRow key={item.id} hover>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={isItemSelected(item.id)} onChange={() => handleCheckboxChange(item.id)} />
                      </TableCell>

                      <TableCell component={Link} to={`info/${item.id}`} sx={{ color: 'inherit', textDecoration: 'none' }}>
                        {item.id}
                      </TableCell>

                      <TableCell component={Link} to={`info/${item.id}`} sx={{ textDecoration: 'none' }}>
                        <img
                          src={getImageSrc(item.image)}
                          width={50}
                          height={50}
                          alt={item.name}
                          style={{ borderRadius: 4, objectFit: 'cover' }}
                        />
                      </TableCell>

                      <TableCell component={Link} to={`info/${item.id}`} sx={{ fontWeight: 'bold', color: 'inherit', textDecoration: 'none' }}>
                        {item.name.toUpperCase()}
                      </TableCell>

                      <TableCell component={Link} to={`info/${item.id}`} align="center" sx={{ fontWeight: 'bold', color: getQuantityColor(item.available_quantity), textDecoration: 'none' }}>
                        {item.available_quantity} / {item.total_quantity}
                        {item.borrowed_quantity > 0 && (
                          <Typography variant="caption" display="block" color="error.main">
                            {item.borrowed_quantity} borrowed
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell component={Link} to={`info/${item.id}`} sx={{ color: 'inherit', textDecoration: 'none' }}>
                        {item.description || "-"}
                      </TableCell>

                      <TableCell component={Link} to={`info/${item.id}`} sx={{ color: 'inherit', textDecoration: 'none' }}>
                        {getLaboratoryName(item.laboratory_id)}
                      </TableCell>

                      <TableCell component={Link} to={`info/${item.id}`} sx={{ color: 'inherit', textDecoration: 'none' }}>
                        {getCategoryNames(item.categories)}
                      </TableCell>

                      <TableCell onClick={e => e.stopPropagation()}>
                        <IconButton component={Link} to={`${item.id}`} size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color={item.isActive ? "success" : "error"}
                          title={item.isActive ? "Click to Archive" : "Click to Unarchive"}
                          onClick={() => toggleActiveStatus(item)}
                        >
                          {item.isActive ? <ArchiveIcon /> : <UnarchiveIcon />}
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleClickOpen(item)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ));
                })()
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        /* CARD VIEW */
        <Grid container spacing={3}>
          {(() => {
            const all = searchData(filteredEquipment);
            const itemsToShow = rowsPerPage === -1 ? all : all.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
            if (loading) {
              return <Grid item xs={12}><Box sx={{ display: 'grid', py: 7, placeItems: 'center' }}><CircularProgress /></Box></Grid>;
            }
            if (itemsToShow.length === 0) {
              return (
                <Grid item xs={12}>
                  <Paper sx={{ p: { xs: 4, sm: 7 }, textAlign: 'center' }}>
                    <EmptyEquipmentIcon color="disabled" sx={{ fontSize: 48, mb: 1.5 }} />
                    <Typography variant="h6">No equipment found</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>Try changing the search filters or add the first equipment record.</Typography>
                    {!isCustodian && <Button component={Link} to="new/" variant="outlined" sx={{ mt: 2 }}>Add equipment</Button>}
                  </Paper>
                </Grid>
              );
            }
            return itemsToShow.map(item => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box
                    component={Link}
                    to={`info/${item.id}`}
                    sx={{
                      flexGrow: 1,
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'block'
                    }}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Checkbox
                          checked={isItemSelected(item.id)}
                          onChange={() => handleCheckboxChange(item.id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{item.name.toUpperCase()}</Typography>
                      </Box>
                      <Typography color="text.secondary">ID: {item.id}</Typography>
                      <Typography sx={{ color: getQuantityColor(item.available_quantity), fontWeight: 'bold', mt: 1 }}>
                        Available: {item.available_quantity} / {item.total_quantity}
                      </Typography>
                      {item.borrowed_quantity > 0 && (
                        <Typography color="error" fontSize="0.9rem">Down arrow {item.borrowed_quantity} borrowed</Typography>
                      )}
                      <Typography color="text.secondary" mt={1}>Lab: {getLaboratoryName(item.laboratory_id)}</Typography>
                    </CardContent>

                    <CardMedia
                      component="img"
                      height="140"
                      image={getImageSrc(item.image)}
                      alt={item.name}
                      sx={{ objectFit: 'cover' }}
                    />
                  </Box>

                  <CardActions sx={{ justifyContent: 'flex-end', bgcolor: 'background.default' }}>
                    <IconButton component={Link} to={`${item.id}`}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color={item.isActive ? "success" : "error"}
                      onClick={() => toggleActiveStatus(item)}
                    >
                      <ArchiveIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleClickOpen(item)}>
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ));
          })()}
        </Grid>
      )}

      {/* PAGINATION */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <TablePagination
          component="div"
          count={searchData(filteredEquipment).length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100, { label: 'All', value: -1 }]}
        />
      </Box>

      {/* DELETE CONFIRMATION */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle color="error.main">
          {selectedItem?.isBulk ? `Delete ${selectedItem.ids.length} items?` : `Delete "${selectedItem?.name}"?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={() => onDeleteClick(selectedItem)} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* IMPORT MODAL */}
      <Dialog open={importModalOpen} onClose={() => { setImportModalOpen(false); setImportFile(null); setImportStatus(""); setValidationErrors([]); setIsFileValid(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>Import Equipment from Excel</DialogTitle>
        <DialogContent>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadTemplate} fullWidth sx={{ mb: 2 }}>
            Download Import Template (.csv)
          </Button>

          <Input type="file" inputProps={{ accept: '.csv,text/csv' }} onChange={handleFileSelect} fullWidth sx={{ mb: 2 }} />

          {importStatus && (
            <Alert severity={isFileValid ? "success" : importStatus.includes("Error") ? "error" : "info"} sx={{ mb: 2 }}>
              {importStatus}
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Box sx={{ mt: 2, maxHeight: 200, overflow: "auto" }}>
              <Typography color="error" fontWeight="bold" gutterBottom>
                Errors found in {validationErrors.length} row(s):
              </Typography>
              <List dense>
                {validationErrors.map((err, i) => (
                  <ListItem key={i}>
                    <ListItemIcon><ErrorIcon color="error" /></ListItemIcon>
                    <ListItemText primary={`Row ${err.row}: ${err.errors.join(", ")}`} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Required:</strong> name, laboratory_id<br />
            <strong>Optional:</strong> description, category_ids (comma-separated), image_url
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setImportModalOpen(false); setImportFile(null); setImportStatus(""); setValidationErrors([]); setIsFileValid(false); }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleImport} disabled={!isFileValid}>
            {importStatus === "Uploading..." ? <CircularProgress size={20} /> : "Import"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});
