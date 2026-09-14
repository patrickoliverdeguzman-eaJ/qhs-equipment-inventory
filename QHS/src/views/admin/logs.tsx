import React, { useEffect, useState } from 'react';
import axiosClient from '../../axiosClient';
import { writePrintDocument } from '../../printDocument';
import * as Mui from '../../assets/muiImports';
import Grid from '@mui/material/Grid';
import PageHeader from '../../Components/PageHeader';
import { EmptyState, SectionCard } from '../../Components/WorkspaceUI';

interface LogMeta extends Record<string, unknown> {
  transaction_borrower?: string;
  transaction_id?: string | number;
  equipment_name?: string;
  equipment_id?: string | number;
  category_name?: string;
  category_id?: string | number;
}

interface LogEntry {
  id: number;
  user?: { name?: string } | null;
  friendly_message?: string;
  action: string;
  route?: string;
  meta?: LogMeta | string | null;
  meta_summary?: string | null;
  created_at: string;
}

function readMeta(log: LogEntry): LogMeta | string | null {
  if (log.meta) return log.meta;
  if (!log.meta_summary) return null;

  try {
    return JSON.parse(log.meta_summary) as LogMeta | string;
  } catch {
    return log.meta_summary;
  }
}

function formatLogMeta(log: LogEntry) {
  const meta = readMeta(log);
  if (!meta) return '';
  if (typeof meta !== 'object') return String(meta);
  if (meta.transaction_borrower || meta.transaction_id) {
    const transactionId = meta.transaction_id || '';
    const borrower = meta.transaction_borrower || '';
    return `Transaction #${transactionId}${borrower ? ` — ${borrower}` : ''}`;
  }
  if (meta.equipment_name || meta.equipment_id) return meta.equipment_name || `Equipment #${meta.equipment_id}`;
  if (meta.category_name || meta.category_id) return meta.category_name || `Category #${meta.category_id}`;
  return JSON.stringify(meta);
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
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
      const { data } = await axiosClient.get<{ data?: LogEntry[] }>(`/logs?${buildQuery(p)}`);
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

    const rowsHtml = logs.map(l => `
      <tr>
        <td>${l.id}</td>
        <td>${l.user ? l.user.name : 'System'}</td>
        <td>${l.friendly_message || l.action}</td>
        <td>${l.route}</td>
        <td>${formatLogMeta(l)}</td>
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
    <Mui.Box>
      <PageHeader
        eyebrow="Audit trail"
        title="Activity logs"
        description="Review important actions performed by staff and the system."
        actions={<Mui.Button variant="outlined" onClick={handlePrint} disabled={logs.length === 0}>Print current page</Mui.Button>}
      />

      <SectionCard sx={{ mb: 2.5 }}>
        <Grid container spacing={2} alignItems="center" sx={{ p: 2 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Mui.TextField fullWidth label="From" type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Mui.TextField fullWidth label="To" type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Mui.Box sx={{ display: 'flex', gap: 1, justifyContent: { md: 'flex-end' } }}>
              <Mui.Button variant="outlined" color="inherit" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Mui.Button>
              <Mui.Button variant="contained" onClick={() => fetchLogs(1)}>Apply dates</Mui.Button>
            </Mui.Box>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard>
      {loading ? (
        <Mui.Box sx={{ display: 'grid', minHeight: 280, placeItems: 'center' }}><Mui.CircularProgress /></Mui.Box>
      ) : logs.length === 0 ? (
        <EmptyState title="No activity found" description="Try a wider date range or return later after staff actions have been recorded." />
      ) : (
        <Mui.TableContainer sx={{ border: 0, borderRadius: 0 }}>
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
                    {formatLogMeta(l)}
                  </Mui.TableCell>
                  <Mui.TableCell>{new Date(l.created_at).toLocaleString()}</Mui.TableCell>
                </Mui.TableRow>
              ))}
            </Mui.TableBody>
          </Mui.Table>
        </Mui.TableContainer>
      )}
      </SectionCard>
      <Mui.Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 2 }}>
        <Mui.Button variant="outlined" color="inherit" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Mui.Button>
        <Mui.Typography variant="body2" color="text.secondary">Page {page}</Mui.Typography>
        <Mui.Button variant="outlined" color="inherit" disabled={logs.length < 25} onClick={() => setPage((current) => current + 1)}>Next</Mui.Button>
      </Mui.Box>
    </Mui.Box>
  );
}
