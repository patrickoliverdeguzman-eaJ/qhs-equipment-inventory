// src/views/admin/adminDashboard.jsx
// LIVE REAL-TIME DASHBOARD – Recent Borrowing Activities now updates instantly
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  useTheme,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  useMediaQuery,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from "recharts";
import {
  People,
  Science,
  Build,
  TrendingUp,
  Dashboard as DashboardIcon,
  Visibility,
  SwapHoriz,
} from "@mui/icons-material";
import { useStateContext } from "../../Context/ContextProvider";
import axiosClient, { assetUrl } from "../../axiosClient";
import moment from "moment";
import { useNavigate } from "react-router-dom";

const STATUS_COLORS = {
  Available: "#4caf50",
  Borrowed: "#ff9800",
  Damaged: "#f44336",
  "Under Repair": "#9e9e9e",
  Missing: "#e91e63",
};

// Custom hook for counting animation
const useCountAnimation = (target, duration = 1000, initialDelay = 2000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    // Initial delay before starting animation
    const delayTimeout = setTimeout(() => {
      const steps = 60;
      const stepDuration = duration / steps;
      const increment = target / steps;
      let current = 0;

      const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(interval);
        } else {
          setCount(Math.floor(current));
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }, initialDelay);

    return () => clearTimeout(delayTimeout);
  }, [target, duration, initialDelay]);

  return count;
};

