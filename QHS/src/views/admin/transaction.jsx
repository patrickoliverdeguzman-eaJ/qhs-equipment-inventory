// src/views/admin/Transactions.jsx
// FIXED: Blank table & "No equipment" issues — now robust and clean
import { useStateContext } from "../../Context/ContextProvider";
import { useEffect, useState, useMemo, memo, useRef } from "react";
import { useLocation } from "react-router-dom";
import axiosClient from "../../axiosClient";
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip, OutlinedInput,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, IconButton, Paper,
  Typography, Grid, Alert, CircularProgress, Checkbox, Autocomplete,
  useTheme, useMediaQuery, List, ListItem, ListItemText, ListItemSecondaryAction,
  Tooltip, Stack, Snackbar, LinearProgress, Divider
} from "@mui/material";
import {
  Edit, Add, Visibility, Save, Search as SearchIcon,
  Close, CheckCircle, Warning, Info, SwapHoriz, Pending,
  CheckCircleOutline, Cancel, HourglassEmpty, Autorenew, Block,
  Delete, InboxOutlined, LocalShippingOutlined, AssignmentTurnedInOutlined,
  Inventory2Outlined
} from "@mui/icons-material";
import { format } from "date-fns";
import PageHeader from "../../Components/PageHeader";
import { SectionCard } from "../../Components/WorkspaceUI";
import QrUnitScanner from "../../Components/QrUnitScanner";
import { addUniqueUnitScan, returnProgress, validateSelectedReturns } from "../../utils/custodyWorkflow";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: { style: { maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP, width: 250 } }
};

