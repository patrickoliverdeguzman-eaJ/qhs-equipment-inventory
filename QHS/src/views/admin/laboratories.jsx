// src/views/admin/laboratories.jsx
import React, { useState, useEffect } from "react";
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
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export default function Laboratories() {
  const [laboratories, setLaboratories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [labToDelete, setLabToDelete] = useState(null);

  // Fetch labs
  const fetchLabs = () => {
    setLoading(true);
    axiosClient
      .get("/laboratories")
      .then(({ data }) => {
        setLaboratories(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch labs:", err);
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
        alert("Failed to delete laboratory. Check console for details.");
        handleClose();
      });
  };

  return (
    <>
      <Box sx={{ p: 0 }}>
        {/* Header */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: "white" }}>
                  <Typography variant="h5" sx={{ color: "maroon" }}>
                    List of Laboratories
                  </Typography>
                  <Typography variant="body2" sx={{ color: "gray" }}>
                    Browse and manage the available laboratories.
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ backgroundColor: "white" }}>
                  <Link to="new" style={{ textDecoration: "none" }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      sx={{
                        backgroundColor: "white",
                        color: "maroon",
                        "&:hover": { backgroundColor: "#f5f5f5" },
                      }}
                    >
                      Add new Laboratory
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            </TableHead>
          </Table>
        </TableContainer>

        {/* Labs Grid */}
        <Box sx={{ boxShadow: "none", mt: 2 }}>
          {loading ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : laboratories.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography variant="body1" color="text.secondary">
                No laboratories found.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ p: 3 }}>
              {laboratories.map((lab) => (
                <Grid item xs={12} sm={6} md={3} key={lab.id}>
                  <Card
                    sx={{
                      maxWidth: 320,
                      height: 320,
                      borderRadius: 3,
                      boxShadow: '0 4px 16px rgba(80,80,80,0.12)',
                      background: 'linear-gradient(135deg, #fff 80%, #f5f5fa 100%)',
                      transition: 'box-shadow 0.3s, transform 0.3s',
                      '&:hover': {
                        boxShadow: '0 8px 24px rgba(80,80,80,0.18)',
                        transform: 'translateY(-4px) scale(1.03)',
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
                        height: 140,
                        overflow: 'hidden',
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        background: '#fafaff',
                      }}>
                        <CardMedia
                          component="img"
                          height="140"
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
                      <CardContent sx={{ p: 2, height: 81 }}>
                        <Typography
                          gutterBottom
                          variant="h5"
                          sx={{
                            height: "33px",
                            overflow: "hidden",
                            color: "maroon",
                          }}
                        >
                          {lab.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: '#888', display: 'block', mt: 0.5 }}
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
                          EDIT
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
          <Button onClick={handleClose}>No</Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
