import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import axiosClient, { assetUrl } from '../axiosClient';
import { useStateContext } from '../Context/ContextProvider';
import { getInitials } from '../utils';
import PageHeader from '../Components/PageHeader';
import { SectionCard, SectionHeading } from '../Components/WorkspaceUI';

export default function Profile() {
  const { user, setUser } = useStateContext();
  const [formData, setFormData] = useState({ name: '', email: '', address: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    setFormData({ name: user.name || '', email: user.email || '', address: user.address || '' });
    setPreviewImage(user.avatar ? assetUrl(`/storage/${user.avatar}`) : null);
  }, [user]);

  useEffect(() => () => {
    if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage);
  }, [previewImage]);

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage);
    setProfileImage(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('email', formData.email);
      payload.append('address', formData.address);
      if (profileImage) payload.append('avatar', profileImage);
      const response = await axiosClient.post('/profile/update', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser(response.data.user);
      setProfileImage(null);
      setSuccessMessage('Your profile details were updated.');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Your profile could not be updated.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    clearMessages();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('The new password and confirmation do not match.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setErrorMessage('Your new password must contain at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await axiosClient.post('/profile/password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        password_confirmation: passwordData.confirmPassword,
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccessMessage('Your password was updated.');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Your password could not be updated.');
    } finally {
      setLoading(false);
    }
  };

  const passwordField = (label, name, key, autoComplete) => (
    <TextField
      fullWidth
      required
      label={label}
      name={name}
      type={showPasswords[key] ? 'text' : 'password'}
      value={passwordData[name]}
      autoComplete={autoComplete}
      onChange={(event) => setPasswordData((current) => ({ ...current, [name]: event.target.value }))}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton edge="end" aria-label={`${showPasswords[key] ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setShowPasswords((current) => ({ ...current, [key]: !current[key] }))}>
              {showPasswords[key] ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <PageHeader eyebrow="Account" title="Profile settings" description="Keep your borrower information accurate and protect access to your account." />

      {successMessage && <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ mb: 2.5 }}>{successMessage}</Alert>}
      {errorMessage && <Alert severity="error" onClose={() => setErrorMessage('')} sx={{ mb: 2.5 }}>{errorMessage}</Alert>}

      <Grid container spacing={2.5} alignItems="flex-start">
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, position: { md: 'sticky' }, top: { md: 96 } }}>
            <Stack alignItems="center" textAlign="center">
              <Box sx={{ position: 'relative' }}>
                <Avatar src={previewImage || undefined} alt={user?.name || 'Profile'} sx={{ width: 112, height: 112, bgcolor: 'primary.main', fontSize: '2rem', fontWeight: 800 }}>
                  {getInitials(user?.name)}
                </Avatar>
                <input id="avatar-input" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleImageSelect} />
                <TooltipUpload />
              </Box>
              <Typography variant="h6" sx={{ mt: 2 }}>{formData.name || 'Your profile'}</Typography>
              <Typography variant="body2" color="text.secondary">{formData.email}</Typography>
              <Divider flexItem sx={{ my: 2.5 }} />
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                Use a clear photo and current address so custodians can identify your requests quickly.
              </Typography>
              {profileImage && <Alert severity="info" sx={{ mt: 2, width: '100%', textAlign: 'left' }}>A new photo is ready to save.</Alert>}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Stack spacing={2.5}>
            <SectionCard component="form" onSubmit={handleProfileUpdate}>
              <SectionHeading icon={<PersonOutlineIcon />} title="Personal information" description="These details appear on your equipment requests." />
              <Stack spacing={2.25} sx={{ p: { xs: 2, sm: 2.5 } }}>
                <TextField fullWidth required label="Full name" value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} autoComplete="name" />
                <TextField fullWidth disabled label="Email address" value={formData.email} helperText="Email changes are managed by your school administrator." />
                <TextField fullWidth label="Address" value={formData.address} onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))} multiline minRows={3} placeholder="Enter your current address" helperText="Required before you can submit an equipment request." />
                <Stack direction="row" justifyContent="flex-end">
                  <Button type="submit" variant="contained" disabled={loading}>{loading ? <CircularProgress size={22} color="inherit" /> : 'Save profile'}</Button>
                </Stack>
              </Stack>
            </SectionCard>

            <SectionCard component="form" onSubmit={handlePasswordUpdate}>
              <SectionHeading icon={<LockOutlinedIcon />} title="Password & security" description="Use a password you do not reuse on another account." />
              <Stack spacing={2.25} sx={{ p: { xs: 2, sm: 2.5 } }}>
                {passwordField('Current password', 'currentPassword', 'current', 'current-password')}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>{passwordField('New password', 'newPassword', 'new', 'new-password')}</Grid>
                  <Grid item xs={12} sm={6}>{passwordField('Confirm new password', 'confirmPassword', 'confirm', 'new-password')}</Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary">Use at least 6 characters. A longer, unique passphrase is safer.</Typography>
                <Stack direction="row" justifyContent="flex-end">
                  <Button type="submit" variant="contained" disabled={loading}>{loading ? <CircularProgress size={22} color="inherit" /> : 'Update password'}</Button>
                </Stack>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}

function TooltipUpload() {
  return (
    <Box component="label" htmlFor="avatar-input" sx={{ position: 'absolute', right: -4, bottom: -4, display: 'grid', width: 40, height: 40, placeItems: 'center', border: '3px solid', borderColor: 'background.paper', borderRadius: 2, bgcolor: 'primary.main', color: 'common.white', cursor: 'pointer', '&:hover': { bgcolor: 'primary.dark' } }}>
      <PhotoCameraOutlinedIcon fontSize="small" />
      <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, p: 0, m: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Choose profile photo</Box>
    </Box>
  );
}