export default memo(function Transactions() {
  const { user: currentUser } = useStateContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();

  // Highlight from notification click
  // NOTE: must use useEffect (not lazy useState) because Transaction is wrapped in memo,
  // so the lazy initializer only runs on first-ever mount, not on re-navigation.
  const [highlightId, setHighlightId] = useState(null);
  const highlightRowRef = useRef(null);

  useEffect(() => {
    const id = sessionStorage.getItem('highlightTransactionId');
    if (id) {
      sessionStorage.removeItem('highlightTransactionId');
      setHighlightId(Number(id));
    }
  }, [location]);

  // ==================== STATES ====================
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editAllowed, setEditAllowed] = useState({ full: false, notes: false, return_date: false });
  const [editStatus, setEditStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Reject dialog
  const [rejectDialog, setRejectDialog] = useState({ open: false, transactionId: null, reason: '' });
  const [approvalDialog, setApprovalDialog] = useState({ open: false, transaction: null, dueDate: '', busy: false, error: '' });
  const [issueDialog, setIssueDialog] = useState({ open: false, transaction: null, scanned: [], notes: '', busy: false, error: '' });
  const [returnDialog, setReturnDialog] = useState({ open: false, transaction: null, selected: {}, details: {}, busy: false, error: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Detail Modal
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [assignedItems, setAssignedItems] = useState({});
  const [availableReplacements, setAvailableReplacements] = useState({});
  const [pendingSelection, setPendingSelection] = useState({});

  // Form
  const [form, setForm] = useState({
    id: null,
    borrower_id: null,
    borrower_name: "",
    borrower_email: "",
    borrower_contact: "",
    laboratory_id: "",
    equipment: [],
    borrow_date: format(new Date(), "yyyy-MM-dd"),
    return_date: "",
    notes: "",
  });

  // ==================== DATA FETCHING ====================
  const fetchTransactions = async (pageNum = 1) => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get(`/transactions?per_page=25&page=${pageNum}`);
      setTransactions(Array.isArray(data.data) ? data.data : []);
      setPage(data.current_page || 1);
      setTotalPages(data.last_page || 1);
    } catch (e) {
      console.error(e);
      setError("Failed to load transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchUsers();
    fetchLaboratories();
    fetchAllEquipment();
  }, []);

  // Scroll to highlighted row after transactions load
  useEffect(() => {
    if (highlightId && highlightRowRef.current) {
      highlightRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => setHighlightId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, transactions]);

  const fetchUsers = async () => {
    try {
      const { data } = await axiosClient.get("/users");
      setUsers(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchLaboratories = async () => {
    try {
      const { data } = await axiosClient.get("/laboratories");
      setLaboratories(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchAllEquipment = async () => {
    setLoadingEquipment(true);
    try {
      const [eqRes, itemRes] = await Promise.all([
        axiosClient.get("/equipment"),
        axiosClient.get("/item")
      ]);

      const items = itemRes.data.data || [];

      const enriched = (eqRes.data.data || [])
        .filter(eq => !!eq.isActive)
        .map(eq => {
          const goodUnits = items.filter(i =>
            i.equipment_id === eq.id &&
            !i.isBorrowed &&
            !['Damaged', 'Missing', 'Under Repair'].includes(i.condition)
          );

          return {
            ...eq,
            available: goodUnits.length,
            hasAvailable: goodUnits.length > 0
          };
        });

      setEquipment(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEquipment(false);
    }
  };

  // Notify other views that transactions changed
  const notifyTransactionsChanged = () => {
    try {
      console.debug('transaction.jsx: dispatching transactions:changed');
      window.dispatchEvent(new CustomEvent('transactions:changed'));
      // also set localStorage key to notify other tabs/windows
      try {
        localStorage.setItem('transactions:changed', Date.now().toString());
      } catch (e) {
        // ignore storage errors (e.g., private mode)
      }
    } catch (e) {
      console.error('Failed to dispatch transactions:changed', e);
    }
  };

  // ==================== HELPERS ====================
  const availableEquipment = useMemo(() => {
    if (!form.laboratory_id) return [];

    return equipment.filter(eq =>
      eq.laboratory_id === Number(form.laboratory_id) &&
      eq.hasAvailable
    );
  }, [form.laboratory_id, equipment]);

  const totalQuantity = form.equipment.reduce((sum, e) => sum + (e.quantity || 0), 0);

  const getStage = (transaction) => transaction.lifecycle_stage || transaction.status;

  const getStatusLabel = (transaction) => {
    if (transaction.status === 'approved') return 'Approved — awaiting pickup';
    if (transaction.lifecycle_stage === 'partially_returned') return transaction.is_overdue ? 'Partially returned — overdue' : 'Partially returned';
    if (transaction.is_overdue) return 'Overdue';
    if (transaction.is_due_today) return 'Due today';
    return transaction.status ? transaction.status.replaceAll('_', ' ') : 'Unknown';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Pending fontSize="small" />;
      case 'approved': return <Inventory2Outlined fontSize="small" />;
      case 'partially_returned': return <Autorenew fontSize="small" />;
      case 'overdue': return <Warning fontSize="small" />;
      case 'borrowed': return <CheckCircleOutline fontSize="small" />;
      case 'returned': return <CheckCircle fontSize="small" />;
      case 'rejected': return <Cancel fontSize="small" />;
      default: return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'secondary';
      case 'partially_returned': return 'warning';
      case 'overdue': return 'error';
      case 'borrowed': return 'info';
      case 'returned': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  // ==================== FORM HANDLERS ====================
  const handleOpen = (trx = null) => {
    if (trx) {
      setEditMode(true);
      // determine which fields are editable based on status
      const status = trx.status;
      setEditStatus(status);
      if (status === 'pending') {
        setEditAllowed({ full: true, notes: true, return_date: true });
      } else if (['approved', 'borrowed'].includes(status)) {
        setEditAllowed({ full: false, notes: true, return_date: true });
      } else if (['rejected', 'returned'].includes(status)) {
        setEditAllowed({ full: false, notes: true, return_date: false });
      } else {
        setEditAllowed({ full: false, notes: false, return_date: false });
      }
      setForm({
        id: trx.id,
        borrower_id: trx.borrower_id,
        borrower_name: trx.borrower_name || "",
        borrower_email: trx.borrower_email || "",
        borrower_contact: trx.borrower_contact || "",
        laboratory_id: trx.laboratory_id || "",
        equipment: (trx.equipment || []).map(e => ({
          equipment_id: e.id,
          name: e.name || "Unknown",
          quantity: e.quantity || 1
        })),
        borrow_date: trx.borrow_date ? trx.borrow_date.split(" ")[0] : format(new Date(), "yyyy-MM-dd"),
        return_date: trx.return_date ? trx.return_date.split(" ")[0] : "",
        notes: trx.notes || "",
      });
    } else {
      setEditMode(false);
      setEditAllowed({ full: true, notes: true, return_date: true });
      setEditStatus(null);
      const isStudentRequest = currentUser?.role === "user";
      setForm({
        id: null,
        borrower_id: isStudentRequest ? currentUser.id : null,
        borrower_name: isStudentRequest ? currentUser.name || "" : "",
        borrower_email: isStudentRequest ? currentUser.email || "" : "",
        borrower_contact: isStudentRequest ? currentUser.phone_number || "" : "",
        laboratory_id: "",
        equipment: [],
        borrow_date: format(new Date(), "yyyy-MM-dd"),
        return_date: "",
        notes: "",
      });
    }

    fetchAllEquipment();
    setOpen(true);
    setError("");
  };

  const handleClose = () => {
    setOpen(false);
    setError("");
  };

  const handleUserChange = (event, newValue) => {
    if (newValue) {
      setForm({
        ...form,
        borrower_id: newValue.id,
        borrower_name: newValue.name || "",
        borrower_email: newValue.email || "",
        borrower_contact: newValue.phone_number || ""
      });
    } else {
      setForm({ ...form, borrower_id: null, borrower_name: "", borrower_email: "", borrower_contact: "" });
    }
  };

  const handleEquipmentChange = (event) => {
    const selected = event.target.value;
    const newEq = selected.map(id => {
      const eq = availableEquipment.find(e => e.id === id);
      const existing = form.equipment.find(e => e.equipment_id === id);
      return {
        equipment_id: id,
        name: eq?.name || "Unknown",
        quantity: existing?.quantity || 1
      };
    });
    setForm({ ...form, equipment: newEq });
  };

  const handleQuantityChange = (eqId, qty) => {
    const qtyNum = parseInt(qty) || 0;
    const eq = availableEquipment.find(e => e.id === eqId);
    if (!eq || qtyNum > eq.available || qtyNum < 1) return;

    setForm({
      ...form,
      equipment: form.equipment.map(e =>
        e.equipment_id === eqId ? { ...e, quantity: qtyNum } : e
      )
    });
  };

  const handleSubmit = async () => {
    if (!form.borrower_id || !form.laboratory_id) {
      setError("Borrower and Laboratory are required.");
      return;
    }

    if (!editMode && form.equipment.length === 0) {
      setError("Please select at least one equipment.");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      borrower_id: form.borrower_id,
      borrower_name: form.borrower_name,
      borrower_email: form.borrower_email || null,
      borrower_contact: form.borrower_contact || null,
      laboratory_id: Number(form.laboratory_id),
      borrow_date: form.borrow_date,
      return_date: form.return_date || null,
      notes: form.notes || null,
      equipment: form.equipment.map(e => ({
        equipment_id: e.equipment_id,
        quantity: e.quantity
      }))
    };

    try {
      if (editMode) {
        // when editing, backend accepts different payloads depending on status
        if (editStatus === 'pending' || editStatus === null) {
          await axiosClient.put(`/transactions/${form.id}`, payload);
        } else if (['approved', 'borrowed'].includes(editStatus)) {
          await axiosClient.put(`/transactions/${form.id}`, {
            notes: form.notes || null,
            return_date: form.return_date || null
          });
        } else if (['rejected', 'returned'].includes(editStatus)) {
          await axiosClient.put(`/transactions/${form.id}`, {
            notes: form.notes || null
          });
        } else {
          await axiosClient.put(`/transactions/${form.id}`, {
            notes: form.notes || null
          });
        }
      } else {
        await axiosClient.post("/transactions", payload);
      }
      fetchTransactions(page);
      // Notify other views (e.g., recent activities card) to refresh immediately
      notifyTransactionsChanged();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const assignedUnits = (transaction) => (transaction?.equipment || []).flatMap(eq =>
    (eq.items || []).map(item => ({ ...item, equipmentName: eq.name }))
  );

  const handleAccept = (transaction) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existingDueDate = transaction.return_date?.split(' ')[0] || '';
    setApprovalDialog({
      open: true,
      transaction,
      dueDate: existingDueDate >= today ? existingDueDate : today,
      busy: false,
      error: '',
    });
  };

  const confirmApproval = async () => {
    if (!approvalDialog.dueDate) {
      setApprovalDialog(prev => ({ ...prev, error: 'Choose a due date before approval.' }));
      return;
    }
    setApprovalDialog(prev => ({ ...prev, busy: true, error: '' }));
    try {
      await axiosClient.post(`/transactions/${approvalDialog.transaction.id}/accept`, {
        return_date: approvalDialog.dueDate,
      });
      setApprovalDialog(prev => ({ ...prev, open: false, busy: false }));
      fetchTransactions(page);
      notifyTransactionsChanged();
      showSnackbar('Request approved. The assigned units are reserved and ready for pickup.');
    } catch (e) {
      setApprovalDialog(prev => ({ ...prev, busy: false, error: e.response?.data?.message || 'Approval failed.' }));
    }
  };

  const handleDecline = (id) => {
    setRejectDialog({ open: true, transactionId: id, reason: '' });
  };

  const confirmDecline = async () => {
    const { transactionId, reason } = rejectDialog;
    setRejectDialog(prev => ({ ...prev, open: false }));
    try {
      await axiosClient.post(`/transactions/${transactionId}/decline`, {
        rejection_reason: reason.trim() || null,
      });
      fetchTransactions(page);
      notifyTransactionsChanged();
      showSnackbar('Request declined. Reserved units are available again.');
    } catch (e) {
      showSnackbar(e.response?.data?.message || 'Failed to decline request.', 'error');
    }
  };

  const openIssueDialog = (transaction) => {
    setIssueDialog({ open: true, transaction, scanned: [], notes: '', busy: false, error: '' });
  };

  const addIssueScan = (unitId) => {
    const validUnits = assignedUnits(issueDialog.transaction).map(item => item.unit_id);
    const result = addUniqueUnitScan(issueDialog.scanned, unitId, validUnits);
    if (result.error === 'unknown') {
      setIssueDialog(prev => ({ ...prev, error: `${result.unitId || 'That scan'} is not assigned to this request.` }));
      return;
    }
    if (result.error === 'duplicate') {
      showSnackbar(`${result.unitId} was already checked.`, 'warning');
      return;
    }
    setIssueDialog(prev => ({ ...prev, scanned: result.units, error: '' }));
  };

  const confirmIssue = async () => {
    const required = assignedUnits(issueDialog.transaction);
    if (issueDialog.scanned.length !== required.length) {
      setIssueDialog(prev => ({ ...prev, error: 'Scan or check every assigned unit before issuing.' }));
      return;
    }
    setIssueDialog(prev => ({ ...prev, busy: true, error: '' }));
    try {
      await axiosClient.post(`/transactions/${issueDialog.transaction.id}/issue`, {
        unit_ids: issueDialog.scanned,
        notes: issueDialog.notes.trim() || null,
      });
      setIssueDialog(prev => ({ ...prev, open: false, busy: false }));
      fetchTransactions(page);
      notifyTransactionsChanged();
      showSnackbar('Equipment issued. Custody and issue conditions were recorded.');
    } catch (e) {
      setIssueDialog(prev => ({ ...prev, busy: false, error: e.response?.data?.message || 'Could not issue equipment.' }));
    }
  };

  const openReturnDialog = (transaction) => {
    const outstanding = assignedUnits(transaction).filter(item => item.issued_at && !item.returned_at);
    setReturnDialog({
      open: true,
      transaction,
      selected: {},
      details: Object.fromEntries(outstanding.map(item => [item.unit_id, { condition: '', notes: '' }])),
      busy: false,
      error: '',
    });
  };

  const addReturnScan = (unitId) => {
    const outstanding = assignedUnits(returnDialog.transaction).filter(item => item.issued_at && !item.returned_at);
    if (!outstanding.some(item => item.unit_id === unitId)) {
      setReturnDialog(prev => ({ ...prev, error: `${unitId} is not an outstanding unit on this request.` }));
      return;
    }
    if (returnDialog.selected[unitId]) {
      showSnackbar(`${unitId} is already selected.`, 'warning');
      return;
    }
    setReturnDialog(prev => ({ ...prev, selected: { ...prev.selected, [unitId]: true }, error: '' }));
  };

  const confirmPartialReturn = async () => {
    const selectedUnitIds = Object.entries(returnDialog.selected).filter(([, checked]) => checked).map(([unitId]) => unitId);
    const validationError = validateSelectedReturns(selectedUnitIds, returnDialog.details);
    if (validationError) {
      setReturnDialog(prev => ({ ...prev, error: validationError }));
      return;
    }

    setReturnDialog(prev => ({ ...prev, busy: true, error: '' }));
    try {
      const { data } = await axiosClient.post(`/transactions/${returnDialog.transaction.id}/return-items`, {
        items: selectedUnitIds.map(unitId => ({
          unit_id: unitId,
          condition: returnDialog.details[unitId].condition,
          notes: returnDialog.details[unitId].notes.trim() || null,
        })),
      });
      setReturnDialog(prev => ({ ...prev, open: false, busy: false }));
      fetchTransactions(page);
      notifyTransactionsChanged();
      showSnackbar(data.message || 'Return recorded.');
    } catch (e) {
      setReturnDialog(prev => ({ ...prev, busy: false, error: e.response?.data?.message || 'Could not record this return.' }));
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;

    const term = search.toLowerCase();
    return transactions.filter(t => {
      return (
        t.id.toString().includes(term) ||
        (t.borrower_name || "").toLowerCase().includes(term) ||
        (t.borrower_email || "").toLowerCase().includes(term) ||
        (t.laboratory?.name || "").toLowerCase().includes(term) ||
        (t.equipment_summary || "").toLowerCase().includes(term)
      );
    });
  }, [transactions, search]);

  // ==================== UNIT ASSIGNMENT MODAL ====================
  const handleViewItems = async (transaction) => {
    try {
      const { data } = await axiosClient.get(`/transactions/${transaction.id}`);
      const fullTx = data.data;

      setSelectedTransaction(fullTx);
      setIsEditingItems(false);
      setPendingSelection({});

      const items = {};
      fullTx.equipment.forEach(eq => {
        items[eq.id] = eq.items?.map(i => i.unit_id) || [];
      });
      setAssignedItems(items);

      const promises = fullTx.equipment.map(eq => fetchAvailableItems(eq.id));
      await Promise.all(promises);

    } catch (e) {
      console.error("Failed to load details", e);
      showSnackbar('Could not load assigned items.', 'error');
    }
  };

  const fetchAvailableItems = async (equipmentId) => {
    try {
      const res = await axiosClient.get(`/equipment/${equipmentId}/available-items`);
      setAvailableReplacements(prev => ({ ...prev, [equipmentId]: res.data.data || [] }));
    } catch (e) {
      console.error(e);
      setAvailableReplacements(prev => ({ ...prev, [equipmentId]: [] }));
    }
  };

  const handleSaveAssignedItems = async () => {
    if (!selectedTransaction) return;

    const hasWrongCount = selectedTransaction.equipment.some(eq => {
      const required = eq.quantity || 0;
      const assigned = assignedItems[eq.id]?.length || 0;
      return assigned !== required;
    });

    if (hasWrongCount) {
      showSnackbar('Assign exactly the required number of units for each equipment.', 'warning');
      return;
    }

    try {
      await axiosClient.post(`/transactions/${selectedTransaction.id}/update-assigned-items`, {
        assigned_items: assignedItems
      });

      showSnackbar('Assigned items updated successfully.');
      setSelectedTransaction(null);
      setIsEditingItems(false);
      setAssignedItems({});
      setAvailableReplacements({});
      setPendingSelection({});
      fetchTransactions(page);
      notifyTransactionsChanged();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to save assigned units.', 'error');
    }
  };

  const canEditItems = selectedTransaction?.status === 'pending';

  // ==================== RENDER ====================
  return (
    <Box>
      <PageHeader
        eyebrow="Borrowing operations"
        title="Transactions"
        description="Review requests, assign individual units, and keep every handoff and return accountable."
        actions={<Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>New request</Button>}
      />

      <SectionCard sx={{ mb: 2.5 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            label="Search transactions"
            placeholder="Request ID, borrower, laboratory, or equipment"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} /> }}
          />
        </Box>
      </SectionCard>

      {/* TABLE */}
      <Paper variant="outlined">
        {!loading && filtered.length === 0 && (
          <Box sx={{ display: { xs: 'grid', sm: 'none' }, px: 3, py: 6, placeItems: 'center', textAlign: 'center' }}>
            <InboxOutlined color="disabled" sx={{ fontSize: 46, mb: 1.5 }} />
            <Typography variant="h6">No transactions found</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>New borrowing requests will appear here.</Typography>
          </Box>
        )}
        <TableContainer sx={{ display: !loading && filtered.length === 0 ? { xs: 'none', sm: 'block' } : 'block', maxWidth: '100%', border: 0, borderRadius: 0 }}>
          <Table size={isMobile ? "small" : "medium"} sx={{ minWidth: isMobile ? 520 : 760 }}>
          <TableHead>
            <TableRow>
              {["ID", "Borrower", !isMobile && "Lab", "Equipment", "Status", "Actions"]
                .filter(Boolean)
                .map((label) => (
                  <TableCell
                    key={label}
                    sx={{
                      py: 2,
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ position: isMobile ? 'sticky' : 'static', left: 0 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filtered.length > 0 ? (
              filtered.map(t => (
                <TableRow
                  key={t.id}
                  hover
                  ref={t.id === highlightId ? highlightRowRef : null}
                  sx={t.id === highlightId ? {
                    bgcolor: 'rgba(255, 193, 7, 0.25)',
                    transition: 'background-color 0.5s ease',
                    outline: '2px solid #ffc107',
                  } : undefined}
                >
                  <TableCell>{t.id}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography fontWeight="medium">{t.borrower_name || "-"}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.borrower_email || ""}</Typography>
                    </Box>
                  </TableCell>
                  {!isMobile && <TableCell>{t.laboratory?.name || "—"}</TableCell>}
                  <TableCell>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<Visibility />}
                      onClick={() => handleViewItems(t)}
                      sx={{ textTransform: "none" }}
                    >
                      View Items
                    </Button>
                    <Box sx={{ mt: 0.5 }}>
                      {/* Clean preview — uses summary first, then fallback */}
                      {t.equipment_summary && t.equipment_summary.trim() ? (
                        t.equipment_summary.split(' • ').map((item, i) => (
                          <Typography key={i} variant="caption" display="block" color="text.secondary">
                            {item.trim()}
                          </Typography>
                        ))
                      ) : Array.isArray(t.equipment) && t.equipment.length > 0 ? (
                        t.equipment.map(eq => (
                          <Typography key={eq.id} variant="caption" display="block" color="text.secondary">
                            {eq.name} × {eq.quantity || 1}
                          </Typography>
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No equipment
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(getStage(t))}
                      label={getStatusLabel(t).toUpperCase()}
                      color={getStatusColor(getStage(t))}
                      size="small"
                    />
                    {t.status === 'borrowed' && t.issued_count > 0 && (
                      <Box sx={{ mt: 1, minWidth: 120 }}>
                        <LinearProgress variant="determinate" value={returnProgress(t.issued_count, t.returned_count)} />
                        <Typography variant="caption" color="text.secondary">
                          {t.returned_count}/{t.issued_count} returned
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {t.status === 'pending' && (
                        <>
                          <Button size="small" variant="contained" color="success" onClick={() => handleAccept(t)}>Approve</Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => handleDecline(t.id)}>Reject</Button>
                        </>
                      )}
                      {t.status === 'approved' && (
                        <Button size="small" variant="contained" startIcon={<LocalShippingOutlined />} onClick={() => openIssueDialog(t)}>
                          Issue
                        </Button>
                      )}
                      {t.status === 'borrowed' && (
                        <Button size="small" variant="contained" color="primary" startIcon={<AssignmentTurnedInOutlined />} onClick={() => openReturnDialog(t)}>
                          Return units
                        </Button>
                      )}
                      {t.status === 'pending' && (
                        <IconButton size="small" onClick={() => handleOpen(t)}>
                          <Edit />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ position: isMobile ? 'sticky' : 'static', left: 0 }}>
                  <Typography variant="body2" color="text.secondary">
                    No transactions found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button disabled={page <= 1} onClick={() => fetchTransactions(page - 1)} variant="outlined">Previous</Button>
          <Typography sx={{ alignSelf: 'center' }}>Page {page} of {totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => fetchTransactions(page + 1)} variant="outlined">Next</Button>
        </Box>
      </Paper>

      {/* MAIN FORM MODAL */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>
          {editMode ? "Edit Request" : "New Borrow Request"}
        </DialogTitle>
        <DialogContent dividers>
          {loadingEquipment && <Box textAlign="center" py={3}><CircularProgress /></Box>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Borrower */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={users}
                getOptionLabel={opt => `${opt.name} (${opt.email})`}
                value={users.find(u => u.id === form.borrower_id) || null}
                onChange={handleUserChange}
                renderInput={params => <TextField {...params} label="Borrower *" required />}
              />
            </Grid>

            {/* Laboratory */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Laboratory *</InputLabel>
                <Select
                  value={form.laboratory_id}
                  label="Laboratory *"
                  onChange={e => setForm({ ...form, laboratory_id: e.target.value, equipment: [] })}
                >
                  {laboratories.map(lab => (
                    <MenuItem key={lab.id} value={lab.id}>{lab.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Borrow Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Borrow Date *"
                type="date"
                value={form.borrow_date}
                InputLabelProps={{ shrink: true }}
                onChange={e => setForm({ ...form, borrow_date: e.target.value })}
                disabled={!editAllowed.full}
              />
            </Grid>

            {/* Expected Return Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Expected Return Date"
                type="date"
                value={form.return_date}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: form.borrow_date }}
                onChange={e => setForm({ ...form, return_date: e.target.value })}
                disabled={!editAllowed.return_date}
              />
            </Grid>

            {/* Equipment Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth disabled={!form.laboratory_id || !editAllowed.full}>
                <InputLabel>Equipment *</InputLabel>
                <Select
                  multiple
                  value={form.equipment.map(e => e.equipment_id)}
                  onChange={handleEquipmentChange}
                  input={<OutlinedInput label="Equipment *" />}
                  renderValue={selected => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map(id => {
                        const eq = availableEquipment.find(e => e.id === id);
                        const qty = form.equipment.find(e => e.equipment_id === id)?.quantity || 1;
                        return <Chip key={id} label={`${eq?.name || "Loading…"} ×${qty}`} />;
                      })}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {availableEquipment.length === 0 ? (
                    <MenuItem disabled>
                      <Block sx={{ mr: 1 }} fontSize="small" />
                      No available items
                    </MenuItem>
                  ) : (
                    availableEquipment.map(eq => (
                      <MenuItem
                        key={eq.id}
                        value={eq.id}
                        disabled={eq.available === 0 || !editAllowed.full}
                      >
                        <Checkbox checked={form.equipment.some(e => e.equipment_id === eq.id)} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography>{eq.name}</Typography>
                          <Typography variant="caption" color={eq.available === 0 ? "error" : "success"}>
                            {eq.available} available unit{eq.available !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* Quantity per equipment */}
            {form.equipment.map(e => {
              const eq = availableEquipment.find(x => x.id === e.equipment_id);
              return (
                <Grid item xs={12} key={e.equipment_id}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography sx={{ minWidth: 150 }}>{e.name}:</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={e.quantity}
                      inputProps={{ min: 1, max: eq?.available || 1 }}
                      onChange={ev => handleQuantityChange(e.equipment_id, ev.target.value)}
                      disabled={!editAllowed.full}
                      sx={{ width: 100 }}
                    />
                    <Typography variant="caption">
                      max {eq?.available || 0}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}

            {/* Total */}
            {form.equipment.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: "primary.main", color: "white", textAlign: "center" }}>
                  <Typography variant="h6">
                    Total Items: <strong>{totalQuantity}</strong>
                  </Typography>
                </Paper>
              </Grid>
            )}

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes (optional)"
                multiline
                rows={3}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                disabled={!editAllowed.notes}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              loading ||
              !form.borrower_id ||
              !form.laboratory_id ||
              (!editMode && form.equipment.length === 0)
            }
          >
            {loading ? <CircularProgress size={20} /> : editMode ? "Update Request" : "Submit Request"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* UNIFIED DETAIL + EDIT MODAL */}
      <Dialog
        open={!!selectedTransaction}
        onClose={() => {
          setSelectedTransaction(null);
          setIsEditingItems(false);
          setAssignedItems({});
          setAvailableReplacements({});
          setPendingSelection({});
        }}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pr: 15 }}>
          {isEditingItems ? "Edit Assigned Units" : "Transaction Details"}
          {canEditItems && !isEditingItems && (
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<Edit />}
              sx={{ float: 'right', mt: 1 }}
              onClick={() => setIsEditingItems(true)}
            >
              Edit Units
            </Button>
          )}
        </DialogTitle>

        <DialogContent dividers sx={{ minHeight: 400 }}>
          {selectedTransaction && (
            <>
              {!isEditingItems ? (
                /* VIEW MODE */
                <Box sx={{ py: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="h6">{selectedTransaction.borrower_name}</Typography>
                    <Chip
                      icon={getStatusIcon(getStage(selectedTransaction))}
                      label={getStatusLabel(selectedTransaction).toUpperCase()}
                      color={getStatusColor(getStage(selectedTransaction))}
                      size="small"
                    />
                  </Stack>
                  <Typography color="text.secondary" gutterBottom>
                    {selectedTransaction.laboratory?.name || "Unknown Lab"} • {format(new Date(selectedTransaction.borrow_date), "dd MMM yyyy")}
                    {selectedTransaction.return_date && ` → ${format(new Date(selectedTransaction.return_date), "dd MMM yyyy")}`}
                  </Typography>

                  {selectedTransaction.issued_count > 0 && (
                    <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" fontWeight={700}>Return progress</Typography>
                        <Typography variant="body2">{selectedTransaction.returned_count} of {selectedTransaction.issued_count} units</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={returnProgress(selectedTransaction.issued_count, selectedTransaction.returned_count)} />
                    </Box>
                  )}

                  <Box sx={{ mt: 4 }}>
                    {selectedTransaction.equipment.map(eq => (
                      <Box key={eq.id} sx={{ mb: 4, p: 3, bgcolor: "#f9f9f9", borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary">
                          {eq.name} × {eq.quantity || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {selectedTransaction.status === 'pending' ? 'Will assign on approval:' : 'Assigned Units:'}
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                          {eq.items?.length > 0 ? (
                            eq.items.map(item => (
                              <Box key={item.id} sx={{ p: 1.25, border: '1px solid', borderColor: item.returned_at ? 'success.light' : 'divider', borderRadius: 1.5, minWidth: 185 }}>
                                <Typography variant="body2" fontFamily="monospace" fontWeight={800}>{item.unit_id}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {item.returned_at ? `Returned • ${item.condition_at_return || item.condition}` : item.issued_at ? `Issued • ${item.condition_at_issue || item.condition}` : `Reserved • ${item.condition}`}
                                </Typography>
                                {item.return_notes && <Typography variant="caption" color="warning.dark" display="block">{item.return_notes}</Typography>}
                              </Box>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {selectedTransaction.status === 'pending' ? 'No preview yet' : 'No units assigned'}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {selectedTransaction.notes && (
                    <Box sx={{ mt: 4, p: 3, bgcolor: "#f5f5f5", borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">Notes:</Typography>
                      <Typography>{selectedTransaction.notes}</Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                /* EDIT MODE */
                <Box>
                  <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                    <Typography variant="h6">
                      Transaction #{selectedTransaction.id} • {selectedTransaction.borrower_name}
                    </Typography>
                    {selectedTransaction.status === 'pending' && (
                      <Chip icon={<Autorenew />} label="EDITING PENDING" color="warning" size="small" />
                    )}
                  </Stack>

                  {selectedTransaction.equipment.map(eq => {
                    const required = eq.quantity || 0;
                    const assigned = assignedItems[eq.id]?.length || 0;
                    const missing = required - assigned;

                    return (
                      <Box
                        key={eq.id}
                        sx={{
                          mb: 4,
                          p: 3,
                          border: '2px dashed',
                          borderColor: assigned === required ? 'success.main' : 'warning.main',
                          borderRadius: 2,
                          bgcolor: '#f9f9f9'
                        }}
                      >
                        <Typography fontWeight="bold" gutterBottom>
                          {eq.name} × {required}
                        </Typography>

                        <Typography
                          variant="body2"
                          color={assigned === required ? "success.main" : "error.main"}
                          fontWeight="medium"
                        >
                          Assigned: {assigned} / {required}
                          {missing > 0 && ` — Need ${missing} more`}
                        </Typography>

                        <List dense>
                          {assignedItems[eq.id]?.map((unitId, idx) => (
                            <ListItem key={`${unitId}-${idx}`} sx={{ py: 0.5 }}>
                              <ListItemText
                                primary={<strong>{unitId}</strong>}
                                secondary="Click Swap to replace or Remove to unassign"
                              />
                              <ListItemSecondaryAction>
                                <Tooltip title="Replace with available unit">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => {
                                      setAssignedItems(prev => ({
                                        ...prev,
                                        [eq.id]: prev[eq.id].filter((_, i) => i !== idx)
                                      }));
                                    }}
                                  >
                                    <SwapHoriz fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Remove">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setAssignedItems(prev => ({
                                        ...prev,
                                        [eq.id]: prev[eq.id].filter((_, i) => i !== idx)
                                      }));
                                    }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>

                        {assigned < required && (
                          <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>
                              {assigned === 0 ? "Assign units" : `Add ${missing} more unit(s)`}
                            </InputLabel>
                            <Select
                              multiple
                              value={pendingSelection[eq.id] || []}
                              onChange={(e) => {
                                setPendingSelection(prev => ({
                                  ...prev,
                                  [eq.id]: e.target.value
                                }));
                              }}
                              onClose={() => {
                                const selected = pendingSelection[eq.id] || [];
                                const newOnes = selected.filter(id => !(assignedItems[eq.id] || []).includes(id));
                                if (newOnes.length > 0) {
                                  setAssignedItems(prev => ({
                                    ...prev,
                                    [eq.id]: [...(prev[eq.id] || []), ...newOnes]
                                  }));
                                }
                                setPendingSelection(prev => ({ ...prev, [eq.id]: [] }));
                              }}
                              onOpen={() => fetchAvailableItems(eq.id)}
                              input={<OutlinedInput label={`Add ${missing} more unit(s)`} />}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {selected.map((value) => (
                                    <Chip key={value} label={value} size="small" />
                                  ))}
                                </Box>
                              )}
                              MenuProps={MenuProps}
                            >
                              {availableReplacements[eq.id]?.length === 0 ? (
                                <MenuItem disabled>No available units</MenuItem>
                              ) : (
                                availableReplacements[eq.id]
                                  .filter(i => !assignedItems[eq.id]?.includes(i.unit_id))
                                  .map(i => (
                                    <MenuItem key={i.id} value={i.unit_id}>
                                      <Checkbox checked={(pendingSelection[eq.id] || []).includes(i.unit_id)} />
                                      {i.unit_id}
                                      <Typography variant="caption" sx={{ ml: 1, color: 'success.main' }}>
                                        (Available)
                                      </Typography>
                                    </MenuItem>
                                  ))
                              )}
                            </Select>
                          </FormControl>
                        )}

                        {assigned !== required && (
                          <Alert severity={assigned < required ? "warning" : "error"} sx={{ mt: 2 }}>
                            {assigned < required
                              ? `Please assign ${required - assigned} more unit(s)`
                              : `Remove ${assigned - required} excess unit(s)`
                            }
                          </Alert>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          {isEditingItems ? (
            <>
              <Button onClick={() => setIsEditingItems(false)}>Cancel</Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<Save />}
                onClick={handleSaveAssignedItems}
                disabled={selectedTransaction?.equipment?.some(eq =>
                  (assignedItems[eq.id]?.length || 0) !== (eq.quantity || 0)
                )}
              >
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                setSelectedTransaction(null);
                setIsEditingItems(false);
                setAssignedItems({});
                setAvailableReplacements({});
                setPendingSelection({});
              }}
              variant="contained"
            >
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {/* REJECT DIALOG */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle color="error.main">Decline request?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Optionally provide a reason for declining this request. The borrower will see this in their Borrow History.
          </Typography>
          <TextField
            fullWidth
            label="Rejection Reason (optional)"
            multiline
            rows={3}
            value={rejectDialog.reason}
            onChange={e => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="e.g. Equipment not available, invalid details..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectDialog(prev => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={confirmDecline}>
            Confirm Decline
          </Button>
        </DialogActions>
      </Dialog>

      {/* APPROVAL DIALOG */}
      <Dialog open={approvalDialog.open} onClose={() => !approvalDialog.busy && setApprovalDialog(prev => ({ ...prev, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Approve request for pickup</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">Approval keeps every assigned unit reserved. Equipment is not considered borrowed until all units are checked during handover.</Alert>
            <TextField
              fullWidth
              required
              type="date"
              label="Due date"
              value={approvalDialog.dueDate}
              onChange={event => setApprovalDialog(prev => ({ ...prev, dueDate: event.target.value, error: '' }))}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: format(new Date(), 'yyyy-MM-dd') }}
            />
            {approvalDialog.error && <Alert severity="error">{approvalDialog.error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApprovalDialog(prev => ({ ...prev, open: false }))} disabled={approvalDialog.busy}>Cancel</Button>
          <Button variant="contained" color="success" onClick={confirmApproval} disabled={approvalDialog.busy || !approvalDialog.dueDate}>
            {approvalDialog.busy ? <CircularProgress size={20} /> : 'Approve request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ISSUE DIALOG */}
      <Dialog open={issueDialog.open} onClose={() => !issueDialog.busy && setIssueDialog(prev => ({ ...prev, open: false }))} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>Issue equipment • Request #{issueDialog.transaction?.id}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="info">Scan or check every assigned unit. The handover is recorded only when the set is complete.</Alert>
            <QrUnitScanner onScan={addIssueScan} disabled={issueDialog.busy} />
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography fontWeight={800}>Assigned-unit checklist</Typography>
                <Typography variant="body2" color="text.secondary">{issueDialog.scanned.length}/{assignedUnits(issueDialog.transaction).length} checked</Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={assignedUnits(issueDialog.transaction).length ? (issueDialog.scanned.length / assignedUnits(issueDialog.transaction).length) * 100 : 0}
                sx={{ mb: 1.5 }}
              />
              <Stack spacing={1}>
                {assignedUnits(issueDialog.transaction).map(item => (
                  <Paper key={item.unit_id} variant="outlined" sx={{ px: 1.5, py: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Checkbox
                        checked={issueDialog.scanned.includes(item.unit_id)}
                        disabled={issueDialog.busy}
                        onChange={() => setIssueDialog(prev => ({
                          ...prev,
                          scanned: prev.scanned.includes(item.unit_id)
                            ? prev.scanned.filter(id => id !== item.unit_id)
                            : [...prev.scanned, item.unit_id],
                          error: '',
                        }))}
                      />
                      <Box flex={1}>
                        <Typography fontFamily="monospace" fontWeight={800}>{item.unit_id}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.equipmentName} • issue condition: {item.condition}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
            <TextField fullWidth multiline minRows={2} label="Handover notes (optional)" value={issueDialog.notes} onChange={event => setIssueDialog(prev => ({ ...prev, notes: event.target.value }))} />
            {issueDialog.error && <Alert severity="error">{issueDialog.error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIssueDialog(prev => ({ ...prev, open: false }))} disabled={issueDialog.busy}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={!issueDialog.busy && <LocalShippingOutlined />}
            onClick={confirmIssue}
            disabled={issueDialog.busy || issueDialog.scanned.length !== assignedUnits(issueDialog.transaction).length}
          >
            {issueDialog.busy ? <CircularProgress size={20} /> : 'Confirm handover'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PARTIAL RETURN DIALOG */}
      <Dialog open={returnDialog.open} onClose={() => !returnDialog.busy && setReturnDialog(prev => ({ ...prev, open: false }))} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>Return issued units • Request #{returnDialog.transaction?.id}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="info">Choose any units being returned now. Each unit becomes available immediately unless its recorded condition prevents use.</Alert>
            <QrUnitScanner onScan={addReturnScan} disabled={returnDialog.busy} />
            <Divider />
            <Typography fontWeight={800}>Outstanding units</Typography>
            {assignedUnits(returnDialog.transaction).filter(item => item.issued_at && !item.returned_at).map(item => {
              const selected = Boolean(returnDialog.selected[item.unit_id]);
              const details = returnDialog.details[item.unit_id] || { condition: '', notes: '' };
              return (
                <Paper key={item.unit_id} variant="outlined" sx={{ p: 2, borderColor: selected ? 'primary.main' : 'divider' }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Checkbox
                        checked={selected}
                        onChange={event => setReturnDialog(prev => ({ ...prev, selected: { ...prev.selected, [item.unit_id]: event.target.checked }, error: '' }))}
                      />
                      <Box>
                        <Typography fontFamily="monospace" fontWeight={800}>{item.unit_id}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.equipmentName} • issued as {item.condition_at_issue || item.condition}</Typography>
                      </Box>
                    </Stack>
                    {selected && (
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth required size="small">
                            <InputLabel>Return condition</InputLabel>
                            <Select
                              value={details.condition}
                              label="Return condition"
                              onChange={event => setReturnDialog(prev => ({
                                ...prev,
                                details: { ...prev.details, [item.unit_id]: { ...details, condition: event.target.value } },
                                error: '',
                              }))}
                            >
                              {['New', 'Good', 'Fair', 'Poor', 'Damaged', 'Missing', 'Under Repair'].map(condition => <MenuItem key={condition} value={condition}>{condition}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={8}>
                          <TextField
                            fullWidth
                            size="small"
                            required={['Damaged', 'Missing', 'Under Repair'].includes(details.condition)}
                            label="Return notes"
                            value={details.notes}
                            onChange={event => setReturnDialog(prev => ({
                              ...prev,
                              details: { ...prev.details, [item.unit_id]: { ...details, notes: event.target.value } },
                              error: '',
                            }))}
                            placeholder="Required for damaged, missing, or repair-needed units"
                          />
                        </Grid>
                      </Grid>
                    )}
                  </Stack>
                </Paper>
              );
            })}
            {returnDialog.error && <Alert severity="error">{returnDialog.error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReturnDialog(prev => ({ ...prev, open: false }))} disabled={returnDialog.busy}>Cancel</Button>
          <Button variant="contained" onClick={confirmPartialReturn} disabled={returnDialog.busy || !Object.values(returnDialog.selected).some(Boolean)}>
            {returnDialog.busy ? <CircularProgress size={20} /> : 'Record selected returns'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4500}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
});
