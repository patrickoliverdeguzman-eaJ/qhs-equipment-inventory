import { useEffect, useState } from 'react';
import axiosClient from '../axiosClient';
import { useStateContext } from '../Context/ContextProvider';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import UndoIcon from '@mui/icons-material/Undo';
import { useNavigate } from 'react-router-dom';

export default function BorrowHistory() {
  const { user, token } = useStateContext();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    fetchTransactions();

    // Listen for transaction updates from other components
    const handleTransactionUpdate = () => {
      fetchTransactions();
    };

    window.addEventListener('transactionUpdated', handleTransactionUpdate);

    // Set up Reverb listener for real-time updates if Echo is available
    if (window.Echo) {
      try {
        window.Echo.private(`transactions.user.${user.id}`)
          .listen('.transaction.updated', () => {
            fetchTransactions();
          });
      } catch { /* Polling remains available. */ }
    }

    // Auto-refresh every 10 seconds for fallback
    const interval = setInterval(() => {
      fetchTransactions();
    }, 10000);

    return () => {
      window.removeEventListener('transactionUpdated', handleTransactionUpdate);
      clearInterval(interval);
      if (window.Echo) {
        try {
          window.Echo.leave(`transactions.user.${user.id}`);
        } catch { /* The connection may already be closed. */ }
      }
    };
  }, [token, user?.id, navigate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/transactions');
      const allTransactions = response.data.data || response.data || [];
      // Server now filters transactions by borrower_id for regular users
      setTransactions(allTransactions);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.response?.data?.message || 'Failed to fetch borrow history');
    } finally {
      setLoading(false);
    }
  };

  // Categorize transactions
  const pendingRequests = transactions.filter(t => t.status?.toLowerCase() === 'pending');
  const borrowedItems = transactions.filter(t => t.status?.toLowerCase() === 'accepted' || t.status?.toLowerCase() === 'borrowed');
  const returnedItems = transactions.filter(t => t.status?.toLowerCase() === 'returned' || t.status?.toLowerCase() === 'completed');
  const rejectedItems = transactions.filter(t => t.status?.toLowerCase() === 'rejected');

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <HourglassTopIcon sx={{ color: 'warning.main', fontSize: 20 }} />;
      case 'accepted':
      case 'borrowed':
        return <LocalShippingIcon sx={{ color: 'info.main', fontSize: 20 }} />;
      case 'returned':
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'accepted':
      case 'borrowed':
        return 'info';
      case 'returned':
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const calculateDaysActive = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return days;
  };

  const TransactionTable = ({ data, emptyMessage, tab }) => {
    return data.length === 0 ? (
      <Card
        sx={{
          borderRadius: '12px',
          textAlign: 'center',
          py: 6,
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          border: '1px dashed rgba(0, 0, 0, 0.1)',
        }}
      >
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500, mb: 1 }}>
          {emptyMessage}
        </Typography>
      </Card>
    ) : (
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(128, 0, 0, 0.04)' }}>
              <TableCell sx={{ fontWeight: 700, color: '#800000' }}>Request ID</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#800000' }}>Laboratory</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#800000' }}>Items</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#800000' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#800000' }}>Request Date</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#800000' }}>Return Date</TableCell>
              {tab !== 'pending' && (
                <TableCell sx={{ fontWeight: 700, color: '#800000' }}>Processed By</TableCell>
              )}
              {tab === 'rejected' && (
                <TableCell sx={{ fontWeight: 700, color: '#800000' }}>Reason</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((transaction, index) => {
              const processedBy =
                tab === 'borrowed' ? transaction.accepted_by_name
                  : tab === 'returned' ? transaction.returned_by_name
                    : tab === 'rejected' ? transaction.rejected_by_name
                      : null;

              return (
                <TableRow
                  key={transaction.id || index}
                  sx={{
                    '&:hover': {
                      bgcolor: 'rgba(128, 0, 0, 0.02)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <TableCell sx={{ fontWeight: 600, color: '#800000' }}>
                    #{transaction.id}
                  </TableCell>
                  <TableCell>
                    {transaction.laboratory?.name || transaction.laboratory_id || 'Unknown Lab'}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      {transaction.equipment && transaction.equipment.length > 0 ? (
                        transaction.equipment.map((eq, idx) => (
                          <Typography key={idx} variant="body2">
                            {eq.name || 'Item'} <Chip label={`x${eq.quantity || 1}`} size="small" variant="outlined" sx={{ ml: 1 }} />
                          </Typography>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">No items</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={transaction.status || 'Pending'}
                      color={getStatusColor(transaction.status)}
                      icon={getStatusIcon(transaction.status)}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        minWidth: 120,
                        justifyContent: 'center',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(transaction.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {transaction.returned_at ? (
                      <Typography variant="body2">
                        {formatDate(transaction.returned_at)}
                      </Typography>
                    ) : transaction.status?.toLowerCase() === 'accepted' || transaction.status?.toLowerCase() === 'borrowed' ? (
                      <Typography variant="body2" color="text.secondary">
                        {calculateDaysActive(transaction.created_at)} days
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  {tab !== 'pending' && (
                    <TableCell>
                      {processedBy ? (
                        <Typography variant="body2" fontWeight={500}>
                          {tab === 'borrowed' && `Accepted by ${processedBy}`}
                          {tab === 'returned' && `Marked as returned by ${processedBy}`}
                          {tab === 'rejected' && `Rejected by ${processedBy}`}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  )}
                  {tab === 'rejected' && (
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" color={transaction.rejection_reason ? 'error' : 'text.secondary'} sx={{ wordBreak: 'break-word' }}>
                        {transaction.rejection_reason || '—'}
                      </Typography>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'rgba(0, 0, 0, 0.01)', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            fontWeight="700"
            sx={{
              color: '#800000',
              mb: 1,
            }}
          >
            Borrow History
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              fontSize: '0.95rem',
            }}
          >
            Track your equipment requests, current borrowings, and returns
          </Typography>
        </Box>

        {/* Summary Cards */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Card sx={{ flex: 1, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 193, 7, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Typography variant="h6" sx={{ color: '#ffc107', fontWeight: 700 }}>
                  {pendingRequests.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  PENDING
                </Typography>
                <Typography variant="h6" fontWeight="700">
                  Current Requests
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'rgba(33, 150, 243, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 700 }}>
                  {borrowedItems.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  BORROWED
                </Typography>
                <Typography variant="h6" fontWeight="700">
                  Currently in Use
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700 }}>
                  {returnedItems.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  RETURNED
                </Typography>
                <Typography variant="h6" fontWeight="700">
                  History
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Stack>

        {/* Error State */}
        {error && (
          <Alert
            severity="error"
            sx={{
              borderRadius: '12px',
              mb: 3,
              bgcolor: 'rgba(244, 67, 54, 0.08)',
              color: '#d32f2f',
              border: '1px solid rgba(244, 67, 54, 0.2)',
            }}
          >
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#800000' }} />
          </Box>
        ) : (
          <>
            {/* Tabs */}
            <Paper sx={{ borderRadius: '12px', mb: 3, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    textTransform: 'none',
                    minHeight: 60,
                    color: 'text.secondary',
                    '&.Mui-selected': {
                      color: '#800000',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#800000',
                    height: 3,
                  },
                }}
              >
                <Tab label={`Pending (${pendingRequests.length})`} />
                <Tab label={`Borrowed (${borrowedItems.length})`} />
                <Tab label={`Returned (${returnedItems.length})`} />
                <Tab label={`Rejected (${rejectedItems.length})`} />
              </Tabs>
            </Paper>

            {/* Tab Content */}
            <Box>
              {tabValue === 0 && (
                <TransactionTable
                  data={pendingRequests}
                  emptyMessage="No pending requests"
                  tab="pending"
                />
              )}
              {tabValue === 1 && (
                <TransactionTable
                  data={borrowedItems}
                  emptyMessage="No items currently borrowed"
                  tab="borrowed"
                />
              )}
              {tabValue === 2 && (
                <TransactionTable
                  data={returnedItems}
                  emptyMessage="No returned items yet"
                  tab="returned"
                />
              )}
              {tabValue === 3 && (
                <TransactionTable
                  data={rejectedItems}
                  emptyMessage="No rejected requests"
                  tab="rejected"
                />
              )}
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}
