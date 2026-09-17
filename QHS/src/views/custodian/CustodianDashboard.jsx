import React, { useEffect, useState, memo } from 'react';
import {
  Box, Paper, Typography, Grid, CircularProgress, Alert,
  LinearProgress, Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Chip, useTheme
} from '@mui/material';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axiosClient from '../../axiosClient';
import { useStateContext } from '../../Context/ContextProvider';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import PageHeader from '../../Components/PageHeader';
import { MetricCard } from '../../Components/WorkspaceUI';

export default memo(function CustodianDashboard() {
  const { user } = useStateContext();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [laboratoryData, setLaboratoryData] = useState([]);
  const [equipmentStats, setEquipmentStats] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [inventoryStats, setInventoryStats] = useState({
    total: 0,
    available: 0,
    borrowed: 0,
    unavailable: 0,
  });
  const [workflowStats, setWorkflowStats] = useState({
    awaitingPickup: 0,
    overdue: 0,
    partiallyReturned: 0,
    maintenanceOpen: 0,
    maintenanceOverdue: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch custodian's laboratory info
        const { data: labData } = await axiosClient.get('/laboratories', {
          params: { custodian_id: user.id }
        });
      
        if (labData.data && labData.data.length > 0) {
          const labs = labData.data;
          const laboratoryIds = labs.map(lab => lab.id);
          setLaboratoryData(labs);

          // Fetch all inventory and transactions scoped by the backend to every assigned laboratory.
          const { data: equipData } = await axiosClient.get('/equipment', {
            params: { per_page: 500 }
          });

          if (equipData.data) {
            // Fetch items to calculate stats
            const { data: itemsData } = await axiosClient.get('/item');
            const items = itemsData.data || [];
            
            // Fetch transactions and maintenance queues for every assigned laboratory.
            try {
              const [{ data: transData }, { data: maintenanceData }] = await Promise.all([
                axiosClient.get('/transactions', { params: { per_page: 500 } }),
                axiosClient.get('/maintenance-work-orders', { params: { per_page: 500 } }),
              ]);
              const transactions = transData.data || [];
              const workOrders = maintenanceData.data || [];
              const activeMaintenanceStatuses = ['open', 'assigned', 'in_progress', 'waiting_for_parts'];
              setRecentTransactions(transactions.slice(0, 10));
              setWorkflowStats({
                awaitingPickup: transactions.filter(transaction => transaction.status === 'approved').length,
                overdue: transactions.filter(transaction => transaction.is_overdue).length,
                partiallyReturned: transactions.filter(transaction => transaction.lifecycle_stage === 'partially_returned').length,
                maintenanceOpen: workOrders.filter(workOrder => activeMaintenanceStatuses.includes(workOrder.status)).length,
                maintenanceOverdue: workOrders.filter(workOrder => workOrder.is_overdue).length,
              });
            } catch (e) {
              console.error('Failed to load workflow queues', e);
            }

            // Calculate stats per equipment
            const stats = equipData.data.filter(equip => laboratoryIds.includes(equip.laboratory_id)).map(equip => {
              const equipItems = items.filter(item => item.equipment_id === equip.id);
              let available = 0, borrowed = 0, unavailable = 0;

              equipItems.forEach(item => {
                const cond = item.condition || 'Good';
                if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
                  unavailable += 1;
                } else if (item.isBorrowed) {
                  borrowed += 1;
                } else {
                  available += 1;
                }
              });

              return {
                id: equip.id,
                name: equip.name,
                total: equipItems.length,
                available,
                borrowed,
                unavailable,
                utilizationRate: equipItems.length > 0 ? ((borrowed / equipItems.length) * 100).toFixed(1) : 0,
              };
            });

            setEquipmentStats(stats);

            // Calculate overall inventory stats
            let totalItems = 0, totalAvailable = 0, totalBorrowed = 0, totalUnavailable = 0;
            stats.forEach(stat => {
              totalItems += stat.total;
              totalAvailable += stat.available;
              totalBorrowed += stat.borrowed;
              totalUnavailable += stat.unavailable;
            });

            setInventoryStats({
              total: totalItems,
              available: totalAvailable,
              borrowed: totalBorrowed,
              unavailable: totalUnavailable,
            });
          }
        }
        setError('');
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  if (laboratoryData.length === 0) {
    return (
      <Alert severity="warning">
        You are not assigned to any laboratory yet. Please contact an administrator.
      </Alert>
    );
  }

  // Define chart data using theme colors
  const inventoryChartData = [
    { name: 'Available', value: inventoryStats.available, color: theme.palette.success.main },
    { name: 'Borrowed', value: inventoryStats.borrowed, color: theme.palette.warning.main },
    { name: 'Unavailable', value: inventoryStats.unavailable, color: theme.palette.error.main },
  ];

  const utilizationData = equipmentStats.map(equip => ({
    name: equip.name.substring(0, 15) + (equip.name.length > 15 ? '...' : ''),
    utilization: parseFloat(equip.utilizationRate),
  }));

  return (
    <Box>
      <PageHeader
        eyebrow="Laboratory workspace"
        title={laboratoryData.length === 1 ? laboratoryData[0].name : `${laboratoryData.length} assigned laboratories`}
        description={laboratoryData.length === 1 ? laboratoryData[0].description || 'Monitor equipment, utilization, and borrowing activity.' : laboratoryData.map(lab => lab.name).join(' • ')}
      />

      {/* Inventory Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total units', val: inventoryStats.total, tone: 'primary', icon: <Inventory2OutlinedIcon /> },
          { label: 'Available now', val: inventoryStats.available, tone: 'success', icon: <CheckCircleOutlineIcon /> },
          { label: 'Currently borrowed', val: inventoryStats.borrowed, tone: 'warning', icon: <LocalShippingOutlinedIcon /> },
          { label: 'Needs attention', val: inventoryStats.unavailable, tone: 'error', icon: <ReportProblemOutlinedIcon /> },
        ].map((stat, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <MetricCard label={stat.label} value={stat.val} tone={stat.tone} icon={stat.icon} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Awaiting pickup', val: workflowStats.awaitingPickup, tone: 'info', icon: <CheckCircleOutlineIcon /> },
          { label: 'Overdue requests', val: workflowStats.overdue, tone: 'error', icon: <ReportProblemOutlinedIcon /> },
          { label: 'Partially returned', val: workflowStats.partiallyReturned, tone: 'warning', icon: <LocalShippingOutlinedIcon /> },
          { label: 'Open maintenance', val: workflowStats.maintenanceOpen, tone: workflowStats.maintenanceOverdue ? 'error' : 'secondary', icon: <ConstructionOutlinedIcon /> },
        ].map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.label}>
            <MetricCard label={stat.label} value={stat.val} tone={stat.tone} icon={stat.icon} />
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Inventory Distribution (Pie Chart) */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'text.primary' }}>
              Inventory Distribution
            </Typography>
            {inventoryStats.total > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={inventoryChartData}
                    cx="50%" cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {inventoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme.palette.background.paper, 
                      color: theme.palette.text.primary,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No inventory data available
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Utilization Rate (Bar Chart) */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'text.primary' }}>
              Equipment Utilization Rate
            </Typography>
            {utilizationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={utilizationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    interval={0} 
                    stroke={theme.palette.text.secondary}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    label={{ value: '%', angle: -90, position: 'insideLeft', fill: theme.palette.text.secondary }} 
                    stroke={theme.palette.text.secondary}
                  />
                  <Tooltip 
                    cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: theme.palette.background.paper, 
                      color: theme.palette.text.primary,
                      border: `1px solid ${theme.palette.divider}`
                    }} 
                  />
                  <Bar dataKey="utilization" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No equipment data available
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Borrowing Activities Table */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'text.primary' }}>
          Recent Borrowing Activities
        </Typography>
        {recentTransactions.length > 0 ? (
          <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 620 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                {['Borrower', 'Equipment', 'Status', 'Borrow Date', 'Return Date'].map((head) => (
                  <TableCell key={head} sx={{ fontWeight: 'bold', color: 'primary.main' }}>{head}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {recentTransactions.map((trans, idx) => (
                <TableRow key={trans.id} sx={{ 
                  bgcolor: idx % 2 === 0 ? 'transparent' : (isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') 
                }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {trans.borrower_name || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {trans.borrower_email || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{trans.equipment_summary || 'N/A'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={(trans.status === 'approved' ? 'APPROVED — AWAITING PICKUP' : trans.lifecycle_stage === 'partially_returned' ? `PARTIALLY RETURNED ${trans.returned_count}/${trans.issued_count}` : trans.is_overdue ? 'OVERDUE' : trans.status.toUpperCase())}
                      size="small"
                      color={
                        trans.is_overdue ? 'error' :
                        trans.status === 'approved' ? 'secondary' :
                        trans.status === 'borrowed' ? 'primary' :
                        trans.status === 'returned' ? 'info' : 
                        trans.status === 'rejected' ? 'error' : 'warning'
                      }
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>
                    {trans.borrow_date ? format(new Date(trans.borrow_date), 'MMM dd, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {trans.return_date ? format(new Date(trans.return_date), 'MMM dd, yyyy') : 'Not set'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No recent borrowing activities
          </Typography>
        )}
      </Paper>

      {/* Equipment Inventory Details Table */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'text.primary' }}>
          Equipment Inventory Details
        </Typography>
        {equipmentStats.length > 0 ? (
          <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 620 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Equipment Name</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Total</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', color: 'success.main' }}>Available</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', color: 'warning.main' }}>Borrowed</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', color: 'error.main' }}>Unavailable</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Utilization %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {equipmentStats.map((equip, idx) => (
                <TableRow key={equip.id} sx={{ 
                  bgcolor: idx % 2 === 0 ? 'transparent' : (isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') 
                }}>
                  <TableCell>{equip.name}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>{equip.total}</TableCell>
                  <TableCell align="center" sx={{ color: 'success.main', fontWeight: 'bold' }}>{equip.available}</TableCell>
                  <TableCell align="center" sx={{ color: 'warning.main', fontWeight: 'bold' }}>{equip.borrowed}</TableCell>
                  <TableCell align="center" sx={{ color: 'error.main', fontWeight: 'bold' }}>{equip.unavailable}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <Box sx={{ width: 60 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={parseFloat(equip.utilizationRate)} 
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: theme.palette.divider,
                            '& .MuiLinearProgress-bar': { backgroundColor: 'primary.main' }
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 35 }}>
                        {equip.utilizationRate}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No equipment available in this laboratory
          </Typography>
        )}
      </Paper>
    </Box>
  );
});
