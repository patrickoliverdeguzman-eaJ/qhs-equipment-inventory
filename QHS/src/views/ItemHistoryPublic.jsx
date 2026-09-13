import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../axiosClient';
import { Box, Typography, Paper, Table, TableContainer, TableHead, TableRow, TableCell, TableBody, CircularProgress } from '@mui/material';

export default function ItemHistoryPublic(){
  const { unitID } = useParams();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState(null);

  useEffect(()=>{
    const fetch = async () => {
      setLoading(true);
      try{
        const { data } = await axiosClient.get(`/item/${unitID}/history`);
        const payload = data.data || {};
        setHistory(payload.history || []);
        setCurrent(payload.current || null);
      }catch(err){
        console.error('Failed to load item history', err);
        setHistory([]);
        setCurrent(null);
      }finally{
        setLoading(false);
      }
    };
    if(unitID) fetch();
  },[unitID]);

  if(loading) return <Box sx={{ display: 'flex', justifyContent:'center', py:6 }}><CircularProgress/></Box>;

  return (
    <Box sx={{ p:3 }}>
      <Paper sx={{ p:2, mb:2 }}>
        <Typography variant="h6">Unit: {current?.unit_id || current?.id}</Typography>
        <Typography>Condition: {current?.condition || '-'}</Typography>
        <Typography>Currently Borrowed: {current?.isBorrowed ? 'Yes' : 'No'}</Typography>
      </Paper>

      <Paper sx={{ p:2 }}>
        <Typography variant="h6" sx={{ mb:2 }}>Borrower History</Typography>
        {history.length === 0 ? (
          <Typography>No history found for this unit.</Typography>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Borrower</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map(h => (
                <TableRow key={h.id}>
                  <TableCell>{new Date(h.borrow_date || h.assigned_at || h.created_at).toLocaleString()}</TableCell>
                  <TableCell>{h.borrower_name || '-'}</TableCell>
                  <TableCell>{h.status}</TableCell>
                  <TableCell>{h.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
