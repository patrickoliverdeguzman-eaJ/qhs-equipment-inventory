import React, { useEffect, useState, memo } from 'react';
import axiosClient from '../../axiosClient';
import { writePrintDocument } from '../../printDocument';
import {
  Box, Button, Paper, Typography, Grid, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  CircularProgress, Alert, Card, CardContent, Tabs, Tab, TextField, useTheme, useMediaQuery, Chip
} from '@mui/material';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { Download, Print as PrintIcon } from '@mui/icons-material';
import * as Mui from '../../assets/muiImports';

const COLORS = ['#1976d2', '#388e3c', '#d32f2f', '#f57c00', '#7b1fa2', '#00796b'];

export default memo(function TransactionReports() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch all transactions for reports
  const fetchAllTransactions = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get('/transactions?per_page=1000');
      const txs = Array.isArray(data.data) ? data.data : [];
      setTransactions(txs);
      setError('');
    } catch (e) {
      console.error(e);
      setError('Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTransactions();
  }, []);

  // ==================== DAILY REPORT ====================
  const getDailyStats = () => {
    // Get all transactions created on selected day
    const dailyTx = transactions.filter(t => format(new Date(t.created_at), 'yyyy-MM-dd') === selectedDay);

    const stats = {
      total: dailyTx.length,
      pending: dailyTx.filter(t => t.status === 'pending').length,
      borrowed: dailyTx.filter(t => t.status === 'borrowed').length,
      returned: dailyTx.filter(t => t.status === 'returned').length,
      rejected: dailyTx.filter(t => t.status === 'rejected').length,
    };

    return { stats, transactions: dailyTx, date: selectedDay };
  };

  // ==================== MONTHLY REPORT ====================
  const getMonthlyStats = () => {
    const year = selectedYear;
    const month = selectedMonth;
    const monthStr = String(month).padStart(2, '0');
    const targetMonth = `${year}-${monthStr}`;

    // Get all transactions created that month
    const monthTx = transactions.filter(t => format(new Date(t.created_at), 'yyyy-MM') === targetMonth);

    const byDay = {};
    monthTx.forEach(t => {
      const day = format(new Date(t.created_at), 'yyyy-MM-dd');
      if (!byDay[day]) byDay[day] = { total: 0, pending: 0, borrowed: 0, returned: 0, rejected: 0 };
      byDay[day].total++;
      byDay[day][t.status]++;
    });

    const stats = {
      total: monthTx.length,
      pending: monthTx.filter(t => t.status === 'pending').length,
      borrowed: monthTx.filter(t => t.status === 'borrowed').length,
      returned: monthTx.filter(t => t.status === 'returned').length,
      rejected: monthTx.filter(t => t.status === 'rejected').length,
    };

    const chartData = Object.entries(byDay).map(([day, counts]) => ({
      date: day,
      ...counts
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    return { stats, transactions: monthTx, chartData };
  };

  // ==================== ANNUAL REPORT ====================
  const getAnnualStats = () => {
    const year = String(selectedYear);
    
    // Get all transactions created that year
    const annualTx = transactions.filter(t => format(new Date(t.created_at), 'yyyy') === year);

    const byMonth = {};
    annualTx.forEach(t => {
      const month = format(new Date(t.created_at), 'yyyy-MM');
      if (!byMonth[month]) byMonth[month] = { total: 0, pending: 0, borrowed: 0, returned: 0, rejected: 0 };
      byMonth[month].total++;
      byMonth[month][t.status]++;
    });

    const stats = {
      total: annualTx.length,
      pending: annualTx.filter(t => t.status === 'pending').length,
      borrowed: annualTx.filter(t => t.status === 'borrowed').length,
      returned: annualTx.filter(t => t.status === 'returned').length,
      rejected: annualTx.filter(t => t.status === 'rejected').length,
    };

    const chartData = Object.entries(byMonth)
      .map(([month, counts]) => ({
        month: format(new Date(month + '-01'), 'MMM'),
        ...counts
      }))
      .sort((a, b) => {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });

    const statusBreakdown = [
      { name: 'Pending', value: stats.pending, color: '#f57c00' },
      { name: 'Borrowed', value: stats.borrowed, color: '#1976d2' },
      { name: 'Returned', value: stats.returned, color: '#388e3c' },
      { name: 'Rejected', value: stats.rejected, color: '#d32f2f' },
    ].filter(s => s.value > 0);

    return { stats, transactions: annualTx, chartData, statusBreakdown };
  };

  // ==================== EXPORT FUNCTION ====================
  const handleExport = (reportType) => {
    let reportData, filename, title;
    
    if (reportType === 'daily') {
      reportData = getDailyStats();
      filename = `Transaction_Report_Daily_${reportData.date}`;
      title = `Daily Report - ${reportData.date}`;
    } else if (reportType === 'monthly') {
      reportData = getMonthlyStats();
      filename = `Transaction_Report_Monthly_${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      title = `Monthly Report - ${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    } else {
      reportData = getAnnualStats();
      filename = `Transaction_Report_Annual_${selectedYear}`;
      title = `Annual Report - ${selectedYear}`;
    }

    // CSV Headers
    const headers = ['ID', 'Borrower', 'Laboratory', 'Equipment', 'Created At', 'Accepted At', 'Returned At', 'Status'];
    
    // CSV Rows
    const rows = reportData.transactions.map(t => [
      t.id,
      t.borrower_name || 'N/A',
      t.laboratory?.name || 'N/A',
      t.equipment_summary || 'N/A',
      t.created_at ? format(new Date(t.created_at), 'MMM dd, yyyy HH:mm') : '—',
      t.accepted_at ? format(new Date(t.accepted_at), 'MMM dd, yyyy HH:mm') : '—',
      t.returned_at ? format(new Date(t.returned_at), 'MMM dd, yyyy HH:mm') : t.rejected_at ? format(new Date(t.rejected_at), 'MMM dd, yyyy HH:mm') : '—',
      t.status?.toUpperCase() || 'N/A'
    ]);

    // Add summary statistics
    const summaryRows = [
      [],
      ['SUMMARY STATISTICS'],
      ['Total Transactions', reportData.stats.total],
      ['Pending', reportData.stats.pending],
      ['Borrowed', reportData.stats.borrowed],
      ['Returned', reportData.stats.returned],
      ['Rejected', reportData.stats.rejected],
      [],
      ['Generated on', format(new Date(), 'MMM dd, yyyy HH:mm')]
    ];

    // Combine headers, data, and summary
    const csvContent = [
      [title],
      [],
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ...summaryRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==================== PRINT FUNCTION ====================
  const handlePrint = (reportType) => {
    let reportData, title;
    
    if (reportType === 'daily') {
      reportData = getDailyStats();
      title = `Daily Report - ${reportData.date}`;
    } else if (reportType === 'monthly') {
      reportData = getMonthlyStats();
      title = `Monthly Report - ${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    } else {
      reportData = getAnnualStats();
      title = `Annual Report - ${selectedYear}`;
    }

    const win = window.open('', '_blank');
    if (!win) return;

    const formatTs = (ts) => ts ? format(new Date(ts), 'MMM dd, HH:mm') : '—';
    const rowsHtml = reportData.transactions.map(t => `
      <tr>
        <td>${t.id}</td>
        <td>${t.borrower_name || 'N/A'}</td>
        <td>${t.laboratory?.name || 'N/A'}</td>
        <td>${t.equipment_summary || 'N/A'}</td>
        <td>${formatTs(t.created_at)}</td>
        <td>${formatTs(t.accepted_at)}</td>
        <td>${t.status === 'returned' ? formatTs(t.returned_at) : t.status === 'rejected' ? formatTs(t.rejected_at) : '—'}</td>
        <td>${t.status?.toUpperCase() || 'N/A'}</td>
      </tr>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            * { margin: 0; padding: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 10px;
              zoom: 0.75;
            }
            .header { margin-bottom: 20px; }
            h2 { color: #333; margin-bottom: 10px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 20px; }
            .stat-box { 
              padding: 15px; 
              border-radius: 4px; 
              background: #f5f5f5; 
              border-left: 4px solid #1976d2;
            }
            .stat-box h4 { font-size: 12px; color: #666; margin-bottom: 5px; }
            .stat-box .value { font-size: 24px; font-weight: bold; color: #333; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              font-size: 12px;
            }
            th { 
              background-color: #f5f5f5; 
              padding: 8px; 
              text-align: left; 
              font-weight: 600;
              border: 1px solid #ddd;
            }
            td { 
              padding: 6px; 
              text-align: left;
              border: 1px solid #ddd;
            }
            tbody tr:nth-child(even) { background-color: #fafafa; }
            .generated { font-size: 10px; color: #999; margin-top: 20px; }
            @media print { 
              body { zoom: 0.75; }
              tbody tr:hover { background-color: transparent; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${title}</h2>
            <p style="color: #666; font-size: 12px;">Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
          </div>

          <div class="stats">
            <div class="stat-box">
              <h4>Total Transactions</h4>
              <div class="value">${reportData.stats.total}</div>
            </div>
            <div class="stat-box" style="border-left-color: #f57c00;">
              <h4>Pending</h4>
              <div class="value">${reportData.stats.pending}</div>
            </div>
            <div class="stat-box" style="border-left-color: #1976d2;">
              <h4>Borrowed</h4>
              <div class="value">${reportData.stats.borrowed}</div>
            </div>
            <div class="stat-box" style="border-left-color: #388e3c;">
              <h4>Returned</h4>
              <div class="value">${reportData.stats.returned}</div>
            </div>
            <div class="stat-box" style="border-left-color: #d32f2f;">
              <h4>Rejected</h4>
              <div class="value">${reportData.stats.rejected}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Borrower</th>
                <th>Laboratory</th>
                <th>Equipment</th>
                <th>Created At</th>
                <th>Accepted At</th>
                <th>Returned/Rejected At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="generated">
            <p>This report was automatically generated by the system.</p>
          </div>
        </body>
      </html>`;

    writePrintDocument(win, html);
    win.focus();
    win.print();
  };

  // ==================== DAILY REPORT VIEW ====================
  const DailyReport = () => {
    const { stats, transactions: dailyTx, date } = getDailyStats();

    return (
      <Box>
        <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">
              Daily Report - {format(new Date(date), 'MMMM dd, yyyy')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Select Date"
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: format(new Date(), 'yyyy-MM-dd') }}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total', value: stats.total, color: '#1976d2' },
            { label: 'Pending', value: stats.pending, color: '#f57c00' },
            { label: 'Borrowed', value: stats.borrowed, color: '#1976d2' },
            { label: 'Returned', value: stats.returned, color: '#388e3c' },
            { label: 'Rejected', value: stats.rejected, color: '#d32f2f' },
          ].map((stat, i) => (
            <Grid item xs={12} sm={6} md={2.4} key={i}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" sx={{ color: stat.color, fontWeight: 'bold' }}>
                    {stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper sx={{ mt: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary }}>
              Transactions on {format(new Date(date), 'MMMM dd, yyyy')}
            </Typography>
            {dailyTx.length === 0 ? (
              <Alert severity="info">No transactions on this date</Alert>
            ) : (
              <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 980 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? '#424242' : '#f5f5f5' }}>
                    <TableCell><strong>ID</strong></TableCell>
                    <TableCell><strong>Borrower</strong></TableCell>
                    <TableCell><strong>Laboratory</strong></TableCell>
                    <TableCell><strong>Equipment</strong></TableCell>
                    <TableCell><strong>Created At</strong></TableCell>
                    <TableCell><strong>Accepted At</strong></TableCell>
                    <TableCell><strong>Returned At</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailyTx.map(t => (
                    <TableRow key={t.id} hover>
                      <TableCell>{t.id}</TableCell>
                      <TableCell>{t.borrower_name}</TableCell>
                      <TableCell>{t.laboratory?.name || 'N/A'}</TableCell>
                      <TableCell>{t.equipment_summary || 'N/A'}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{t.created_at ? format(new Date(t.created_at), 'MMM dd, HH:mm') : '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{t.accepted_at ? format(new Date(t.accepted_at), 'MMM dd, HH:mm') : '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{t.returned_at ? format(new Date(t.returned_at), 'MMM dd, HH:mm') : '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={t.status?.toUpperCase()}
                          size="small"
                          color={t.status === 'returned' ? 'success' : t.status === 'borrowed' ? 'primary' : t.status === 'rejected' ? 'error' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>
      </Box>
    );
  };

  // ==================== MONTHLY REPORT VIEW ====================
  const MonthlyReport = () => {
    const { stats, chartData } = getMonthlyStats();

    return (
      <Box>
        <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">
              Monthly Report - {selectedYear}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Year"
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              size="small"
              inputProps={{ min: 2020, max: new Date().getFullYear() }}
            />
            <TextField
              label="Month"
              type="number"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              size="small"
              inputProps={{ min: 1, max: 12 }}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total', value: stats.total, color: '#1976d2' },
            { label: 'Pending', value: stats.pending, color: '#f57c00' },
            { label: 'Borrowed', value: stats.borrowed, color: '#1976d2' },
            { label: 'Returned', value: stats.returned, color: '#388e3c' },
            { label: 'Rejected', value: stats.rejected, color: '#d32f2f' },
          ].map((stat, i) => (
            <Grid item xs={12} sm={6} md={2.4} key={i}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" sx={{ color: stat.color, fontWeight: 'bold' }}>
                    {stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {chartData.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Daily Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#1976d2" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="borrowed" stroke="#388e3c" name="Borrowed" />
                <Line type="monotone" dataKey="returned" stroke="#1976d2" name="Returned" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        )}

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary }}>
            Transaction Details - {selectedYear}-{String(selectedMonth).padStart(2, '0')}
          </Typography>
          {getMonthlyStats().transactions.length === 0 ? (
            <Alert severity="info">No transactions in this month</Alert>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? '#424242' : '#f5f5f5' }}>
                  <TableCell><strong>ID</strong></TableCell>
                  <TableCell><strong>Borrower</strong></TableCell>
                  <TableCell><strong>Laboratory</strong></TableCell>
                  <TableCell><strong>Equipment</strong></TableCell>
                  <TableCell><strong>Created At</strong></TableCell>
                  <TableCell><strong>Accepted At</strong></TableCell>
                  <TableCell><strong>Returned At</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getMonthlyStats().transactions.map(t => (
                  <TableRow key={t.id} hover>
                    <TableCell>{t.id}</TableCell>
                    <TableCell>{t.borrower_name}</TableCell>
                    <TableCell>{t.laboratory?.name || 'N/A'}</TableCell>
                    <TableCell>{t.equipment_summary || 'N/A'}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{t.created_at ? format(new Date(t.created_at), 'MMM dd, HH:mm') : '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{t.accepted_at ? format(new Date(t.accepted_at), 'MMM dd, HH:mm') : '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{t.returned_at ? format(new Date(t.returned_at), 'MMM dd, HH:mm') : '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={t.status?.toUpperCase()}
                        size="small"
                        color={t.status === 'returned' ? 'success' : t.status === 'borrowed' ? 'primary' : t.status === 'rejected' ? 'error' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    );
  };

  // ==================== ANNUAL REPORT VIEW ====================
  const AnnualReport = () => {
    const { stats, chartData, statusBreakdown } = getAnnualStats();

    return (
      <Box>
        <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">
              Annual Report - {selectedYear}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Year"
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              size="small"
              fullWidth
              inputProps={{ min: 2020, max: new Date().getFullYear() }}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total', value: stats.total, color: '#1976d2' },
            { label: 'Pending', value: stats.pending, color: '#f57c00' },
            { label: 'Borrowed', value: stats.borrowed, color: '#1976d2' },
            { label: 'Returned', value: stats.returned, color: '#388e3c' },
            { label: 'Rejected', value: stats.rejected, color: '#d32f2f' },
          ].map((stat, i) => (
            <Grid item xs={12} sm={6} md={2.4} key={i}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" sx={{ color: stat.color, fontWeight: 'bold' }}>
                    {stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          {chartData.length > 0 && (
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Monthly Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#1976d2" name="Total" />
                    <Bar dataKey="borrowed" fill="#388e3c" name="Borrowed" />
                    <Bar dataKey="returned" fill="#f57c00" name="Returned" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          )}

          {statusBreakdown.length > 0 && (
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Status Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          )}
        </Grid>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary }}>
            Transaction Details - {selectedYear}
          </Typography>
          {getAnnualStats().transactions.length === 0 ? (
            <Alert severity="info">No transactions in this year</Alert>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? '#424242' : '#f5f5f5' }}>
                  <TableCell><strong>ID</strong></TableCell>
                  <TableCell><strong>Borrower</strong></TableCell>
                  <TableCell><strong>Laboratory</strong></TableCell>
                  <TableCell><strong>Equipment</strong></TableCell>
                  <TableCell><strong>Created At</strong></TableCell>
                  <TableCell><strong>Accepted At</strong></TableCell>
                  <TableCell><strong>Returned At</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getAnnualStats().transactions.map(t => (
                  <TableRow key={t.id} hover>
                    <TableCell>{t.id}</TableCell>
                    <TableCell>{t.borrower_name}</TableCell>
                    <TableCell>{t.laboratory?.name || 'N/A'}</TableCell>
                    <TableCell>{t.equipment_summary || 'N/A'}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{t.created_at ? format(new Date(t.created_at), 'MMM dd, HH:mm') : '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{t.accepted_at ? format(new Date(t.accepted_at), 'MMM dd, HH:mm') : '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{t.returned_at ? format(new Date(t.returned_at), 'MMM dd, HH:mm') : '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={t.status?.toUpperCase()}
                        size="small"
                        color={t.status === 'returned' ? 'success' : t.status === 'borrowed' ? 'primary' : t.status === 'rejected' ? 'error' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    );
  };

  return (
    <Mui.Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        mb: 3,
      }}>
        <Typography variant="h5" fontWeight="bold">
          Transaction Reports
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, '& > button': { flex: { xs: 1, sm: 'initial' } } }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => {
              if (tabValue === 0) handleExport('daily');
              else if (tabValue === 1) handleExport('monthly');
              else handleExport('annual');
            }}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => {
              if (tabValue === 0) handlePrint('daily');
              else if (tabValue === 1) handlePrint('monthly');
              else handlePrint('annual');
            }}
          >
            Print
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Tabs
            value={tabValue}
            onChange={(e, val) => setTabValue(val)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Daily Report" />
            <Tab label="Monthly Report" />
            <Tab label="Annual Report" />
          </Tabs>

          {tabValue === 0 && <DailyReport />}
          {tabValue === 1 && <MonthlyReport />}
          {tabValue === 2 && <AnnualReport />}
        </>
      )}
    </Mui.Paper>
  );
});
