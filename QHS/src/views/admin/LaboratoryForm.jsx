import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosClient, { assetUrl } from "../../axiosClient";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
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
    <Box sx={{ width: "100%", maxWidth: 1180, mx: "auto" }}>
      <Button
        component={Link}
        to="/admin/lab"
        variant="text"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 1.5, px: 0.5, alignSelf: "flex-start" }}
      >
        Laboratories
      </Button>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "flex-end" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="overline" color="primary" fontWeight={850} letterSpacing=".14em">
            Facility setup
          </Typography>
          <Typography component="h2" variant="h4" sx={{ mt: 0.25 }}>
            {editing ? "Edit laboratory" : "Create laboratory"}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.8, maxWidth: 620, lineHeight: 1.65 }}>
            {editing
              ? "Keep the room information accurate and recognizable for staff and students."
              : "Add the room once, then organize its equipment, custodians, and inventory from one place."}
          </Typography>
        </Box>
        <Chip
          icon={editing ? <CheckCircleOutlineIcon /> : undefined}
          label={editing ? "Existing record" : "New record"}
          variant="outlined"
          color={editing ? "success" : "primary"}
          sx={{ flexShrink: 0 }}
        />
      </Stack>

      <Paper elevation={3} sx={{ overflow: "hidden", borderRadius: { xs: 3, md: 4 } }}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: 390, p: 4 }}>
            <CircularProgress size={38} />
            <Typography color="text.secondary">Loading laboratory details…</Typography>
          </Stack>
        ) : (
          <Box
            component="form"
            onSubmit={onSubmit}
            noValidate
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 390px" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                minWidth: 0,
                flexDirection: "column",
                p: { xs: 2.5, sm: 4, lg: 5 },
              }}
            >
              <Stack spacing={4} sx={{ flex: 1 }}>
                {errors && (
                  <Alert severity="error">
                    {errors.general?.[0] || "Please review the highlighted fields and try again."}
                  </Alert>
                )}

                <Box>
                  <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ mb: 3 }}>
                    <Typography
                      aria-hidden="true"
                      sx={{
                        display: "grid",
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        placeItems: "center",
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontSize: "0.74rem",
                        fontWeight: 850,
                      }}
                    >
                      01
                    </Typography>
                    <Box>
                      <Typography variant="h6">Room information</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                        Use the same details that appear on school signs and records.
                      </Typography>
                    </Box>
                  </Stack>

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
                      helperText={errors?.name?.[0] || "The familiar name of the room."}
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
                      helperText={errors?.location?.[0] || "Building, floor, or room number."}
                      inputProps={{ maxLength: 255 }}
                    />
                  </Box>

                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="Description"
                    placeholder="Describe the room, its purpose, or the equipment stored here."
                    value={laboratory.description}
                    onChange={updateField("description")}
                    error={Boolean(errors?.description)}
                    helperText={errors?.description?.[0] || "Optional — give users enough context to recognize the room."}
                    sx={{ mt: 2.25 }}
                  />
                </Box>

                <Divider />

                <Box>
                  <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ mb: 2.5 }}>
                    <Typography
                      aria-hidden="true"
                      sx={{
                        display: "grid",
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        placeItems: "center",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "50%",
                        color: "primary.main",
                        fontSize: "0.74rem",
                        fontWeight: 850,
                      }}
                    >
                      02
                    </Typography>
                    <Box>
                      <Typography variant="h6">Cover photo</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                        A clear, well-lit room photo works best. This field is optional.
                      </Typography>
                    </Box>
                  </Stack>

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderStyle: "dashed",
                      borderColor: errors?.gallery ? "error.main" : "divider",
                      bgcolor: "background.default",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ xs: "stretch", sm: "center" }}
                      spacing={2}
                    >
                      <Box
                        sx={{
                          display: "grid",
                          width: 68,
                          height: 68,
                          flexShrink: 0,
                          placeItems: "center",
                          overflow: "hidden",
                          borderRadius: 2.25,
                          bgcolor: "background.paper",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {previewImage ? (
                          <Box
                            component="img"
                            src={previewImage}
                            alt="Selected laboratory"
                            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <ImageOutlinedIcon color="disabled" />
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={750} noWrap={Boolean(selectedImage)}>
                          {selectedImage?.name || (existingImage ? "Current laboratory image" : "No photo selected")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedImage
                            ? `${(selectedImage.size / 1024 / 1024).toFixed(1)} MB · Ready to upload`
                            : "JPG, PNG, or WebP · Up to 4 MB"}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.75}>
                        <Button
                          component="label"
                          variant="outlined"
                          startIcon={<CloudUploadOutlinedIcon />}
                          sx={{ flex: { xs: 1, sm: "none" }, whiteSpace: "nowrap" }}
                        >
                          {previewImage ? "Replace" : "Upload photo"}
                          <VisuallyHiddenInput
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageSelection}
                          />
                        </Button>
                        {selectedImage && (
                          <IconButton aria-label="Remove selected image" onClick={() => setSelectedImage(null)}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                  {errors?.gallery && (
                    <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                      {errors.gallery[0]}
                    </Typography>
                  )}
                </Box>
              </Stack>

              <Stack
                direction={{ xs: "column-reverse", sm: "row" }}
                alignItems="center"
                justifyContent="space-between"
                spacing={1.5}
                sx={{ mt: 5 }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ width: { xs: "100%", sm: "auto" } }}>
                  You can edit these details again at any time.
                </Typography>
                <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
                  <Button
                    component={Link}
                    to="/admin/lab"
                    color="inherit"
                    disabled={submitting}
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitting}
                    sx={{ minWidth: { sm: 176 }, width: { xs: "100%", sm: "auto" } }}
                  >
                    {submitting ? (
                      <>
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                        Saving…
                      </>
                    ) : editing ? "Save changes" : "Create laboratory"}
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <Box
              component="aside"
              aria-label="Laboratory directory preview"
              sx={{
                position: "relative",
                display: "flex",
                minWidth: 0,
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
                p: { xs: 2.5, sm: 4, md: 3.5 },
                bgcolor: "#4C1020",
                color: "common.white",
                backgroundImage:
                  "radial-gradient(circle at 105% -5%, rgba(232,188,114,.28), transparent 38%), linear-gradient(145deg, #59162A 0%, #351019 100%)",
                "&::after": {
                  position: "absolute",
                  right: -115,
                  bottom: -125,
                  width: 280,
                  height: 280,
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: "50%",
                  content: '""',
                },
              }}
            >
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Typography variant="overline" sx={{ color: "#E8BC72", fontWeight: 850, letterSpacing: ".14em" }}>
                  Directory preview
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.4, color: "common.white" }}>
                  See the room at a glance
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75, color: "rgba(255,255,255,.67)", lineHeight: 1.6 }}>
                  This card updates as you complete the form.
                </Typography>

                <Paper
                  aria-live="polite"
                  sx={{
                    mt: 3,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,.14)",
                    borderRadius: 3,
                    boxShadow: "0 24px 60px rgba(16,3,7,.28)",
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      display: "grid",
                      height: 218,
                      placeItems: "center",
                      overflow: "hidden",
                      bgcolor: "#EDE7E5",
                      backgroundImage: previewImage
                        ? "none"
                        : "linear-gradient(135deg, rgba(116,27,50,.09), rgba(183,121,31,.08))",
                    }}
                  >
                    {previewImage ? (
                      <Box
                        component="img"
                        src={previewImage}
                        alt="Laboratory card preview"
                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Stack alignItems="center" spacing={1} sx={{ color: "#8A787E" }}>
                        <ImageOutlinedIcon sx={{ fontSize: 44 }} />
                        <Typography variant="caption" fontWeight={700}>Cover photo</Typography>
                      </Stack>
                    )}
                    <Chip
                      label="Active"
                      color="success"
                      size="small"
                      sx={{ position: "absolute", top: 14, right: 14, bgcolor: "success.main", color: "common.white" }}
                    />
                  </Box>
                  <Box sx={{ p: 2.5, bgcolor: "background.paper", color: "text.primary" }}>
                    <Typography variant="h6" noWrap>
                      {laboratory.name.trim() || "Laboratory name"}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.8, color: "text.secondary" }}>
                      <LocationOnOutlinedIcon sx={{ fontSize: 17, flexShrink: 0 }} />
                      <Typography variant="body2" noWrap>
                        {laboratory.location.trim() || "Room location"}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 1.75,
                        minHeight: 42,
                        display: "-webkit-box",
                        overflow: "hidden",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        lineHeight: 1.5,
                      }}
                    >
                      {laboratory.description.trim() || "Add a short description to help users recognize this laboratory."}
                    </Typography>
                  </Box>
                </Paper>
              </Box>

              <Stack direction="row" spacing={1.25} sx={{ position: "relative", zIndex: 1, mt: 4 }}>
                <CheckCircleOutlineIcon sx={{ mt: 0.15, color: "#E8BC72", fontSize: 20 }} />
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,.68)", lineHeight: 1.6 }}>
                  A consistent name and photo make inventory records easier to scan and verify.
                </Typography>
              </Stack>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
