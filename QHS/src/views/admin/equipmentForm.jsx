import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosClient, { backendBaseUrl } from "../../axiosClient";
import { useStateContext } from "../../Context/ContextProvider";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select as MuiSelect,
  TextField,
  Typography,
  useTheme,
  Alert,
  CircularProgress,
  IconButton,
  Stack
} from "@mui/material";
import ReactSelect from "react-select";
import { styled } from "@mui/material/styles";

const StyledFileInput = styled("input")({
  width: "100%",
  padding: "10px",
  borderRadius: "4px",
  border: "1px solid",
  borderColor: "divider",
  backgroundColor: "background.paper",
  color: "text.primary",
  "&::file-selector-button": {
    padding: "8px 16px",
    marginRight: "12px",
    backgroundColor: "primary.main",
    color: "common.white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
});

export default function EquipmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useStateContext();
  const equipmentPath = user?.role === 'custodian' ? '/custodian/equipment' : '/admin/equipment';

  const [equipment, setEquipment] = useState({
    id: null,
    name: "",
    condition: "",
    description: "",
    image: null,
    laboratory_id: "",
    category_ids: [],
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [laboratories, setLaboratories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Track if we want to delete the current image
  const [removeImage, setRemoveImage] = useState(false);

  const BASE_URL = backendBaseUrl;
  const defaultImage = `${BASE_URL}/storage/itemImage/No-image-default.png`;

  const getImageUrl = (image) => {
    if (!image || image === "itemImage/No-image-default.png") return defaultImage;
    return `${BASE_URL}/storage/${image}`;
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      axiosClient.get(`/equipment/${id}`).then(({ data }) => {
        const eq = data.data;
        setEquipment({
          id: eq.id,
          name: eq.name || "",
          condition: eq.condition || "",
          description: eq.description || "",
          image: eq.image,
          laboratory_id: eq.laboratory_id || "",
          category_ids: eq.categories?.map(c => c.id) || [],
        });
        setSelectedCategories(eq.categories?.map(c => ({ value: c.id, label: c.name })) || []);
        
        // Only show current image if it exists and we're not removing it
        if (eq.image && !removeImage) {
          setPreviewImage(getImageUrl(eq.image));
        } else {
          setPreviewImage(defaultImage);
        }

        setRemoveImage(false); // reset flag
        setLoading(false);
      }).catch(() => {
        setErrors({ general: ["Failed to load equipment."] });
        setLoading(false);
      });
    } else {
      setPreviewImage(defaultImage);
      setRemoveImage(false);
    }
  }, [id]);

  useEffect(() => {
    axiosClient.get("/laboratories").then(({ data }) => setLaboratories(data.data || []));
    axiosClient.get("/categories").then(({ data }) => setCategories(data.data || []));
  }, []);

  const handleImageSelection = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
      setRemoveImage(false); // cancel remove if new image selected
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setPreviewImage(defaultImage);
    setRemoveImage(true); // tell backend to delete old image
  };

  const handleCategoryChange = (selected) => {
    setSelectedCategories(selected || []);
    setEquipment(prev => ({
      ...prev,
      category_ids: selected ? selected.map(s => s.value) : []
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors(null);

    // REMOVED: setRemoveImage(false);  <--- This was resetting the flag too early!

    const formData = new FormData();
    formData.append("name", equipment.name);
    formData.append("condition", equipment.condition);
    formData.append("description", equipment.description || "");
    formData.append("laboratory_id", equipment.laboratory_id);

    equipment.category_ids.forEach(id => formData.append("category_ids[]", id));

    // Handle image logic
    if (selectedImage) {
      formData.append("image", selectedImage);
    } else if (removeImage && equipment.id) {
      // Explicitly tell Laravel to remove the image
      formData.append("remove_image", "1");
    }

    if (equipment.id) {
      formData.append("_method", "PUT");
    }

    try {
      if (equipment.id) {
        await axiosClient.post(`/equipment/${equipment.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        await axiosClient.post("/equipment", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }
      navigate(equipmentPath);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ general: ["Something went wrong. Please try again."] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Button component={Link} to={equipmentPath} startIcon={<ArrowBackIcon />} variant="outlined" sx={{ mb: 3 }}>
        Back to Equipment
      </Button>

      <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
        {equipment.id ? "Edit Equipment" : "Add New Equipment"}
      </Typography>

      <Box component="form" onSubmit={onSubmit} sx={{ bgcolor: "background.paper", borderRadius: 3, boxShadow: 4, p: 4 }}>
        {loading && (
          <Box textAlign="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {errors?.general && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.general.map((err, i) => <div key={i}>{err}</div>)}
          </Alert>
        )}

        {!loading && (
          <>
            <TextField
              fullWidth
              label="Equipment Name"
              value={equipment.name}
              onChange={e => setEquipment({ ...equipment, name: e.target.value })}
              required
              sx={{ mb: 3 }}
            />

            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <FormLabel component="legend">Condition</FormLabel>
              <RadioGroup
                row
                value={equipment.condition}
                onChange={e => setEquipment({ ...equipment, condition: e.target.value })}
              >
                {["New", "Used", "Damaged"].map(c => (
                  <FormControlLabel key={c} value={c} control={<Radio />} label={c} />
                ))}
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              label="Description (Optional)"
              value={equipment.description}
              onChange={e => setEquipment({ ...equipment, description: e.target.value })}
              multiline
              rows={4}
              sx={{ mb: 3 }}
            />

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Laboratory</InputLabel>
              <MuiSelect
                value={equipment.laboratory_id}
                label="Laboratory"
                onChange={e => setEquipment({ ...equipment, laboratory_id: e.target.value })}
              >
                {laboratories.map(lab => (
                  <MenuItem key={lab.id} value={lab.id}>{lab.name}</MenuItem>
                ))}
              </MuiSelect>
            </FormControl>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Categories</Typography>
              <ReactSelect
                isMulti
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                value={selectedCategories}
                onChange={handleCategoryChange}
                placeholder="Select categories..."
                styles={{
                  control: base => ({ ...base, backgroundColor: theme.palette.background.paper, borderColor: theme.palette.divider }),
                  menu: base => ({ ...base, backgroundColor: theme.palette.background.paper }),
                }}
              />
            </Box>

            {/* IMAGE UPLOAD SECTION */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>Equipment Image</Typography>

              <StyledFileInput
                type="file"
                accept="image/*"
                onChange={handleImageSelection}
              />

              {/* Show current image + remove button when editing */}
              {(previewImage && previewImage !== defaultImage) && (
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 3 }}>
                  <Box
                    component="img"
                    src={previewImage}
                    alt="Current"
                    sx={{
                      width: 200,
                      height: 200,
                      objectFit: "cover",
                      borderRadius: 3,
                      boxShadow: 3
                    }}
                  />
                  <Box>
                    {equipment.id && !selectedImage && !removeImage && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleRemoveImage}
                        sx={{ mt: 1 }}
                      >
                        Remove Image
                      </Button>
                    )}
                    {removeImage && (
                      <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                        Image will be removed on save
                      </Typography>
                    )}
                  </Box>
                </Stack>
              )}

              {/* Show new selected image preview */}
              {selectedImage && (
                <Box sx={{ mt: 3, textAlign: "center" }}>
                  <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
                    New image preview:
                  </Typography>
                  <img
                    src={previewImage}
                    alt="New preview"
                    style={{
                      maxWidth: 250,
                      maxHeight: 250,
                      borderRadius: 12,
                      objectFit: "cover",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                    }}
                  />
                </Box>
              )}
            </Box>

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button component={Link} to={equipmentPath} variant="outlined" disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? <CircularProgress size={24} /> : (equipment.id ? "Update" : "Create")} Equipment
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
