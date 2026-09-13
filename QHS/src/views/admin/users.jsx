import { useState, useEffect } from "react";
import * as React from "react";
import axiosClient, { assetUrl } from "../../axiosClient";
import moment from "moment";
// UI
import { styled } from "@mui/material/styles";
import TableCell from '@mui/material/TableCell';
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
import ArchiveIcon from '@mui/icons-material/Archive';
import { 
  Box, 
  TextField, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  FormLabel, 
  Avatar, 
  Typography,
  Stack
} from "@mui/material";
import { getInitials } from "../../utils";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PageHeader from "../../Components/PageHeader";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openUserModal, setOpenUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [query, setQuery] = useState("");
  const [userForm, setUserForm] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    role: "",
    avatar: null,
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    getUsers();
  }, []);

  const getUsers = () => {
    setLoading(true);
    axiosClient
      .get("/users")
      .then(({ data }) => {
        setLoading(false);
        setUsers(data.data);
        setFilteredUsers(data.data);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    setFilteredUsers(searchData(users));
    setPage(0);
  }, [query, users]);

  const onDeleteClick = (user) => {
    axiosClient.delete(`users/${user.id}`).then(() => {
      getUsers();
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

  const handleOpenDeleteDialog = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedUser(null);
  };

  const handleOpenUserModal = (user = null) => {
    if (user) {
      setUserForm({
        id: user.id,
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        avatar: user.avatar,
      });
      setAvatarPreview(
        user.avatar ? assetUrl(`/storage/${user.avatar}`) : null
      );
    } else {
      setUserForm({
        id: null,
        name: "",
        email: "",
        password: "",
        role: "",
        avatar: null,
      });
      setAvatarPreview(null);
    }
    setOpenUserModal(true);
  };

  const handleCloseUserModal = () => {
    setOpenUserModal(false);
    setUserForm({
      id: null,
      name: "",
      email: "",
      password: "",
      role: "",
      avatar: null,
    });
    setAvatarPreview(null);
    setErrors(null);
  };

  const handleAvatarChange = (ev) => {
    const file = ev.target.files[0];
    if (file) {
      setUserForm({ ...userForm, avatar: file });
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUserFormChange = (e) => {
    setUserForm({
      ...userForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleUserFormSubmit = async (ev) => {
    ev.preventDefault();
    const formData = new FormData();

    formData.append("name", userForm.name);
    formData.append("email", userForm.email);
    formData.append("role", userForm.role);

    if (userForm.password) {
      formData.append("password", userForm.password);
    }
    if (userForm.avatar instanceof File) {
      formData.append("avatar", userForm.avatar);
    }
    if (!userForm.id) {
      formData.append("isActive", true);
      formData.append("_method", "POST");
    } else {
      formData.append("_method", "PUT");
    }

    try {
      if (userForm.id) {
        await axiosClient.post(`users/${userForm.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axiosClient.post("/users", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      getUsers();
      handleCloseUserModal();
    } catch (err) {
      const response = err.response;
      if (response && response.status === 422) {
        setErrors(response.data.errors);
      } else {
        setErrors({ general: ["An unexpected error occurred. Please try again."] });
      }
    }
  };

  const toggleActiveStatus = (user) => {
    const updatedStatus = !user.isActive;
    axiosClient
      .put(`users/${user.id}`, { isActive: updatedStatus })
      .then(() => {
        const updatedUsers = users.map((u) =>
          u.id === user.id ? { ...u, isActive: updatedStatus } : u
        );
        setUsers(updatedUsers);
        setFilteredUsers(updatedUsers);
      });
  };

  const searchData = (data) => {
    return data.filter(
      (item) =>
        item.name?.toLowerCase().includes(query.toLowerCase()) ||
        item.email?.toLowerCase().includes(query.toLowerCase()) ||
        item.role?.toLowerCase().includes(query.toLowerCase()) ||
        item.id?.toString().includes(query)
    );
  };

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 8)];
    }
    return color;
  };

  const sortedUsers = React.useMemo(() => {
    let sortableUsers = [...filteredUsers];
    if (sortConfig.key !== null) {
      sortableUsers.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableUsers;
  }, [filteredUsers, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Calculate active/inactive counts
  const activeCount = filteredUsers.filter(u => u.isActive).length;
  const inactiveCount = filteredUsers.filter(u => !u.isActive).length;

  return (
    <Box>
      <PageHeader
        eyebrow="Access control"
        title="Users"
        description="Manage registered accounts, roles, and access status."
        actions={(
          <>
          <TextField
            type="text"
            label="Search users"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ minWidth: { sm: 240 } }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenUserModal()}
          >
            Add user
          </Button>
          </>
        )}
      />

      {/* Total Users + Active/Inactive Breakdown */}
      <Box
        sx={{
          mb: 2,
          p: 2,
          backgroundColor: "background.paper",
          border: 1,
          borderColor: 'divider',
          borderRadius: 2.5,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: "bold", fontSize: { xs: "1rem", sm: "1.1rem" } }}>
            Total Users: <strong>{filteredUsers.length}</strong>
            {query && (
              <Typography component="span" sx={{ fontSize: "0.9rem", opacity: 0.9, ml: 1 }}>
                of {users.length}
              </Typography>
            )}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", fontSize: "0.95rem" }}>
          <Typography>
            Active: <strong>{activeCount}</strong>
          </Typography>
          <Typography>
            Inactive: <strong>{inactiveCount}</strong>
          </Typography>
          {loading && (
            <Typography sx={{ fontStyle: "italic", opacity: 0.8 }}>
              Loading...
            </Typography>
          )}
        </Box>
      </Box>

      {/* Table header */}
      <TableContainer component={Paper} elevation={3}>
        <Table sx={{ tableLayout: 'auto', minWidth: { xs: 600, sm: 800 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 50, p: { xs: 0.5, sm: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>ID</span>
                  <IconButton size="small" onClick={() => requestSort('id')}>
                    {sortConfig.key === 'id' && sortConfig.direction === 'asc' ? (
                      <ArrowUpwardIcon fontSize="small" />
                    ) : (
                      <ArrowDownwardIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 60, p: { xs: 0.5, sm: 1 } }}>Avatar</TableCell>
              <TableCell sx={{ minWidth: 120, p: { xs: 0.5, sm: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>NAME</span>
                  <IconButton size="small" onClick={() => requestSort('name')}>
                    {sortConfig.key === 'name' && sortConfig.direction === 'asc' ? (
                      <ArrowUpwardIcon fontSize="small" />
                    ) : (
                      <ArrowDownwardIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 150, p: { xs: 0.5, sm: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>E-MAIL</span>
                  <IconButton size="small" onClick={() => requestSort('email')}>
                    {sortConfig.key === 'email' && sortConfig.direction === 'asc' ? (
                      <ArrowUpwardIcon fontSize="small" />
                    ) : (
                      <ArrowDownwardIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 100, p: { xs: 0.5, sm: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>USER TYPE</span>
                  <IconButton size="small" onClick={() => requestSort('role')}>
                    {sortConfig.key === 'role' && sortConfig.direction === 'asc' ? (
                      <ArrowUpwardIcon fontSize="small" />
                    ) : (
                      <ArrowDownwardIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 120, p: { xs: 0.5, sm: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>CREATED</span>
                  <IconButton size="small" onClick={() => requestSort('created_at')}>
                    {sortConfig.key === 'created_at' && sortConfig.direction === 'asc' ? (
                      <ArrowUpwardIcon fontSize="small" />
                    ) : (
                      <ArrowDownwardIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 120, p: { xs: 0.5, sm: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>UPDATED AT</span>
                  <IconButton size="small" onClick={() => requestSort('updated_at')}>
                    {sortConfig.key === 'updated_at' && sortConfig.direction === 'asc' ? (
                      <ArrowUpwardIcon fontSize="small" />
                    ) : (
                      <ArrowDownwardIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 80, p: { xs: 0.5, sm: 1 } }}>STATUS</TableCell>
              <TableCell sx={{ minWidth: 120, p: { xs: 0.5, sm: 1 } }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      {/* Table body */}
      <TableContainer
        component={Paper}
        elevation={3}
        sx={{
          maxHeight: 'calc(91vh - 200px)',
          overflow: 'auto',
          '&::-webkit-scrollbar': { width: '8px', height: '8px' },
          '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb': { background: 'maroon', borderRadius: '4px', '&:hover': { background: '#600000' } },
          '&::-webkit-scrollbar-button': { display: 'none !important' },
          scrollbarWidth: 'thin',
          scrollbarColor: 'maroon #f1f1f1',
        }}
      >
        <Table sx={{ tableLayout: 'auto', minWidth: { xs: 600, sm: 800 } }}>
          {loading && (
            <TableBody>
              <TableRow>
                <TableCell colSpan={9} align="center">Fetching Data ...</TableCell>
              </TableRow>
            </TableBody>
          )}
          {!loading && (
            <TableBody>
              {sortedUsers.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((u) => (
                <TableRow key={u.id}>
                  <TableCell sx={{ p: { xs: 0.5, sm: 1 } }}>{u.id}</TableCell>
                  <TableCell sx={{ p: { xs: 0.5, sm: 1 } }}>
                    <Avatar
                      src={u.avatar ? assetUrl(`/storage/${u.avatar}`) : undefined}
                      sx={{
                        width: { xs: 36, sm: 44 },
                        height: { xs: 36, sm: 44 },
                        fontSize: { xs: 12, sm: 14 },
                        m: 'auto',
                        backgroundColor: u.avatar ? 'transparent' : getRandomColor(),
                        color: u.avatar ? 'inherit' : 'white'
                      }}
                    >
                      {!u.avatar && getInitials(u.name)}
                    </Avatar>
                  </TableCell>
                  <TableCell sx={{ p: { xs: 0.5, sm: 1 } }}>{u.name}</TableCell>
                  <TableCell sx={{ p: { xs: 0.5, sm: 1 } }}>{u.email}</TableCell>
                  <TableCell sx={{ p: { xs: 0.5, sm: 1 } }}>{u.role}</TableCell>
                  <TableCell sx={{ p: { xs: 0.5, sm: 1 } }}>
                    {moment(u.created_at).format("MM/DD/yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell sx={{ p: { xs: 0.5, sm: 1 } }}>
                    {moment(u.updated_at).format("MM/DD/yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell sx={{ p: { xs: 0.5, sm: 1 } }}>
                    {u.isActive ? (
                      <span style={{ color: 'green', fontWeight: 'bold' }}>Active</span>
                    ) : (
                      <span style={{ color: 'red', fontWeight: 'bold' }}>Inactive</span>
                    )}
                  </TableCell>
                  <TableCell sx={{ p: { xs: 0.5, sm: 1 } }}>
                    <Box sx={{ display: 'flex', gap: { xs: 0.2, sm: 0.5 } }}>
                      <IconButton color="primary" size="small" onClick={() => handleOpenUserModal(u)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        color={u.isActive ? "success" : "error"}
                        size="small"
                        onClick={() => toggleActiveStatus(u)}
                      >
                        <ArchiveIcon fontSize="small" />
                      </IconButton>
                      <IconButton color="error" size="small" onClick={() => handleOpenDeleteDialog(u)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredUsers.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 20, 50, { label: 'All', value: filteredUsers.length }]}
      />

      {/* Delete Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle color="error">USER DELETION</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this user?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>No</Button>
          <Button onClick={() => onDeleteClick(selectedUser)} autoFocus>Yes</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Modal */}
      <Dialog open={openUserModal} onClose={handleCloseUserModal} maxWidth="sm" fullWidth>
        <DialogTitle>{userForm.id ? `Update User: ${userForm.name}` : "Add New User"}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleUserFormSubmit}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <IconButton component="label" sx={{ p: 0, "&:hover": { opacity: 0.8 } }}>
                <Avatar
                  src={avatarPreview || '/path/to/default-avatar.png'}
                  sx={{ width: { xs: 80, sm: 100 }, height: { xs: 80, sm: 100 }, mb: 2 }}
                />
                <CameraAltIcon sx={{
                  position: "absolute", bottom: 10, right: 10,
                  color: "white", backgroundColor: "rgba(0,0,0,0.5)",
                  borderRadius: "50%", padding: 1
                }} />
                <input type="file" onChange={handleAvatarChange} accept="image/*" style={{ display: "none" }} />
              </IconButton>
            </div>
            <TextField autoFocus margin="dense" name="name" label="Name" fullWidth value={userForm.name} onChange={handleUserFormChange} />
            <TextField margin="dense" name="email" label="Email" type="email" fullWidth value={userForm.email} onChange={handleUserFormChange} disabled={!!userForm.id} />
            <FormControl component="fieldset" sx={{ mt: 2 }}>
              <FormLabel>User Type</FormLabel>
              <RadioGroup row name="role" value={userForm.role} onChange={handleUserFormChange}>
                <FormControlLabel value="admin" control={<Radio />} label="Admin" />
                <FormControlLabel value="custodian" control={<Radio />} label="Custodian" />
                <FormControlLabel value="user" control={<Radio />} label="User" />
              </RadioGroup>
            </FormControl>
            <TextField margin="dense" name="password" label="Password" type="password" fullWidth value={userForm.password} onChange={handleUserFormChange} />
            {errors && (
              <Box sx={{ mt: 1, color: "error.main" }}>
                {Object.keys(errors).map((key) => (
                  <Typography key={key} variant="body2">{errors[key][0]}</Typography>
                ))}
              </Box>
            )}
            <DialogActions>
              <Button onClick={handleCloseUserModal}>Cancel</Button>
              <Button type="submit">{userForm.id ? "Update" : "Save"}</Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
