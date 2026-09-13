import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosClient, { assetUrl } from "../../axiosClient";
import PageHeader from "../../Components/PageHeader";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const emptyLaboratory = {
  id: null,
  name: "",
  location: "",
  description: "",
  gallery: null,
};

export default function LaboratoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [laboratory, setLaboratory] = useState(emptyLaboratory);
  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (!id) return undefined;

    let active = true;
    setLoading(true);
    axiosClient
      .get(`/laboratories/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setLaboratory(data);
        setExistingImage(data.gallery ? assetUrl(`/storage/${data.gallery}`) : null);
      })
      .catch(() => {
        if (active) setErrors({ general: ["The laboratory details could not be loaded."] });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!selectedImage) {
      setPreviewImage(existingImage);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewImage(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [existingImage, selectedImage]);

  const updateField = (field) => (event) => {
    setLaboratory((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => {
      if (!current?.[field]) return current;
      const next = { ...current };
      delete next[field];
      return Object.keys(next).length ? next : null;
    });
  };

  const handleImageSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setSelectedImage(null);
      setErrors((current) => ({
        ...current,
        gallery: ["Choose an image smaller than 4 MB."],
      }));
      event.target.value = "";
      return;
    }

    setSelectedImage(file);
    setErrors((current) => {
      if (!current?.gallery) return current;
      const next = { ...current };
      delete next.gallery;
      return Object.keys(next).length ? next : null;
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors(null);

    const formData = new FormData();
    formData.append("name", laboratory.name.trim());
    formData.append("location", laboratory.location.trim());
    formData.append("description", laboratory.description.trim());

    if (selectedImage) formData.append("gallery", selectedImage);
    if (laboratory.id) formData.append("_method", "PUT");

    try {
      const endpoint = laboratory.id ? `/laboratories/${laboratory.id}` : "/laboratories";
      await axiosClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/admin/lab");
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors || { general: ["Review the form and try again."] });
      } else {
        setErrors({ general: ["The laboratory could not be saved. Please try again."] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const editing = Boolean(laboratory.id);

  return (
    <Box sx={{ width: "100%", maxWidth: 1120, mx: "auto" }}>
      <PageHeader
        eyebrow="Facilities"
        title={editing ? `Edit ${laboratory.name || "laboratory"}` : "Add a laboratory"}
        description={
          editing
            ? "Update the room details and replace its cover image."
            : "Create a clear, recognizable workspace for equipment and inventory records."
        }
        actions={(
          <Button
            component={Link}
            to="/admin/lab"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
          >
            Back to laboratories
          </Button>
        )}
      />

      <Paper elevation={2} sx={{ overflow: "hidden" }}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: 390, p: 4 }}>
            <CircularProgress size={38} />
            <Typography color="text.secondary">Loading laboratory details…</Typography>
          </Stack>
        ) : (
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.35fr) minmax(290px, .75fr)" },
                gap: { xs: 3.5, md: 5 },
                p: { xs: 2.25, sm: 3.5, md: 4 },
              }}
            >
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <Box
                    sx={{
                      display: "grid",
                      width: 38,
                      height: 38,
                      placeItems: "center",
                      borderRadius: 2.25,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    }}
                  >
                    <ScienceOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h6">Laboratory details</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Fields marked with an asterisk are required.
                    </Typography>
                  </Box>
                </Stack>

                {errors && (
                  <Alert severity="error">
                    {errors.general?.[0] || "Please review the highlighted fields and try again."}
                  </Alert>
                )}

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                    gap: 2.25,
                  }}
                >
                  <TextField
                    autoFocus
                    required
                    fullWidth
                    label="Laboratory name"
                    placeholder="e.g. Chemistry Laboratory"
                    value={laboratory.name}
                    onChange={updateField("name")}
                    error={Boolean(errors?.name)}
                    helperText={errors?.name?.[0] || "Use the name shown on room signs and records."}
                    inputProps={{ maxLength: 255 }}
                  />
                  <TextField
                    required
                    fullWidth
                    label="Location"
                    placeholder="e.g. Science Building, Room 204"
                    value={laboratory.location}
                    onChange={updateField("location")}
                    error={Boolean(errors?.location)}
                    helperText={errors?.location?.[0] || "Add a room number, floor, or building."}
                    inputProps={{ maxLength: 255 }}
                  />
                </Box>

                <TextField
                  fullWidth
                  multiline
                  minRows={5}
                  label="Description"
                  placeholder="Describe the room, its purpose, or the equipment stored here."
                  value={laboratory.description}
                  onChange={updateField("description")}
                  error={Boolean(errors?.description)}
                  helperText={errors?.description?.[0] || "Optional — a short description helps users choose the correct laboratory."}
                />
              </Stack>

              <Box>
                <Typography variant="subtitle1" fontWeight={750}>
                  Cover image
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                  Add a photo that makes this laboratory easy to identify.
                </Typography>

                <Box
                  sx={{
                    position: "relative",
                    display: "grid",
                    minHeight: 230,
                    placeItems: "center",
                    overflow: "hidden",
                    border: "1px dashed",
                    borderColor: errors?.gallery ? "error.main" : "divider",
                    borderRadius: 3,
                    bgcolor: "background.default",
                  }}
                >
                  {previewImage ? (
                    <Box
                      component="img"
                      src={previewImage}
                      alt="Laboratory cover preview"
                      sx={{ width: "100%", height: 230, objectFit: "cover" }}
                    />
                  ) : (
                    <Stack alignItems="center" spacing={1} sx={{ p: 3, textAlign: "center" }}>
                      <ImageOutlinedIcon sx={{ fontSize: 46, color: "text.disabled" }} />
                      <Typography variant="body2" color="text.secondary">
                        No image selected
                      </Typography>
                    </Stack>
                  )}

                  {selectedImage && (
                    <IconButton
                      aria-label="Remove selected image"
                      onClick={() => setSelectedImage(null)}
                      sx={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        bgcolor: "background.paper",
                        boxShadow: 2,
                        "&:hover": { bgcolor: "background.paper" },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadOutlinedIcon />}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {previewImage ? "Choose another image" : "Choose an image"}
                  <VisuallyHiddenInput
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageSelection}
                  />
                </Button>

                {selectedImage && (
                  <Chip
                    label={`${selectedImage.name} · ${(selectedImage.size / 1024 / 1024).toFixed(1)} MB`}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1.5, maxWidth: "100%" }}
                  />
                )}
                <Typography
                  variant="caption"
                  color={errors?.gallery ? "error" : "text.secondary"}
                  sx={{ display: "block", mt: 1.25, lineHeight: 1.5 }}
                >
                  {errors?.gallery?.[0] || "JPG, PNG, or WebP. Maximum file size: 4 MB."}
                </Typography>
              </Box>
            </Box>

            <Divider />
            <Stack
              direction={{ xs: "column-reverse", sm: "row" }}
              justifyContent="flex-end"
              spacing={1.25}
              sx={{ p: { xs: 2.25, sm: 3 }, bgcolor: "background.default" }}
            >
              <Button
                component={Link}
                to="/admin/lab"
                variant="outlined"
                disabled={submitting}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                sx={{ minWidth: { sm: 180 }, width: { xs: "100%", sm: "auto" } }}
              >
                {submitting ? (
                  <>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    Saving…
                  </>
                ) : editing ? "Save changes" : "Create laboratory"}
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