export default function AdminDashboard() {
  const { user } = useStateContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLabs, setLoadingLabs] = useState(true);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [labItemsData, setLabItemsData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [liveStats, setLiveStats] = useState({ total_items: 0, total_quantity: 0, total_available: 0, total_borrowed: 0, unavailable: 0 });
  const [selectedLabIdForInventory, setSelectedLabIdForInventory] = useState("all");
  const [transactionsToday, setTransactionsToday] = useState(0);

  // Modal for viewing transaction items
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Fetch recent transactions (initial load only)
  const fetchRecentTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const { data } = await axiosClient.get("/transactions?per_page=5");
      setTransactions(data.data || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load recent transactions", err);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  // Fetch recent logs and present user-friendly messages
  const formatLogMessage = (log) => {
    const u = log.user ? log.user.name : 'System';
    const m = log.meta || {};

    // Semantic controller logs we inserted
    switch (log.action) {
      case 'category_created': return `${u} created category #${m.category_id || m.categoryId || ''}`;
      case 'category_updated': return `${u} updated category #${m.category_id || m.categoryId || ''}`;
      case 'category_deleted': return `${u} deleted category #${m.category_id || m.categoryId || ''}`;
      case 'equipment_created': return `${u} added equipment #${m.equipment_id || ''}`;
      case 'equipment_updated': return `${u} updated equipment #${m.equipment_id || ''}`;
      case 'equipment_deleted': return `${u} removed equipment #${m.equipment_id || ''}`;
      case 'equipment_toggled_active': return `${u} ${m.isActive ? 'activated' : 'archived'} equipment #${m.equipment_id || ''}`;
      case 'equipment_import': return `${u} imported equipment (success: ${m.success_count || 0}, failed: ${m.failed_count || 0})`;
      case 'equipment_item_created': return `${u} created item #${m.item_id || ''} for equipment #${m.equipment_id || ''}`;
      case 'equipment_item_updated': return `${u} updated item #${m.item_id || ''}`;
      case 'equipment_item_deleted': return `${u} deleted item #${m.item_id || ''}`;
      case 'laboratory_created': return `${u} created laboratory #${m.laboratory_id || ''}`;
      case 'laboratory_updated': return `${u} updated laboratory #${m.laboratory_id || ''}`;
      case 'laboratory_deleted': return `${u} deleted laboratory #${m.laboratory_id || ''}`;
      case 'user_created': return `${u} created user #${m.user_id || ''}`;
      case 'user_updated': return `${u} updated user #${m.user_id || ''}`;
      case 'user_deleted': return `${u} deleted user #${m.user_id || ''}`;
      case 'transaction_created': return `${u} created borrow request #${m.transaction_id || ''}`;
      case 'transaction_accepted': return `${u} accepted request #${m.transaction_id || ''}`;
      case 'transaction_declined': return `${u} declined request #${m.transaction_id || ''}`;
      case 'transaction_returned': return `${u} marked returned #${m.transaction_id || ''}`;
      default:
        // Fallback: middleware-style entries like "POST api/...
        return `${u} — ${log.action}`;
    }
  };

  const fetchRecentLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      // The logs endpoint accepts page sizes from 10 to 100. Fetch its
      // smallest valid page and keep this compact dashboard feed at six rows.
      const { data } = await axiosClient.get('/logs?per_page=10');
      const items = (data.data || []).slice(0, 6);
      setRecentLogs(items.map(i => ({ ...i, message: i.friendly_message || formatLogMessage(i) })));
    } catch (e) {
      console.error('Failed to load recent logs', e);
      setRecentLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    axiosClient.get("/users").then(({ data }) => { setUsers(data.data || []); setLoadingUsers(false); }).catch(() => setLoadingUsers(false));
    axiosClient.get("/laboratories").then(({ data }) => { setLaboratories(data.data || []); setLoadingLabs(false); }).catch(() => setLoadingLabs(false));
    axiosClient.get("/equipment-data").then(({ data }) => {
      setEquipment(data.equipment || []);
      if (data.laboratories) setLaboratories(data.laboratories);
      setLoadingEquipment(false);
    }).catch(() => setLoadingEquipment(false));

    fetchRecentTransactions();
  }, []);

  // REAL-TIME LISTENER – LIVE UPDATES FOR RECENT ACTIVITIES
  // Real-time via WebSocket removed — dashboard refreshes via API calls
  // when other parts of the app dispatch `transactions:changed` or via
  // cross-tab `storage` events. This avoids depending on Echo/Reverb.

  // Refresh recent transactions when other parts of the app dispatch an update
  useEffect(() => {
    const handler = () => {
      console.debug('adminDashboard.jsx: transactions:changed received — refreshing recent transactions');
      fetchRecentTransactions();
    };
    window.addEventListener('transactions:changed', handler);
    window.addEventListener('logs:changed', fetchRecentLogs);
    return () => {
      window.removeEventListener('transactions:changed', handler);
      window.removeEventListener('logs:changed', fetchRecentLogs);
    };
  }, [fetchRecentLogs, fetchRecentTransactions]);

  // Poll for updates as a fallback (runs only when tab is visible)
  useEffect(() => {
    const INTERVAL = 10000; // 10s
    let timer = null;

    const startTimer = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchRecentTransactions();
        }
      }, INTERVAL);
    };

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    // Start if visible
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      startTimer();
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchRecentTransactions();
        startTimer();
      } else {
        stopTimer();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchRecentTransactions]);

  // Poll recent logs separately
  useEffect(() => {
    fetchRecentLogs();
    const INTERVAL = 10000;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchRecentLogs();
    }, INTERVAL);
    return () => clearInterval(id);
  }, [fetchRecentLogs]);

  // Also listen for cross-tab localStorage events so other browser tabs refresh
  useEffect(() => {
    const storageHandler = (e) => {
      if (e.key === 'transactions:changed') {
        console.debug('adminDashboard.jsx: storage event for transactions:changed — refreshing recent transactions');
        fetchRecentTransactions();
      }
    };
    window.addEventListener('storage', storageHandler);
    return () => window.removeEventListener('storage', storageHandler);
  }, [fetchRecentTransactions]);

  // Total Units per Laboratory
  useEffect(() => {
    if (loadingLabs || loadingEquipment || laboratories.length === 0) {
      setLabItemsData([]);
      return;
    }

    const labMap = laboratories.reduce((acc, lab) => {
      acc[lab.id] = { name: lab.name, total: 0 };
      return acc;
    }, {});

    equipment.forEach((eq) => {
      const labId = eq.laboratory_id;
      if (labMap[labId]) {
        labMap[labId].total += eq.total_quantity;
      }
    });

    const counts = Object.values(labMap);
    counts.sort((a, b) => b.total - a.total);
    setLabItemsData(counts);
  }, [equipment, laboratories, loadingLabs, loadingEquipment]);

  // Live Inventory Stats
  useEffect(() => {
    if (equipment.length === 0) {
      setLiveStats({ total_items: 0, total_quantity: 0, total_available: 0, total_borrowed: 0, unavailable: 0 });
      return;
    }

    // Filter equipment by selected laboratory
    let filteredEquipment = equipment;
    if (selectedLabIdForInventory !== "all") {
      filteredEquipment = equipment.filter(e => e.laboratory_id === Number(selectedLabIdForInventory));
    }

    const stats = {
      total_items: filteredEquipment.length,
      total_quantity: filteredEquipment.reduce((sum, e) => sum + (e.total_quantity || 0), 0),
      total_available: filteredEquipment.reduce((sum, e) => sum + (e.available_quantity || 0), 0),
      total_borrowed: filteredEquipment.reduce((sum, e) => sum + (e.borrowed_quantity || 0), 0),
      unavailable: filteredEquipment.reduce((sum, e) => sum + ((e.total_quantity || 0) - (e.available_quantity || 0) - (e.borrowed_quantity || 0)), 0),
    };
    setLiveStats(stats);
  }, [equipment, selectedLabIdForInventory]);

  // Pie Chart Data
  useEffect(() => {
    if (loadingEquipment || equipment.length === 0) {
      setPieData([]);
      return;
    }

    let filtered = equipment;
    if (selectedLabId !== "all") {
      filtered = equipment.filter((eq) => eq.laboratory_id === Number(selectedLabId));
    }

    const counts = {
      Available: 0,
      Borrowed: 0,
      Damaged: 0,
      "Under Repair": 0,
      Missing: 0,
    };

    filtered.forEach((eq) => {
      eq.items.forEach((item) => {
        if (item.isBorrowed) {
          counts.Borrowed++;
        } else {
          // If condition field doesn't exist, treat as Good
          const condition = item.condition ?? 'Good';
          
          if (condition === "Damaged") {
            counts.Damaged++;
          } else if (condition === "Under Repair") {
            counts["Under Repair"]++;
          } else if (condition === "Missing") {
            counts.Missing++;
          } else {
            // New, Good, Fair, Poor are all available
            counts.Available++;
          }
        }
      });
    });

    const data = Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({ status, count }));

    setPieData(data);
  }, [equipment, selectedLabId, loadingEquipment]);

  // User Growth
  useEffect(() => {
    if (users.length === 0) {
      setUserGrowthData([]);
      return;
    }

    const computeGrowthData = () => {
      const growthMap = {};
      let startDate, labelFn;

      if (dateRange === "7d") {
        startDate = moment().subtract(6, "days").startOf("day");
        labelFn = (d) => d.format("MMM D");
      } else if (dateRange === "30d") {
        startDate = moment().subtract(29, "days").startOf("day");
        labelFn = (d) => d.format("MMM D");
      } else if (dateRange === "all") {
        const earliest = moment.min(users.map((u) => moment(u.created_at)));
        startDate = earliest.clone().startOf("month");
        labelFn = (d) => d.format("MMM YYYY");
      }

      let current = startDate.clone();
      const endDate = moment().startOf(dateRange === "all" ? "month" : "day");

      while (current.isSameOrBefore(endDate)) {
        const label = labelFn(current);
        growthMap[label] = 0;
        current.add(1, dateRange === "all" ? "month" : "day");
      }

      users.forEach((u) => {
        const createdDate = moment(u.created_at).startOf(dateRange === "all" ? "month" : "day");
        if (createdDate.isSameOrAfter(startDate)) {
          const label = labelFn(createdDate);
          growthMap[label] = (growthMap[label] || 0) + 1;
        }
      });

      const data = Object.keys(growthMap).map((label) => ({
        date: label,
        count: growthMap[label],
      }));

      data.sort((a, b) => {
        const da = dateRange === "all" ? moment(a.date, "MMM YYYY") : moment(a.date, "MMM D");
        const db = dateRange === "all" ? moment(b.date, "MMM YYYY") : moment(b.date, "MMM D");
        return da - db;
      });

      return data;
    };

    setUserGrowthData(computeGrowthData());
  }, [users, dateRange]);

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = users.filter((u) => !u.isActive).length;
  const usersLast7Days = users.filter((u) => moment(u.created_at).isAfter(moment().subtract(7, "days"))).length;

  const totalEquipment = equipment.reduce((sum, eq) => sum + eq.total_quantity, 0);
  const availableEquipment = equipment.reduce((sum, eq) => sum + eq.available_quantity, 0);

  // Calculate transactions today
  useEffect(() => {
    const today = moment().startOf("day");
    const todayTransactions = transactions.filter((trx) =>
      moment(trx.created_at).isSameOrAfter(today)
    ).length;
    setTransactionsToday(todayTransactions);
  }, [transactions]);

  // Animated counts
  const animatedTransactionsToday = useCountAnimation(transactionsToday);
  const animatedLabsCount = useCountAnimation(laboratories.length);
  const animatedEquipmentCount = useCountAnimation(totalEquipment);
  const animatedAvailableCount = useCountAnimation(availableEquipment);
  
  // Animated inventory counts
  const animatedTotalItems = useCountAnimation(liveStats.total_items);
  const animatedTotalQuantity = useCountAnimation(liveStats.total_quantity);
  const animatedTotalAvailable = useCountAnimation(liveStats.total_available);
  const animatedTotalBorrowed = useCountAnimation(liveStats.total_borrowed);
  const animatedUnavailable = useCountAnimation(liveStats.unavailable);

  const chartHeight = isMobile ? 250 : isTablet ? 280 : 320;

  const handleDateRangeChange = (event, newRange) => {
    if (newRange) setDateRange(newRange);
  };

  const handleLabSelectionChange = (event, newLabId) => {
    if (newLabId !== null) setSelectedLabId(newLabId);
  };

  const selectedLabName = selectedLabId === "all"
    ? "All Laboratories"
    : laboratories.find((l) => l.id === Number(selectedLabId))?.name || "Unknown";

  const handleTransactionClick = (transactionId) => {
    navigate(`/admin/transactions#transaction-${transactionId}`);
  };

  const handleViewItems = (trx) => {
    setSelectedTransaction(trx);
  };

  const getActionText = (status) => {
    switch (status) {
      case "pending": return "Requested";
      case "borrowed": return "Borrowed";
      case "returned": return "Returned";
      case "rejected": return "Rejected";
      default: return status;
    }
  };

  const getActionColor = (status) => {
    switch (status) {
      case "pending": return "warning";
      case "borrowed": return "success";
      case "returned": return "info";
      case "rejected": return "error";
      default: return "default";
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 1.75 }}>
        <Avatar src={user?.avatar ? assetUrl(`/storage/${user.avatar}`) : undefined} sx={{ bgcolor: "primary.main", width: 48, height: 48, fontSize: 19, fontWeight: 800 }}>
          {user?.name?.charAt(0).toUpperCase() || "A"}
        </Avatar>
        <Box>
          <Typography variant={isMobile ? "h5" : "h4"} color="text.primary" sx={{ wordBreak: "break-word" }}>
            Welcome back, {user?.name || "Administrator"}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here’s what’s happening across the inventory today.
          </Typography>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'grid', width: 46, height: 46, placeItems: 'center', borderRadius: 2.5, bgcolor: 'success.main', color: 'common.white', flexShrink: 0 }}><SwapHoriz /></Box>
              <Box>
                {loadingTransactions ? <CircularProgress size={26} /> : (
                  <>
                    <Typography variant={isMobile ? "h5" : "h4"}>{animatedTransactionsToday}</Typography>
                    <Typography variant="body2" color="text.secondary">Transactions today</Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'grid', width: 46, height: 46, placeItems: 'center', borderRadius: 2.5, bgcolor: 'info.main', color: 'common.white', flexShrink: 0 }}><Science /></Box>
              <Box>
                {loadingLabs ? <CircularProgress size={26} /> : (
                  <>
                    <Typography variant={isMobile ? "h5" : "h4"}>{animatedLabsCount}</Typography>
                    <Typography variant="body2" color="text.secondary">Laboratories</Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'grid', width: 46, height: 46, placeItems: 'center', borderRadius: 2.5, bgcolor: 'warning.main', color: 'common.white', flexShrink: 0 }}><Build /></Box>
              <Box>
                {loadingEquipment ? <CircularProgress size={26} /> : (
                  <>
                    <Typography variant={isMobile ? "h5" : "h4"}>{animatedEquipmentCount}</Typography>
                    <Typography variant="body2" color="text.secondary">Total units</Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'grid', width: 46, height: 46, placeItems: 'center', borderRadius: 2.5, bgcolor: 'secondary.main', color: 'common.white', flexShrink: 0 }}><TrendingUp /></Box>
              <Box>
                {loadingEquipment ? <CircularProgress size={26} /> : (
                  <>
                    <Typography variant={isMobile ? "h5" : "h4"}>{animatedAvailableCount}</Typography>
                    <Typography variant="body2" color="text.secondary">Available units</Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* LIVE INVENTORY OVERVIEW */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">Live Inventory Count</Typography>
            <Typography color="text.secondary">Real-time inventory status</Typography>
          </Box>
          <ToggleButtonGroup
            value={selectedLabIdForInventory}
            exclusive
            onChange={(event, newLabId) => {
              if (newLabId !== null) setSelectedLabIdForInventory(newLabId);
            }}
            size="small"
            sx={{
              bgcolor: "background.paper",
              "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 500, px: 2 },
            }}
          >
            <ToggleButton value="all">All Labs</ToggleButton>
            {laboratories.map((lab) => (
              <ToggleButton key={lab.id} value={lab.id}>{lab.name}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        
        <Grid container spacing={2}>
          {[
            { label: 'Total Items', value: animatedTotalItems, color: '#1976d2' },
            { label: 'Total Quantity', value: animatedTotalQuantity, color: '#1976d2' },
            { label: 'Available', value: animatedTotalAvailable, color: '#388e3c' },
            { label: 'Borrowed', value: animatedTotalBorrowed, color: '#1976d2' },
            { label: 'Unavailable', value: animatedUnavailable, color: '#f57c00' },
          ].map((stat, i) => (
            <Grid item xs={12} sm={6} md={2.4} key={i}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {stat.label}
                  </Typography>
                  {loadingEquipment ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <CircularProgress size={32} />
                    </Box>
                  ) : (
                    <Typography variant="h5" sx={{ color: stat.color, fontWeight: 'bold' }}>
                      {stat.value}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* User Summary */}
      <Card elevation={3} sx={{ borderRadius: 3, mb: 4, bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50", border: `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>User Summary</Typography>
          {loadingUsers ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress /></Box>
          ) : (
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid item xs={12} sm={4}><Box textAlign="center">
                <Typography variant={isMobile ? "h4" : "h3"} fontWeight="bold" color="primary">{totalUsers}</Typography>
                <Typography variant="body2" color="text.secondary">Total Users</Typography>
              </Box></Grid>
              <Grid item xs={12} sm={4}><Box textAlign="center">
                <Typography variant={isMobile ? "h4" : "h3"} fontWeight="bold" color="success.main">{activeUsers}</Typography>
                <Typography variant="body2" color="text.secondary">Active</Typography>
              </Box></Grid>
              <Grid item xs={12} sm={4}><Box textAlign="center">
                <Typography variant={isMobile ? "h4" : "h3"} fontWeight="bold" color="error.main">{inactiveUsers}</Typography>
                <Typography variant="body2" color="text.secondary">Inactive</Typography>
              </Box></Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Charts & Recent Borrowing Activities */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* User Growth */}
        <Grid item xs={12} lg={7}>
          <Card elevation={4} sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <DashboardIcon sx={{ color: "primary.main" }} />
                  <Typography variant="h6" fontWeight="bold">User Registrations</Typography>
                </Box>
                <ToggleButtonGroup value={dateRange} exclusive onChange={handleDateRangeChange} size="small" sx={{ bgcolor: "background.paper" }}>
                  <ToggleButton value="7d">7 Days</ToggleButton>
                  <ToggleButton value="30d">30 Days</ToggleButton>
                  <ToggleButton value="all">All Time</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <ResponsiveContainer width="100%" height={chartHeight}>
                {loadingUsers ? <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}><CircularProgress /></Box> : userGrowthData.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 8 }}>No registrations in the selected period.</Typography>
                ) : (
                  <LineChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="date" tick={{ fill: theme.palette.text.secondary }} />
                    <YAxis tick={{ fill: theme.palette.text.secondary }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="count" stroke={theme.palette.primary.main} strokeWidth={3} dot={{ r: 6 }} name="New Users" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Units per Laboratory */}
        <Grid item xs={12} lg={5}>
          <Card elevation={4} sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 1 }}>
                <Science sx={{ color: "info.main" }} />
                <Typography variant="h6" fontWeight="bold">Total Units per Laboratory</Typography>
              </Box>
              <ResponsiveContainer width="100%" height={chartHeight}>
                {loadingEquipment ? <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}><CircularProgress /></Box> : labItemsData.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 8 }}>No data</Typography>
                ) : (
                  <BarChart data={labItemsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} domain={[0, "dataMax + 5"]} />
                    <RechartsTooltip />
                    <RechartsLegend />
                    <Bar dataKey="total" fill={theme.palette.info.main} name="Total Units" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Equipment Status */}
        <Grid item xs={12} lg={6}>
          <Card elevation={4} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 }, textAlign: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 2, gap: 1 }}>
                <Build sx={{ color: "warning.main" }} />
                <Typography variant="h6" fontWeight="bold">
                  Equipment Status ({selectedLabName})
                </Typography>
              </Box>

              <ToggleButtonGroup
                value={selectedLabId}
                exclusive
                onChange={handleLabSelectionChange}
                size="small"
                sx={{
                  mb: 3,
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 1,
                  bgcolor: "background.paper",
                  "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 500, px: 2 },
                }}
              >
                <ToggleButton value="all">All Labs</ToggleButton>
                {laboratories.map((lab) => (
                  <ToggleButton key={lab.id} value={lab.id}>{lab.name}</ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Box sx={{ width: "100%", height: 320, display: "flex", justifyContent: "center", alignItems: "center" }}>
                {loadingEquipment ? (
                  <CircularProgress />
                ) : pieData.length === 0 ? (
                  <Typography variant="h6" fontWeight="bold" color="text.secondary">
                    No units in selected view.
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 80 : 100}
                        label={({ status, count }) => `${status}: ${count}`}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                        ))}
                      </Pie>
                      <RechartsLegend verticalAlign="bottom" height={60} />
                      <RechartsTooltip contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Borrowing Activities - NOW LIVE & REAL-TIME */}
        <Grid item xs={12} lg={6}>
          <Card elevation={4} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Recent Borrowing Activities
                  </Typography>
                  <Chip
                    label="Live"
                    size="small"
                    color="success"
                    sx={{
                      height: 22,
                      fontSize: "0.7rem",
                      animation: "pulse 2s infinite",
                      "@keyframes pulse": {
                        "0%": { opacity: 1 },
                        "50%": { opacity: 0.5 },
                        "100%": { opacity: 1 },
                      },
                    }}
                  />
                </Box>
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 400, overflow: "auto" }}>
                <Table size={isMobile ? "small" : "medium"} stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: theme.palette.action.hover }}>
                      <TableCell sx={{ minWidth: 60 }}>ID</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>User</TableCell>
                      <TableCell sx={{ minWidth: 80 }}>Action</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>Items</TableCell>
                      {!isMobile && <TableCell sx={{ minWidth: 100 }}>Lab</TableCell>}
                      <TableCell sx={{ minWidth: 80 }}>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingTransactions && transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isMobile ? 5 : 6} align="center">
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isMobile ? 5 : 6} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No recent borrowing activities.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((trx) => (
                        <TableRow
                          key={trx.id}
                          hover
                          onClick={() => handleTransactionClick(trx.id)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              #{trx.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 120, sm: 180 } }}>
                              {trx.borrower_name || "Unknown"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={getActionText(trx.status)} size="small" color={getActionColor(trx.status)} />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<Visibility />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewItems(trx);
                              }}
                              sx={{ textTransform: "none" }}
                            >
                              View Items
                            </Button>
                          </TableCell>
                          {!isMobile && (
                            <TableCell>
                              <Chip label={trx.laboratory?.name || "—"} size="small" />
                            </TableCell>
                          )}
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {moment(trx.created_at).fromNow()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent System Logs (human-readable) */}
        <Grid item xs={12} lg={6}>
          <Card elevation={4} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6" fontWeight="bold">Live Logs</Typography>
                  <Chip label="Live" size="small" color="success" sx={{ height: 22, fontSize: "0.7rem" }} />
                </Box>
              </Box>

              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {loadingLogs ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
                ) : recentLogs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No recent logs.</Typography>
                ) : (
                  <Box>
                    {recentLogs.map((l) => (
                      <Box key={l.id} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>{(l.user && l.user.name ? l.user.name.split(' ').map(n=>n[0]).slice(0,2).join('') : 'S')}</Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{l.message}</Typography>
                          <Typography variant="caption" color="text.secondary">{moment(l.created_at).fromNow()}</Typography>
                          {l.meta && Object.keys(l.meta).length > 0 && (
                            (() => {
                              const m = l.meta;
                              if (m.transaction_borrower || m.transaction_id) {
                                return <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Transaction #{m.transaction_id}{m.transaction_borrower ? ` — ${m.transaction_borrower}` : ''}</Typography>;
                              }
                              if (m.equipment_name || m.equipment_id) {
                                return <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{m.equipment_name || `Equipment #${m.equipment_id}`}</Typography>;
                              }
                              if (m.category_name || m.category_id) {
                                return <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{m.category_name || `Category #${m.category_id}`}</Typography>;
                              }
                              return <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{JSON.stringify(m)}</Typography>;
                            })()
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* View Items Modal */}
      <Dialog open={!!selectedTransaction} onClose={() => setSelectedTransaction(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
          Transaction #{selectedTransaction?.id} - Assigned Units
        </DialogTitle>
        <DialogContent dividers>
          {selectedTransaction && (
            <Box sx={{ py: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedTransaction.borrower_name}
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                {selectedTransaction.laboratory?.name || "Unknown Lab"} • {moment(selectedTransaction.borrow_date).format("DD MMM YYYY")}
              </Typography>

              <Box sx={{ mt: 3 }}>
                {selectedTransaction.equipment_summary ? (
                  selectedTransaction.equipment_summary.split(' • ').map((itemStr, index) => {
                    const match = itemStr.match(/^(.*) ×(\d+)/);
                    if (!match) return null;
                    const name = match[1].trim();
                    const quantity = parseInt(match[2]);
                    const unitsPart = itemStr.split('(')[1];
                    const units = unitsPart ? unitsPart.replace(')', '').trim() : '';

                    return (
                      <Box key={index} sx={{ mb: 3, p: 2, bgcolor: "#f9f9f9", borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {name} × {quantity}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                          Assigned Units:
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          {units && units !== "—" ? (
                            units.split(', ').map((unit, i) => (
                              <Chip
                                key={i}
                                label={unit.trim()}
                                size="small"
                                sx={{ fontFamily: "monospace", fontWeight: "bold" }}
                              />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No units assigned yet
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No items recorded.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTransaction(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
