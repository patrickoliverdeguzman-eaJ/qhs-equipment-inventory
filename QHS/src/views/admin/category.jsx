import { useState, useEffect } from "react";
import * as React from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../axiosClient";
import moment from "moment";
// UI
import { styled } from "@mui/material/styles";
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TablePagination from "@mui/material/TablePagination";
import Button from "@mui/material/Button";
import IconButton from '@mui/material/IconButton';
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Box, TextField } from "@mui/material";
import { Avatar, Typography } from "@mui/material";
import { getInitials } from "../../utils";
import PageHeader from "../../Components/PageHeader";

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [query, setQuery] = useState("");
  const [categoryForm, setCategoryForm] = useState({
    id: null,
    name: "",
  });

  useEffect(() => {
    getCategories();
  }, []);

  const getCategories = () => {
    setLoading(true);
    axiosClient
      .get("/categories")
      .then(({ data }) => {
        setLoading(false);
        setCategories(data.data);
        setFilteredCategories(data.data);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const onDeleteClick = (category) => {
    axiosClient.delete(`categories/${category.id}`).then(() => {
      getCategories();
      handleCloseDeleteDialog();
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDeleteDialog = (category) => {
    setSelectedCategory(category);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedCategory(null);
  };

  const handleOpenCategoryModal = (category = null) => {
    if (category) {
      setCategoryForm({
        id: category.id,
        name: category.name,
      });
    } else {
      setCategoryForm({
        id: null,
        name: "",
      });
    }
    setOpenCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setOpenCategoryModal(false);
    setCategoryForm({
      id: null,
      name: "",
    });
  };

  const handleCategoryFormChange = (e) => {
    setCategoryForm({
      ...categoryForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleCategoryFormSubmit = () => {
    if (categoryForm.id) {
      // Update existing category
      axiosClient
        .put(`/categories/${categoryForm.id}`, categoryForm)
        .then(() => {
          getCategories();
          handleCloseCategoryModal();
        })
        .catch((error) => {
          console.error("Error updating category:", error);
        });
    } else {
      // Create new category
      axiosClient
        .post("/categories", categoryForm)
        .then(() => {
          getCategories();
          handleCloseCategoryModal();
        })
        .catch((error) => {
          console.error("Error creating category:", error);
        });
    }
  };

  const searchData = (data) => {
    return data.filter(
      (item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.id.toString().includes(query)
    );
  };

  const searchedCategories = searchData(filteredCategories);

  return (
    <Box>
      <PageHeader
        eyebrow="Catalog"
        title="Equipment categories"
        description="Organize equipment into clear categories for faster browsing and reporting."
        actions={(
          <>
            <TextField
              size="small"
              label="Search categories"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              sx={{ minWidth: { sm: 230 } }}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCategoryModal()}>
              Add category
            </Button>
          </>
        )}
      />

      {/* Table with sticky header */}
      <TableContainer component={Paper} variant="outlined"
      sx={{ 
        maxHeight: 'calc(93vh - 200px)',
       }}>
        <Table aria-label="sticky table" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>NAME</TableCell>
              <TableCell>CREATED</TableCell>
              <TableCell>UPDATED AT</TableCell>
              <TableCell>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          {loading && (
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Fetching Data ...
                </TableCell>
              </TableRow>
            </TableBody>
          )}
          {!loading && (
            <TableBody>
              {searchedCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No categories match your search.
                  </TableCell>
                </TableRow>
              ) : (
                searchedCategories.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{moment(c.created_at).format("MM/DD/yyyy HH:mm:ss")}</TableCell>
                    <TableCell>{moment(c.updated_at).format("MM/DD/yyyy HH:mm:ss")}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: .5 }}>
                        <IconButton
                          color="primary"
                          aria-label="Edit"
                          size="large"
                          onClick={() => handleOpenCategoryModal(c)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          aria-label="Delete"
                          size="large"
                          onClick={() => handleOpenDeleteDialog(c)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          )}
        </Table>
      </TableContainer>
      <TablePagination
          component="div"
          count={searchedCategories.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 20, 50]}
        />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" color="error">
          Delete category?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This permanently removes the category. Equipment using it may need to be reassigned.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => onDeleteClick(selectedCategory)} autoFocus>
            Delete category
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Category Modal */}
      <Dialog
        open={openCategoryModal}
        onClose={handleCloseCategoryModal}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title">
          {categoryForm.id ? "Edit Category" : "Add New Category"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Category Name"
            type="text"
            fullWidth
            value={categoryForm.name}
            onChange={handleCategoryFormChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryModal} color="primary">
            Cancel
          </Button>
          <Button onClick={handleCategoryFormSubmit} variant="contained">
            {categoryForm.id ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
