import { useEffect, useState, useMemo } from 'react';
import axiosClient from "../../axiosClient";
import { downloadCsv } from '../../csv';
import { writePrintDocument } from '../../printDocument';
import {
  Paper, Grid, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, CircularProgress, TextField,
  Collapse, IconButton, Box, Select, MenuItem, FormControl, InputLabel, Card, CardContent, Tabs, Tab, Chip, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Print as PrintIcon, Download, Settings } from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import DailyInventorySnapshots from './dailyInventorySnapshots';

export default function Inventory() {
  const theme = useTheme();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [laboratories, setLaboratories] = useState([]);
  const [selectedLab, setSelectedLab] = useState('');
  const [openRows, setOpenRows] = useState({});
  const [itemsCache, setItemsCache] = useState({});
  const [tabValue, setTabValue] = useState(0);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [labsRes, eqRes] = await Promise.all([
          axiosClient.get('/laboratories'),
          axiosClient.get('/equipment-data')
        ]);
        const labs = labsRes.data?.data || labsRes.data || [];
        setLaboratories(labs);

        const eq = eqRes.data?.equipment || [];
        const normalized = eq.map(item => ({
          ...item,
          total_quantity: item.total_quantity || 0,
          borrowed_quantity: item.borrowed_quantity || 0,
          available_quantity: item.available_quantity || 0,
          categories: Array.isArray(item.categories) ? item.categories : [],
          laboratory_name: (labs.find(l => l.id === item.laboratory_id)?.name) || item.laboratory_name || ''
        }));
        setEquipment(normalized);
      } catch (err) {
        console.error('Failed to load inventory data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return equipment.filter(i => {
      if (selectedLab && String(i.laboratory_id) !== String(selectedLab)) return false;
      if (!q) return true;
      return (
        String(i.id).includes(q) ||
        (i.name || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      );
    });
  }, [equipment, query, selectedLab]);

  const totals = useMemo(() => {
    let totalAvailable = 0, totalBorrowed = 0, totalUnavailable = 0;
    
    filtered.forEach(it => {
      const items = it.items || [];
      items.forEach(item => {
        const cond = item.condition || 'Good';
        if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
          totalUnavailable += 1;
        } else if (item.isBorrowed) {
          totalBorrowed += 1;
        } else {
          totalAvailable += 1;
        }
      });
    });
    
    return {
      total_items: filtered.length,
      total_quantity: filtered.reduce((sum, e) => sum + ((e.items || []).length), 0),
      total_available: totalAvailable,
      total_borrowed: totalBorrowed
    };
  }, [filtered]);

  // ==================== LIVE INVENTORY OVERVIEW ====================
  const getLiveStats = () => {
    // Count unavailable items based on condition (Damaged, Missing, Under Repair)
    let totalUnavailable = 0;
    let totalAvailable = 0;
    let totalBorrowed = 0;
    
    filtered.forEach(e => {
      const items = e.items || [];
      items.forEach(item => {
        const cond = item.condition || 'Good';
        if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
          totalUnavailable += 1;
        } else if (item.isBorrowed) {
          totalBorrowed += 1;
        } else {
          totalAvailable += 1;
        }
      });
    });

    const stats = {
      total_items: filtered.length,
      total_quantity: filtered.reduce((sum, e) => sum + ((e.items || []).length), 0),
      total_available: totalAvailable,
      total_borrowed: totalBorrowed,
      unavailable: totalUnavailable,
    };

    const byLab = {};
    equipment.forEach(e => {
      const lab = e.laboratory_name || 'Unknown';
      if (!byLab[lab]) byLab[lab] = { total: 0, available: 0, borrowed: 0, unavailable: 0 };
      
      const items = e.items || [];
      byLab[lab].total += items.length;
      
      items.forEach(item => {
        const cond = item.condition || 'Good';
        if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
          byLab[lab].unavailable += 1;
        } else if (item.isBorrowed) {
          byLab[lab].borrowed += 1;
        } else {
          byLab[lab].available += 1;
        }
      });
    });

    const labData = Object.entries(byLab)
      .map(([lab, counts]) => ({ lab, ...counts }))
      .sort((a, b) => b.total - a.total);

    return { stats, labData };
  };

  // ==================== DAILY SNAPSHOT ====================
  const getDailySnapshot = () => {
    const categoryBreakdown = {};
    filtered.forEach(e => {
      const cats = (e.categories || []).map(c => c.name).join(', ') || 'Uncategorized';
      if (!categoryBreakdown[cats]) categoryBreakdown[cats] = { total: 0, available: 0, borrowed: 0, unavailable: 0 };
      
      const items = e.items || [];
      categoryBreakdown[cats].total += items.length;
      
      items.forEach(item => {
        const cond = item.condition || 'Good';
        if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
          categoryBreakdown[cats].unavailable += 1;
        } else if (item.isBorrowed) {
          categoryBreakdown[cats].borrowed += 1;
        } else {
          categoryBreakdown[cats].available += 1;
        }
      });
    });

    const categoryData = Object.entries(categoryBreakdown)
      .map(([category, counts]) => ({ category, ...counts }))
      .sort((a, b) => b.total - a.total);

    return { categoryData };
  };

  const exportVisible = async () => {
    if (filtered.length === 0) return alert('No rows to export');

    // fetch items to include unit ids for each equipment
    let allItems = [];
    try {
      const res = await axiosClient.get('/item');
      allItems = res.data?.data || res.data || [];
    } catch (err) {
      console.warn('Failed to fetch items for export, continuing without unit ids', err);
    }

    // Build sheet rows to mirror the print output: equipment row followed by its unit rows
    const flatRows = [];
    for (const i of filtered) {
      const items = i.items || [];
      let available = 0, borrowed = 0, unavailable = 0;
      items.forEach(item => {
        const cond = item.condition || 'Good';
        if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
          unavailable += 1;
        } else if (item.isBorrowed) {
          borrowed += 1;
        } else {
          available += 1;
        }
      });

      // Equipment summary row
      flatRows.push({
        RowType: 'Equipment',
        ID: i.id,
        Name: i.name,
        Laboratory: i.laboratory_name || i.laboratory_id || '',
        Categories: (i.categories || []).map(c => c.name).join(', '),
        TotalQty: items.length,
        Available: available,
        Borrowed: borrowed,
        UnitID: '',
        Condition: ''
      });

      // Unit rows for this equipment
      if (items.length === 0) {
        flatRows.push({ RowType: 'Units', ID: '', Name: 'No units', Laboratory: '', Categories: '', TotalQty: '', Available: '', Borrowed: '', UnitID: '', Condition: '' });
      } else {
        for (const u of items) {
          flatRows.push({
            RowType: 'Unit',
            ID: '',
            Name: '',
            Laboratory: '',
            Categories: '',
            TotalQty: '',
            Available: '',
            Borrowed: '',
            UnitID: u.unit_id || u.id,
            Condition: u.condition || '-'
          });
        }
      }
    }

    downloadCsv(`inventory_report_${new Date().toISOString().slice(0,10)}.csv`, flatRows);
  };

  const printVisible = async () => {
    if (filtered.length === 0) {
      alert('No rows to print');
      return;
    }

    try {
      // fetch all items once and map by equipment_id
      const res = await axiosClient.get('/item');
      const allItems = res.data?.data || res.data || [];

      let html = `<!doctype html><html><head><meta charset="utf-8"><title>Inventory Report</title>`;
      html += `<style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{border-collapse:collapse;width:100%;margin-bottom:20px}th,td{border:1px solid #ccc;padding:8px;text-align:left}h1{margin-bottom:6px}</style>`;
      html += `</head><body>`;
      html += `<h1>Inventory Report</h1>`;
      html += `<p>Generated: ${new Date().toLocaleString()}</p>`;

      html += `<table><thead><tr><th>ID</th><th>Name</th><th>Laboratory</th><th>Categories</th><th style="text-align:right">Total Qty</th><th style="text-align:right">Available</th><th style="text-align:right">Borrowed</th></tr></thead><tbody>`;

      for (const row of filtered) {
        // Calculate available, borrowed, and unavailable from items
        const items = row.items || [];
        let available = 0, borrowed = 0, unavailable = 0;
        items.forEach(item => {
          const cond = item.condition || 'Good';
          if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
            unavailable += 1;
          } else if (item.isBorrowed) {
            borrowed += 1;
          } else {
            available += 1;
          }
        });

        html += `<tr>`;
        html += `<td>${row.id}</td>`;
        html += `<td>${row.name || ''}</td>`;
        html += `<td>${row.laboratory_name || row.laboratory_id || ''}</td>`;
        html += `<td>${(row.categories || []).map(c => c.name).join(', ')}</td>`;
        html += `<td style="text-align:right">${items.length}</td>`;
        html += `<td style="text-align:right">${available}</td>`;
        html += `<td style="text-align:right">${borrowed}</td>`;
        html += `</tr>`;

        // units for this equipment
        const units = items;
        html += `<tr><td colspan="7">`;
        html += `<strong>Units:</strong>`;
        if (units.length === 0) {
          html += ` No units`;
        } else {
          html += `<table style="margin-top:8px"><thead><tr><th>Unit ID</th><th>Condition</th></tr></thead><tbody>`;
          for (const it of units) {
            html += `<tr><td>${it.unit_id || it.id}</td><td>${it.condition || '-'}</td></tr>`;
          }
          html += `</tbody></table>`;
        }
        html += `</td></tr>`;
      }

      html += `</tbody></table>`;
      html += `</body></html>`;

      const w = window.open('', '_blank');
      if (!w) {
        alert('Unable to open print window (popup blocked)');
        return;
      }
      writePrintDocument(w, html);
      // allow styles to apply then print
      setTimeout(() => { w.print(); }, 300);
    } catch (err) {
      console.error('Print failed', err);
      alert('Failed to prepare print view');
    }
  };

  // ==================== PRINT REPORT ====================
  const handlePrintReport = (type) => {
    const win = window.open('', '_blank');
    if (!win) return;

    let title, inventoryDate, content;
    
    if (type === 'live') {
      const currentDate = new Date();
      title = `Live Inventory Report - ${format(currentDate, 'MMM dd, yyyy HH:mm')}`;
      inventoryDate = format(currentDate, 'MMMM dd, yyyy');
      
      const { stats } = getLiveStats();
      
      const rowsHtml = filtered.map(e => {
        // Calculate available, borrowed, and unavailable from items
        const items = e.items || [];
        let available = 0, borrowed = 0, unavailable = 0;
        items.forEach(item => {
          const cond = item.condition || 'Good';
          if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
            unavailable += 1;
          } else if (item.isBorrowed) {
            borrowed += 1;
          } else {
            available += 1;
          }
        });
        
        return `
        <tr>
          <td>${e.id}</td>
          <td>${e.name}</td>
          <td>${e.laboratory_name || 'N/A'}</td>
          <td style="text-align: right;">${items.length}</td>
          <td style="text-align: right;">${available}</td>
          <td style="text-align: right;">${borrowed}</td>
        </tr>`;
      }).join('');

      content = `
        <div class="report-info">
          <p><strong>Report Type:</strong> Live Inventory</p>
          <p><strong>Inventory Date:</strong> ${inventoryDate}</p>
          <p><strong>Generated:</strong> ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}</p>
        </div>
        <div class="stats">
          <div class="stat-box"><h4>Total Items</h4><div class="value">${stats.total_items}</div></div>
          <div class="stat-box" style="border-left-color: #388e3c;"><h4>Total Qty</h4><div class="value">${stats.total_quantity}</div></div>
          <div class="stat-box" style="border-left-color: #388e3c;"><h4>Available</h4><div class="value">${stats.total_available}</div></div>
          <div class="stat-box" style="border-left-color: #1976d2;"><h4>Borrowed</h4><div class="value">${stats.total_borrowed}</div></div>
          <div class="stat-box" style="border-left-color: #f57c00;"><h4>Unavailable</h4><div class="value">${stats.unavailable}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Laboratory</th>
              <th>Total</th><th>Available</th><th>Borrowed</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `;
    } else {
      const snapshotDate = new Date(selectedDate);
      title = `Daily Inventory Snapshot - ${format(snapshotDate, 'MMM dd, yyyy')}`;
      inventoryDate = format(snapshotDate, 'MMMM dd, yyyy');
      
      const rowsHtml = filtered.map(e => {
        // Calculate available, borrowed, and unavailable from items
        const items = e.items || [];
        let available = 0, borrowed = 0, unavailable = 0;
        items.forEach(item => {
          const cond = item.condition || 'Good';
          if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
            unavailable += 1;
          } else if (item.isBorrowed) {
            borrowed += 1;
          } else {
            available += 1;
          }
        });
        
        return `
        <tr>
          <td>${e.id}</td>
          <td>${e.name}</td>
          <td>${e.laboratory_name || 'N/A'}</td>
          <td>${items.map(i => i.condition || 'Good').join(', ') || 'N/A'}</td>
          <td style="text-align: right;">${items.length}</td>
          <td style="text-align: right;">${available}</td>
          <td style="text-align: right;">${borrowed}</td>
        </tr>`;
      }).join('');

      content = `
        <div class="report-info">
          <p><strong>Report Type:</strong> Daily Inventory Snapshot</p>
          <p><strong>Inventory Date:</strong> ${inventoryDate}</p>
          <p><strong>Generated:</strong> ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Laboratory</th><th>Condition</th>
              <th>Total</th><th>Available</th><th>Borrowed</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `;
    }

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
            h2 { color: #333; margin-bottom: 10px; }
            .report-info {
              background-color: #f9f9f9;
              border: 1px solid #e0e0e0;
              border-left: 4px solid #8b0000;
              padding: 12px;
              margin-bottom: 20px;
              border-radius: 4px;
            }
            .report-info p {
              margin: 5px 0;
              font-size: 13px;
              color: #333;
            }
            .report-info strong {
              color: #8b0000;
              font-weight: 600;
            }
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
              border: 1px solid #ddd;
            }
            tbody tr:nth-child(even) { background-color: #fafafa; }
            @media print { body { zoom: 0.75; } }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          ${content}
        </body>
      </html>`;

    writePrintDocument(win, html);
    win.focus();
    win.print();
  };

  return (
    <>
      {/* MAIN INVENTORY VIEW */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h5" fontWeight="bold">Inventory Report</Typography>
            <Typography color="text.secondary">Summary and current stock across laboratories</Typography>
          </Grid>

          <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
            <TextField size="small" placeholder="Search (id, name, description)" value={query} onChange={e => setQuery(e.target.value)} sx={{ mr: 1, minWidth: 220 }} />
            <FormControl size="small" sx={{ mr: 1, minWidth: 200 }}>
              <InputLabel id="lab-filter-label">Laboratory</InputLabel>
              <Select
                labelId="lab-filter-label"
                label="Laboratory"
                value={selectedLab}
                onChange={e => setSelectedLab(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {laboratories.map(l => (
                  <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={exportVisible} sx={{ mr: 1 }}>Export</Button>
            <Button variant="outlined" onClick={() => handlePrintReport('live')} sx={{ mr: 1 }} startIcon={<PrintIcon />}>Print Live</Button>
            <Button variant="contained" onClick={() => printVisible()}>
              Print Detail
            </Button>
          </Grid>

          <Grid item xs={12}>
            <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Inventory Details" />
              <Tab label="Daily Snapshot Report" />
            </Tabs>
          </Grid>

          <Grid item xs={12} md={3}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">Items</Typography>
              <Typography variant="h5" fontWeight="700">{totals.total_items}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">Total Qty</Typography>
              <Typography variant="h5" fontWeight="700">{totals.total_quantity}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">Available</Typography>
              <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 700 }}>{totals.total_available}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">Borrowed</Typography>
              <Typography variant="h5" sx={{ color: 'error.main', fontWeight: 700 }}>{totals.total_borrowed}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* INVENTORY DETAILS TAB */}
      {tabValue === 0 && (
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <CircularProgress />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Laboratory</TableCell>
                  <TableCell>Categories</TableCell>
                  <TableCell align="right">Total Qty</TableCell>
                  <TableCell align="right">Available</TableCell>
                  <TableCell align="right">Borrowed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(row => {
                  const open = !!openRows[row.id];
                  return [
                    <TableRow key={`row-${row.id}`} hover>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={async () => {
                            setOpenRows(prev => ({ ...prev, [row.id]: !prev[row.id] }));
                            if (!itemsCache[row.id]) {
                              // mark as loading by setting undefined -> undefined already means loading; we'll set to undefined first
                              setItemsCache(prev => ({ ...prev, [row.id]: undefined }));
                              try {
                                const res = await axiosClient.get('/item');
                                const items = (res.data?.data || res.data || []).filter(it => String(it.equipment_id) === String(row.id));
                                setItemsCache(prev => ({ ...prev, [row.id]: items }));
                              } catch (err) {
                                setItemsCache(prev => ({ ...prev, [row.id]: [] }));
                              }
                            }
                          }}
                        >
                          <ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: '200ms' }} />
                        </IconButton>
                      </TableCell>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.laboratory_name || row.laboratory_id || '-'}</TableCell>
                      <TableCell>{(row.categories || []).map(c => c.name).join(', ')}</TableCell>
                      {(() => {
                        const items = row.items || [];
                        let available = 0, borrowed = 0, unavailable = 0;
                        items.forEach(item => {
                          const cond = item.condition || 'Good';
                          if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
                            unavailable += 1;
                          } else if (item.isBorrowed) {
                            borrowed += 1;
                          } else {
                            available += 1;
                          }
                        });
                        return (
                          <>
                            <TableCell align="right">{items.length}</TableCell>
                            <TableCell align="right">{available}</TableCell>
                            <TableCell align="right">{borrowed}</TableCell>
                          </>
                        );
                      })()}
                    </TableRow>,
                    <TableRow key={`row-${row.id}-expanded`}>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>Units for {row.name} (ID: {row.id})</Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Unit ID</TableCell>
                                  <TableCell>Condition</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {itemsCache[row.id] === undefined ? (
                                  <TableRow>
                                    <TableCell colSpan={2}><CircularProgress size={20} /></TableCell>
                                  </TableRow>
                                ) : (itemsCache[row.id].length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={2}>No units</TableCell>
                                  </TableRow>
                                ) : (
                                  itemsCache[row.id].map(it => (
                                    <TableRow key={`unit-${it.id}`} hover>
                                      <TableCell>{it.unit_id || it.id}</TableCell>
                                      <TableCell>{it.condition || '-'}</TableCell>
                                    </TableRow>
                                  ))
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  ];
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      )}

      {/* DAILY SNAPSHOT TAB */}
      {tabValue === 1 && (
        <DailyInventorySnapshots />
      )}
    </>
  );
}
