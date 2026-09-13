import React, { useEffect, useState, memo } from 'react';
import axiosClient from '../../axiosClient';
import { writePrintDocument } from '../../printDocument';
import {
  Box, Button, Paper, Typography, Grid, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  CircularProgress, Alert, Chip, useTheme, useMediaQuery, IconButton, Tooltip
} from '@mui/material';
import { Download, Settings, Print as PrintIcon } from '@mui/icons-material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { format, subDays } from 'date-fns';

export default memo(function DailyInventorySnapshots() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State
  const [snapshots, setSnapshots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedLab, setSelectedLab] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snapshotSettings, setSnapshotSettings] = useState('23:59');
  const [tempTime, setTempTime] = useState('23:59');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [laboratories, setLaboratories] = useState([]);

  // Fetch equipment
  useEffect(() => {
    fetchLaboratories();
    fetchSettings();
    fetchSnapshots();
  }, []);

  // Removed fetchEquipment

  const fetchLaboratories = async () => {
    try {
      const { data } = await axiosClient.get('/laboratories');
      setLaboratories(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await axiosClient.get('/inventory-snapshots/settings');
      setSnapshotSettings(data.snapshot_time);
      setTempTime(data.snapshot_time);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSnapshots = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = { start_date: selectedDate, end_date: selectedDate };
      if (selectedLab) params.laboratory_id = selectedLab;
      const { data } = await axiosClient.get('/inventory-snapshots/range', { params });
      setSnapshots(data || []);
    } catch (e) {
      console.error(e);
      setError('Failed to load snapshots');
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  };

  // Removed fetchEquipmentTrend

  const handleSaveSettings = async () => {
    try {
      await axiosClient.post('/inventory-snapshots/settings', { snapshot_time: tempTime });
      setSnapshotSettings(tempTime);
      setSettingsOpen(false);
    } catch (e) {
      console.error(e);
      setError('Failed to save settings');
    }
  };

  const handleExport = async () => {
    try {
      const params = { start_date: selectedDate, end_date: selectedDate };
      if (selectedLab) params.laboratory_id = selectedLab;
      const { data } = await axiosClient.get('/inventory-snapshots/export', {
        params,
        responseType: 'blob',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(data);
      link.download = `inventory_snapshots_${selectedDate}.csv`;
      link.click();
    } catch (e) {
      console.error(e);
      setError('Failed to export CSV');
    }
  };

  const handleTriggerSnapshot = async () => {
    try {
      await axiosClient.post('/inventory-snapshots/trigger');
      setError('Snapshot created successfully!');
      fetchSnapshots();
    } catch (e) {
      console.error(e);
      setError('Failed to trigger snapshot');
    }
  };

  const handlePrintSnapshot = async (snapshot) => {
    try {
      const snapshotDate = format(new Date(snapshot.snapshot_date), 'MMMM dd, yyyy');
      const labName = snapshot.laboratory?.name || 'N/A';
      const equipName = snapshot.equipment?.name || 'N/A';

      // Fetch detailed equipment info if available
      let equipmentDetails = null;
      try {
        const { data } = await axiosClient.get(`/equipment/${snapshot.equipment_id}`);
        equipmentDetails = data.data;
      } catch (e) {
        console.error('Failed to load equipment details', e);
      }

      // Fetch all items for this equipment
      let itemsData = [];
      try {
        const { data } = await axiosClient.get('/item');
        itemsData = (data.data || []).filter(item => item.equipment_id === snapshot.equipment_id);
      } catch (e) {
        console.error('Failed to load items', e);
      }

      // Calculate stats from items
      let available = 0, borrowed = 0, unavailable = 0;
      itemsData.forEach(item => {
        const cond = item.condition || 'Good';
        if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
          unavailable += 1;
        } else if (item.isBorrowed) {
          borrowed += 1;
        } else {
          available += 1;
        }
      });

      // Build detailed units table
      let unitsTableHtml = '';
      if (itemsData.length > 0) {
        unitsTableHtml = `
          <div style="margin-top: 30px;">
            <h3 style="color: #8b0000; margin-bottom: 15px;">Detailed Unit Inventory</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #8b0000; color: white;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Unit ID</th>
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Condition</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${itemsData.map((item, idx) => {
                  const cond = item.condition || 'Good';
                  const status = ['Damaged', 'Missing', 'Under Repair'].includes(cond) 
                    ? 'UNAVAILABLE' 
                    : item.isBorrowed ? 'BORROWED' : 'AVAILABLE';
                  const statusColor = status === 'AVAILABLE' ? '#4caf50' : status === 'BORROWED' ? '#ff9800' : '#d32f2f';
                  return `
                    <tr style="${idx % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
                      <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; font-weight: bold;">${item.unit_id}</td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${cond}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: white; background-color: ${statusColor}; font-weight: bold;">${status}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      const html = `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Daily Inventory Snapshot</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #8b0000;
          padding-bottom: 15px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
          color: #8b0000;
        }
        .header p {
          margin: 5px 0;
          font-size: 14px;
        }
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
        .info-section {
          margin-bottom: 20px;
          padding: 10px;
          background-color: #f9f9f9;
          border-left: 4px solid #8b0000;
        }
        .info-section label {
          font-weight: bold;
          color: #8b0000;
        }
        .info-section span {
          margin-left: 10px;
          color: #333;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .stat-card {
          padding: 15px;
          background-color: #f5f5f5;
          border-left: 4px solid #8b0000;
          border-radius: 4px;
        }
        .stat-card h4 {
          margin: 0 0 8px 0;
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #8b0000;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Daily Inventory Snapshot Report</h1>
        <p><strong>Report Date:</strong> ${snapshotDate}</p>
        <p><strong>Generated:</strong> ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}</p>
      </div>

      <div class="report-info">
        <p><strong>Report Type:</strong> Daily Inventory Snapshot</p>
        <p><strong>Inventory Date:</strong> ${snapshotDate}</p>
        <p><strong>Generated:</strong> ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}</p>
      </div>

      <div class="info-section">
        <label>Laboratory:</label>
        <span>${labName}</span>
      </div>

      <div class="info-section">
        <label>Equipment:</label>
        <span>${equipName}</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <h4>Total Items</h4>
          <div class="stat-value">${snapshot.total_items}</div>
        </div>
        <div class="stat-card" style="border-left-color: #4caf50;">
          <h4>Available</h4>
          <div class="stat-value" style="color: #4caf50;">${available}</div>
        </div>
        <div class="stat-card" style="border-left-color: #ff9800;">
          <h4>Borrowed</h4>
          <div class="stat-value" style="color: #ff9800;">${snapshot.borrowed_count}</div>
        </div>
        <div class="stat-card" style="border-left-color: #d32f2f;">
          <h4>Unavailable</h4>
          <div class="stat-value" style="color: #d32f2f;">${unavailable}</div>
        </div>
      </div>

      <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #8b0000;">Summary</h3>
        <div style="display: flex; justify-content: space-between; margin: 10px 0;">
          <span><strong>Utilization Rate:</strong></span>
          <span>${snapshot.total_items > 0 ? ((snapshot.borrowed_count / snapshot.total_items) * 100).toFixed(1) : 0}%</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 10px 0;">
          <span><strong>Availability Rate:</strong></span>
          <span>${snapshot.total_items > 0 ? ((available / snapshot.total_items) * 100).toFixed(1) : 0}%</span>
        </div>
      </div>

      ${unitsTableHtml}

      <div class="footer">
        <p>This is an automated report generated by the Inventory Management System</p>
      </div>
    </body>
    </html>`;

      const w = window.open('', '_blank');
      if (!w) {
        alert('Popup blocked. Please enable popups for this site.');
        return;
      }
      
      writePrintDocument(w, html);
      setTimeout(() => {
        w.focus();
        w.print();
      }, 500);
    } catch (err) {
      console.error('Failed to print snapshot', err);
      alert('Failed to generate print report');
    }
  };

  const handlePrintDetailedInventory = async () => {
    try {
      if (snapshots.length === 0) {
        alert('No snapshots available to print');
        return;
      }

      const reportDate = format(new Date(selectedDate), 'MMMM dd, yyyy');
      
      // Fetch all items for all equipment
      let allItems = [];
      try {
        const { data } = await axiosClient.get('/item');
        allItems = data.data || [];
      } catch (e) {
        console.error('Failed to load items', e);
      }

      // Build comprehensive report for all equipment
      let equipmentTableHtml = '';
      let totalAllItems = 0;
      let totalAllBorrowed = 0;
      let totalAllAvailable = 0;
      let totalAllUnavailable = 0;

      snapshots.forEach(snapshot => {
        const equipmentItems = allItems.filter(item => item.equipment_id === snapshot.equipment_id);
        let available = 0, borrowed = 0, unavailable = 0;
        
        equipmentItems.forEach(item => {
          const cond = item.condition || 'Good';
          if (['Damaged', 'Missing', 'Under Repair'].includes(cond)) {
            unavailable += 1;
          } else if (item.isBorrowed) {
            borrowed += 1;
          } else {
            available += 1;
          }
        });

        totalAllItems += equipmentItems.length;
        totalAllBorrowed += borrowed;
        totalAllAvailable += available;
        totalAllUnavailable += unavailable;

        const labName = snapshot.laboratory?.name || 'Unknown Lab';
        const equipName = snapshot.equipment?.name || 'Unknown Equipment';

        equipmentTableHtml += `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">${equipName}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${labName}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${equipmentItems.length}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #4caf50; font-weight: bold;">${available}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #ff9800; font-weight: bold;">${borrowed}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #d32f2f; font-weight: bold;">${unavailable}</td>
          </tr>
        `;
      });

      // Build detailed units section
      let detailedUnitsHtml = '';
      snapshots.forEach(snapshot => {
        const equipmentItems = allItems.filter(item => item.equipment_id === snapshot.equipment_id);
        if (equipmentItems.length === 0) return;

        const equipName = snapshot.equipment?.name || 'Unknown Equipment';
        detailedUnitsHtml += `
          <div style="margin-top: 20px; page-break-inside: avoid;">
            <h4 style="color: #8b0000; margin-bottom: 10px; border-bottom: 2px solid #8b0000; padding-bottom: 8px;">${equipName}</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background-color: #e0e0e0;">
                  <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Unit ID</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Condition</th>
                  <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${equipmentItems.map((item, idx) => {
                  const cond = item.condition || 'Good';
                  const status = ['Damaged', 'Missing', 'Under Repair'].includes(cond) 
                    ? 'UNAVAILABLE' 
                    : item.isBorrowed ? 'BORROWED' : 'AVAILABLE';
                  const statusColor = status === 'AVAILABLE' ? '#4caf50' : status === 'BORROWED' ? '#ff9800' : '#d32f2f';
                  return `
                    <tr style="${idx % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
                      <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; font-weight: bold;">${item.unit_id}</td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${cond}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: white; background-color: ${statusColor}; font-weight: bold;">${status}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      });

      const html = `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Daily Inventory Detailed Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #8b0000;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          color: #8b0000;
        }
        .header p {
          margin: 5px 0;
          font-size: 14px;
        }
        .report-info {
          background-color: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #8b0000;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .report-info p {
          margin: 8px 0;
          font-size: 13px;
          color: #333;
        }
        .report-info strong {
          color: #8b0000;
          font-weight: 600;
        }
        .summary-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .summary-card {
          padding: 15px;
          background-color: #f5f5f5;
          border-left: 4px solid #8b0000;
          border-radius: 4px;
          text-align: center;
        }
        .summary-card h4 {
          margin: 0 0 10px 0;
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }
        .summary-value {
          font-size: 32px;
          font-weight: bold;
          color: #8b0000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        table thead {
          background-color: #8b0000;
          color: white;
        }
        table th {
          padding: 12px;
          text-align: left;
          border: 1px solid #ddd;
          font-weight: 600;
        }
        table td {
          padding: 10px;
          border: 1px solid #ddd;
        }
        table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        h3 {
          color: #8b0000;
          margin-top: 30px;
          margin-bottom: 15px;
          border-bottom: 2px solid #8b0000;
          padding-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Daily Inventory Detailed Report</h1>
        <p><strong>Inventory Date:</strong> ${reportDate}</p>
        <p><strong>Generated:</strong> ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}</p>
      </div>

      <div class="report-info">
        <p><strong>Report Type:</strong> Daily Inventory Detailed Report</p>
        <p><strong>Report Date:</strong> ${reportDate}</p>
        <p><strong>Total Equipment:</strong> ${snapshots.length}</p>
        <p><strong>Generated:</strong> ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}</p>
      </div>

      <div style="background-color: #fff3e0; border: 2px solid #8b0000; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #8b0000;">Overall Summary</h2>
        <div class="summary-section">
          <div class="summary-card">
            <h4>Total Items</h4>
            <div class="summary-value">${totalAllItems}</div>
          </div>
          <div class="summary-card" style="border-left-color: #4caf50;">
            <h4>Available</h4>
            <div class="summary-value" style="color: #4caf50;">${totalAllAvailable}</div>
          </div>
          <div class="summary-card" style="border-left-color: #ff9800;">
            <h4>Borrowed</h4>
            <div class="summary-value" style="color: #ff9800;">${totalAllBorrowed}</div>
          </div>
          <div class="summary-card" style="border-left-color: #d32f2f;">
            <h4>Unavailable</h4>
            <div class="summary-value" style="color: #d32f2f;">${totalAllUnavailable}</div>
          </div>
        </div>
      </div>

      <h3>Equipment Summary</h3>
      <table>
        <thead>
          <tr>
            <th>Equipment Name</th>
            <th>Laboratory</th>
            <th style="text-align: center;">Total</th>
            <th style="text-align: center;">Available</th>
            <th style="text-align: center;">Borrowed</th>
            <th style="text-align: center;">Unavailable</th>
          </tr>
        </thead>
        <tbody>
          ${equipmentTableHtml}
        </tbody>
      </table>

      <h3>Detailed Unit Inventory</h3>
      ${detailedUnitsHtml}

      <div class="footer">
        <p>This is an automated report generated by the Inventory Management System</p>
      </div>
    </body>
    </html>`;

      const w = window.open('', '_blank');
      if (!w) {
        alert('Popup blocked. Please enable popups for this site.');
        return;
      }
      
      writePrintDocument(w, html);
      setTimeout(() => {
        w.focus();
        w.print();
      }, 500);
    } catch (err) {
      console.error('Failed to print detailed inventory', err);
      alert('Failed to generate detailed inventory report');
    }
  };

  const handlePrintOverallSnapshot = async () => {
    try {
      if (snapshots.length === 0) {
        alert('No snapshots available to print');
        return;
      }

      const snapshotDate = format(new Date(selectedDate), 'MMMM dd, yyyy');
      let totalItems = 0;
      let totalBorrowed = 0;
      let totalAvailable = 0;
      let groupedByLab = {};

      // Fetch all items for detailed view
      let allItems = [];
      try {
        const { data } = await axiosClient.get('/item');
        allItems = data.data || [];
      } catch (e) {
        console.error('Failed to load items', e);
      }

      // Group snapshots by laboratory
      snapshots.forEach(snapshot => {
        const labName = snapshot.laboratory?.name || 'Unknown Lab';
        if (!groupedByLab[labName]) {
          groupedByLab[labName] = [];
        }
        groupedByLab[labName].push(snapshot);
        
        totalItems += snapshot.total_items;
        totalBorrowed += snapshot.borrowed_count;
        totalAvailable += snapshot.available_count;
      });

      // Build comprehensive HTML
      let detailsHtml = '';
      Object.entries(groupedByLab).forEach(([labName, labSnapshots]) => {
        detailsHtml += `
          <div style="margin-top: 30px; page-break-inside: avoid;">
            <h3 style="color: #8b0000; border-bottom: 2px solid #8b0000; padding-bottom: 10px;">${labName}</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #8b0000; color: white;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Equipment</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Total</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Available</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Borrowed</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Unavailable</th>
                </tr>
              </thead>
              <tbody>
                ${labSnapshots.map((snap, idx) => {
                  const equipmentItems = allItems.filter(item => item.equipment_id === snap.equipment_id);
                  let available = 0, borrowed = 0, unavailable = 0;
                  equipmentItems.forEach(item => {
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
                    <tr style="${idx % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
                      <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">${snap.equipment?.name || 'N/A'}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${snap.total_items}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #4caf50; font-weight: bold;">${available}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #ff9800; font-weight: bold;">${snap.borrowed_count}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #d32f2f; font-weight: bold;">${unavailable}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div style="margin-top: 15px;">
              <h4 style="color: #8b0000; margin-bottom: 10px;">Detailed Unit Breakdown:</h4>
              ${labSnapshots.map(snap => {
                const equipmentItems = allItems.filter(item => item.equipment_id === snap.equipment_id);
                if (equipmentItems.length === 0) return '';
                
                return `
                  <div style="margin-bottom: 15px; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
                    <strong>${snap.equipment?.name}</strong>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px;">
                      <thead>
                        <tr style="background-color: #e0e0e0;">
                          <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Unit ID</th>
                          <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Condition</th>
                          <th style="padding: 6px; text-align: center; border: 1px solid #ddd;">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${equipmentItems.map((item, idx) => {
                          const cond = item.condition || 'Good';
                          const status = ['Damaged', 'Missing', 'Under Repair'].includes(cond) 
                            ? 'UNAVAILABLE' 
                            : item.isBorrowed ? 'BORROWED' : 'AVAILABLE';
                          const statusColor = status === 'AVAILABLE' ? '#4caf50' : status === 'BORROWED' ? '#ff9800' : '#d32f2f';
                          return `
                            <tr>
                              <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace; font-size: 11px;">${item.unit_id}</td>
                              <td style="padding: 6px; border: 1px solid #ddd; font-size: 11px;">${cond}</td>
                              <td style="padding: 6px; border: 1px solid #ddd; text-align: center; color: white; background-color: ${statusColor}; font-weight: bold; font-size: 11px;">${status}</td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      });

      const html = `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Overall Daily Inventory Snapshot</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #8b0000;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          color: #8b0000;
        }
        .header p {
          margin: 5px 0;
          font-size: 14px;
        }
        .report-info {
          background-color: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #8b0000;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .report-info p {
          margin: 8px 0;
          font-size: 13px;
          color: #333;
        }
        .report-info strong {
          color: #8b0000;
          font-weight: 600;
        }
        .summary-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .summary-card {
          padding: 15px;
          background-color: #f5f5f5;
          border-left: 4px solid #8b0000;
          border-radius: 4px;
          text-align: center;
        }
        .summary-card h4 {
          margin: 0 0 10px 0;
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }
        .summary-value {
          font-size: 32px;
          font-weight: bold;
          color: #8b0000;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        h3 {
          color: #8b0000;
          border-bottom: 2px solid #8b0000;
          padding-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Overall Daily Inventory Snapshot Report</h1>
        <p><strong>Inventory Date:</strong> ${snapshotDate}</p>
        <p><strong>Generated:</strong> ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}</p>
      </div>

      <div class="report-info">
        <p><strong>Report Type:</strong> Overall Daily Inventory Snapshot</p>
        <p><strong>Snapshot Date:</strong> ${snapshotDate}</p>
        <p><strong>Total Laboratories:</strong> ${Object.keys(groupedByLab).length}</p>
        <p><strong>Total Equipment Items:</strong> ${snapshots.length}</p>
        <p><strong>Generated:</strong> ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}</p>
      </div>

      <div style="background-color: #fff3e0; border: 2px solid #8b0000; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #8b0000;">Overall Summary</h2>
        <div class="summary-section">
          <div class="summary-card">
            <h4>Total Items</h4>
            <div class="summary-value">${totalItems}</div>
          </div>
          <div class="summary-card" style="border-left-color: #4caf50;">
            <h4>Available</h4>
            <div class="summary-value" style="color: #4caf50;">${totalAvailable}</div>
          </div>
          <div class="summary-card" style="border-left-color: #ff9800;">
            <h4>Borrowed</h4>
            <div class="summary-value" style="color: #ff9800;">${totalBorrowed}</div>
          </div>
          <div class="summary-card" style="border-left-color: #d32f2f;">
            <h4>Utilization</h4>
            <div class="summary-value" style="color: #d32f2f;">${totalItems > 0 ? ((totalBorrowed / totalItems) * 100).toFixed(1) : 0}%</div>
          </div>
        </div>
      </div>

      ${detailsHtml}

      <div class="footer">
        <p>This is an automated report generated by the Inventory Management System</p>
      </div>
    </body>
    </html>`;

      const w = window.open('', '_blank');
      if (!w) {
        alert('Popup blocked. Please enable popups for this site.');
        return;
      }
      
      writePrintDocument(w, html);
      setTimeout(() => {
        w.focus();
        w.print();
      }, 500);
    } catch (err) {
      console.error('Failed to print overall snapshot', err);
      alert('Failed to generate overall print report');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        gap: 2,
        mb: 3,
      }}>
        <Typography variant="h6" fontWeight="bold">
          Daily Inventory Snapshots
        </Typography>
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          '& > button': { flex: { xs: '1 1 100%', sm: '1 1 auto', md: 'initial' } },
        }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={loading || snapshots.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrintDetailedInventory}
            disabled={loading || snapshots.length === 0}
            sx={{ bgcolor: 'maroon', '&:hover': { bgcolor: 'darkred' }, mr: 1 }}
          >
            Print Detailed Report
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrintOverallSnapshot}
            disabled={loading || snapshots.length === 0}
            sx={{ bgcolor: 'maroon', '&:hover': { bgcolor: 'darkred' } }}
          >
            Print Overall Report
          </Button>
        </Box>
      </Box>

      {error && <Alert severity={error.includes('successfully') ? 'success' : 'error'} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Laboratory</InputLabel>
              <Select
                value={selectedLab}
                label="Laboratory"
                onChange={(e) => setSelectedLab(e.target.value)}
              >
                <MenuItem value="">All Laboratories</MenuItem>
                {laboratories.map(lab => (
                  <MenuItem key={lab.id} value={lab.id}>{lab.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              fullWidth
              onClick={fetchSnapshots}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Load Report'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              color="success"
              fullWidth
              onClick={handleTriggerSnapshot}
              disabled={loading}
            >
              Post Snapshot
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Snapshots Table */}
      {snapshots.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary }}>
            Daily Inventory Snapshots
          </Typography>
          <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? '#424242' : '#f5f5f5' }}>
                <TableCell><strong>Snapshot Date</strong></TableCell>
                <TableCell><strong>Laboratory</strong></TableCell>
                <TableCell><strong>Equipment</strong></TableCell>
                <TableCell align="right"><strong>Total</strong></TableCell>
                <TableCell align="right"><strong>Borrowed</strong></TableCell>
                <TableCell align="right"><strong>Available</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {snapshots.map((snapshot, idx) => (
                <TableRow key={idx}>
                  <TableCell>{format(new Date(snapshot.snapshot_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{snapshot.laboratory?.name || 'N/A'}</TableCell>
                  <TableCell>{snapshot.equipment?.name || 'N/A'}</TableCell>
                  <TableCell align="right">
                    <Chip label={snapshot.total_items} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={snapshot.borrowed_count} size="small" color="warning" />
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={snapshot.available_count} size="small" color="success" />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Print Report">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handlePrintSnapshot(snapshot)}
                      >
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Equipment Trend removed */}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Snapshot Settings</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <TextField
            label="Daily Snapshot Time"
            type="time"
            value={tempTime}
            onChange={(e) => setTempTime(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveSettings} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});
