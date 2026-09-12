import React, { useEffect, useState } from 'react';
import axiosClient from '../../axiosClient';
import { writePrintDocument } from '../../printDocument';
import * as Mui from '../../assets/muiImports';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const buildQuery = (p = 1) => {
    const params = [`per_page=25`, `page=${p}`];
    if (dateFrom) {
      // convert datetime-local (YYYY-MM-DDTHH:MM) to SQL-friendly 'YYYY-MM-DD HH:MM:00'
      params.push(`date_from=${encodeURIComponent(dateFrom.replace('T', ' ') + ':00')}`);
    }
    if (dateTo) {
      params.push(`date_to=${encodeURIComponent(dateTo.replace('T', ' ') + ':00')}`);
    }
    return params.join('&');
  };

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get(`/logs?${buildQuery(p)}`);
      setLogs(data.data || []);
    } catch (e) {
      console.error('Failed to load logs', e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(page); }, [page, dateFrom, dateTo]);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const getMetaDisplay = (l) => {
      const meta = l.meta || (l.meta_summary ? JSON.parse(l.meta_summary) : null);
      if (!meta) return '';
      if (meta.transaction_borrower || meta.transaction_id) {
        const tid = meta.transaction_id || '';
        const borrower = meta.transaction_borrower || '';
        return `Transaction #${tid}${borrower ? ' — ' + borrower : ''}`;
      }
      if (meta.equipment_name || meta.equipment_id) {
        return meta.equipment_name || (`Equipment #${meta.equipment_id}`);
      }
      if (meta.category_name || meta.category_id) {
        return meta.category_name || (`Category #${meta.category_id}`);
      }
      if (typeof meta === 'object') return JSON.stringify(meta);
      return String(meta);
    };

    const rowsHtml = logs.map(l => `
      <tr>
        <td>${l.id}</td>
        <td>${l.user ? l.user.name : 'System'}</td>
        <td>${l.friendly_message || l.action}</td>
        <td>${l.route}</td>
        <td>${getMetaDisplay(l)}</td>
        <td>${new Date(l.created_at).toLocaleString()}</td>
      </tr>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Action Logs</title>
          <style>
            * { margin: 0; padding: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
              padding: 10px;
              zoom: 0.75;
              transform-origin: top left;
            }
            h2 { margin-bottom: 15px; color: #333; font-size: 20px; }
            p { font-size: 12px; color: #666; margin-bottom: 10px; }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              margin-top: 10px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              font-size: 13px;
            }
            thead { background-color: #f5f5f5; }
            th { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
              font-weight: 600;
              color: #333;
              font-size: 12px;
            }
            td { 
              border: 1px solid #ddd; 
              padding: 6px; 
              text-align: left;
              word-wrap: break-word;
              font-size: 12px;
            }
            tbody tr:nth-child(even) { background-color: #fafafa; }
            tbody tr:hover { background-color: #f0f0f0; }
            @media print { 
              body { padding: 5px; zoom: 0.75; }
              table { box-shadow: none; }
              tbody tr:hover { background-color: transparent; }
            }
          </style>
        </head>
        <body>
          <h2>Action Logs Report</h2>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Action</th>
                <th>Route</th>
                <th>Details</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>`;

    writePrintDocument(win, html);
    win.focus();
    win.print();
  };

  return (
    <Mui.Paper sx={{ p: 2 }}>
      <Mui.Typography variant="h6">Action Logs</Mui.Typography>

      <Mui.Box sx={{ display: 'flex', gap: 1, alignItems: 'center', my: 2 }}>
        <Mui.TextField
          label="From"
          type="datetime-local"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <Mui.TextField
          label="To"
          type="datetime-local"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <Mui.Button variant="contained" onClick={() => fetchLogs(1)}>Apply</Mui.Button>
        <Mui.Button variant="outlined" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Mui.Button>
        <Mui.Button variant="outlined" onClick={handlePrint}>Print</Mui.Button>
      </Mui.Box>

      {loading ? (
        <Mui.CircularProgress />
      ) : (
        <Mui.TableContainer>
          <Mui.Table>
            <Mui.TableHead>
              <Mui.TableRow>
                <Mui.TableCell>ID</Mui.TableCell>
                <Mui.TableCell>User</Mui.TableCell>
                <Mui.TableCell>Action</Mui.TableCell>
                <Mui.TableCell>Route</Mui.TableCell>
                <Mui.TableCell>Meta</Mui.TableCell>
                <Mui.TableCell>When</Mui.TableCell>
              </Mui.TableRow>
            </Mui.TableHead>
            <Mui.TableBody>
              {logs.map((l) => (
                <Mui.TableRow key={l.id} hover>
                  <Mui.TableCell>{l.id}</Mui.TableCell>
                  <Mui.TableCell>{l.user ? l.user.name : 'System'}</Mui.TableCell>
                  <Mui.TableCell>{l.friendly_message || l.action}</Mui.TableCell>
                  <Mui.TableCell>{l.route}</Mui.TableCell>
                  <Mui.TableCell>
                    {
                      (() => {
                        const meta = l.meta || (l.meta_summary ? JSON.parse(l.meta_summary) : null);
                        if (!meta) return '';
                        if (meta.transaction_borrower || meta.transaction_id) {
                          const tid = meta.transaction_id || '';
                          const borrower = meta.transaction_borrower || '';
                          return `Transaction #${tid}${borrower ? ' — ' + borrower : ''}`;
                        }
                        if (meta.equipment_name || meta.equipment_id) {
                          return meta.equipment_name || (`Equipment #${meta.equipment_id}`);
                        }
                        if (meta.category_name || meta.category_id) {
                          return meta.category_name || (`Category #${meta.category_id}`);
                        }
                        if (typeof meta === 'object') return JSON.stringify(meta);
                        return String(meta);
                      })()
                    }
                  </Mui.TableCell>
                  <Mui.TableCell>{new Date(l.created_at).toLocaleString()}</Mui.TableCell>
                </Mui.TableRow>
              ))}
            </Mui.TableBody>
          </Mui.Table>
        </Mui.TableContainer>
      )}
    </Mui.Paper>
  );
}
