// src/views/admin/laboratories.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosClient, { assetUrl } from "../../axiosClient";

import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  CardActionArea,
  CardActions,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import PageHeader from "../../Components/PageHeader";

export default function Laboratories() {
  const [laboratories, setLaboratories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dialog state
  const [open, setOpen] = useState(false);
  const [labToDelete, setLabToDelete] = useState(null);

  // Fetch labs
  const fetchLabs = () => {
    setLoading(true);
    setError('');
    axiosClient
      .get("/laboratories")
      .then(({ data }) => {
        setLaboratories(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch labs:", err);
        setError('Laboratories could not be loaded. Please try again.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  // Open delete dialog
  const handleDeleteClick = (lab) => {
    setLabToDelete(lab);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setLabToDelete(null);
  };

  // DELETE the lab
  const confirmDelete = () => {
    if (!labToDelete) return;

    axiosClient
      .delete(`/laboratories/${labToDelete.id}`)
      .then(() => {
        fetchLabs();
        handleClose();
      })
      .catch((err) => {
        console.error("Delete failed:", err.response?.data || err.message);
        setError(err.response?.data?.message || 'The laboratory could not be deleted.');
        handleClose();
      });
  };

  return (
    <>
      <Box>
        <PageHeader
          eyebrow="Facilities"
          title="Laboratories"
          description="Browse laboratory spaces, manage their details, and review assigned equipment."
          actions={(
            <Button component={Link} to="new" variant="contained" startIcon={<AddIcon />}>
              Add laboratory
            </Button>
          )}
        />

        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

        {/* Labs Grid */}
        <Box sx={{ boxShadow: "none", mt: 2 }}>
          {loading ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : laboratories.length === 0 ? (
            <Paper sx={{ textAlign: 'center', p: { xs: 4, sm: 7 } }}>
              <ScienceOutlinedIcon color="disabled" sx={{ fontSize: 48, mb: 1.5 }} />
              <Typography variant="body1" color="text.secondary">
                No laboratories have been added yet.
              </Typography>
              <Button component={Link} to="new" variant="outlined" sx={{ mt: 2 }}>Add the first laboratory</Button>
            </Paper>
          ) : (
            <Grid container spacing={{ xs: 2, md: 2.5 }}>
              {laboratories.map((lab) => (
                <Grid item xs={12} sm={6} lg={4} xl={3} key={lab.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.2s, transform 0.2s',
                      '&:hover': {
                        borderColor: 'primary.light',
                        transform: 'translateY(-2px)',
                      },
                    }}
                    elevation={0}
                  >
                    <CardActionArea
                      component={Link}
                      to={`${lab.name}/${lab.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Box sx={{
                        height: 168,
                        overflow: 'hidden',
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        background: '#fafaff',
                      }}>
                        <CardMedia
                          component="img"
                          height="168"
                          image={
                            lab.gallery
                              ? assetUrl(`/storage/${lab.gallery}`)
                              : assetUrl('/storage/gallery/default_image.jpg')
                          }
                          alt={lab.name}
                          sx={{
                            objectFit: 'cover',
                            width: '100%',
                            height: '100%',
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                          }}
                        />
                      </Box>
                      <CardContent sx={{ p: 2.25 }}>
                        <Typography
                          gutterBottom
                          variant="h6"
                          sx={{
                            color: "text.primary",
                          }}
                        >
                          {lab.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
                        >
                          ID: {lab.id}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary", wordBreak: "break-word" }}
                        >
                          {lab.location}
                        </Typography>
                      </CardContent>
                      <Divider />
                    </CardActionArea>
                    <CardActions sx={{ justifyContent: "flex-end" }}>
                      <Link to={`${lab.id}`} style={{ textDecoration: "none" }}>
                        <Button size="small" color="primary">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(lab)}
                      >
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle sx={{ color: "error.main" }}>Delete Laboratory</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the laboratory{" "}
            <strong>{labToDelete?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" autoFocus>
            Delete laboratory
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
