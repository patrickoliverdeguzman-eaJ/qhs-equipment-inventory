import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosClient from "../../axiosClient";
import { useStateContext } from "../../Context/ContextProvider";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";

export default function ItemForm() {
  const { id, equipmentID } = useParams();
  const navigate = useNavigate();
  const { user } = useStateContext();
  const basePath = user?.role === 'custodian' ? '/custodian' : '/admin';

  const [item, setItem] = useState({
    id: null,
    equipment_id: equipmentID ? parseInt(equipmentID) : null,
    unit_id: "",
    condition: "Good", // sensible default
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      axiosClient
        .get(`/item/${id}`)
        .then(({ data }) => {
          const i = data.data;
          setItem({
            id: i.id,
            equipment_id: i.equipment_id,
            unit_id: i.unit_id || "",
            condition: i.condition || "Good",
          });
          setLoading(false);
        })
        .catch(() => {
          setErrors({ general: ["Failed to load unit."] });
          setLoading(false);
        });
    }
  }, [id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const payload = item.id
      ? { condition: item.condition || 'Good' }
      : { equipment_id: parseInt(item.equipment_id), condition: item.condition || 'Good' };

    try {
      if (item.id) {
        await axiosClient.put(`/item/${item.id}`, payload);
      } else {
        await axiosClient.post("/item", payload);
      }
      navigate(`${basePath}/equipment/info/${item.equipment_id}`);
    } catch (err) {
      console.error("Save failed:", err.response?.data);
      if (err.response?.status === 422) {
        const serverErrors = err.response.data.errors || {};
        setErrors(serverErrors);
        const firstError = Object.values(serverErrors)[0]?.[0] || "Please fix the errors.";
        setErrors((prev) => ({ ...prev, general: [firstError] }));
      } else {
        setErrors({ general: ["Server error. Please try again."] });
      }
    } finally {
      setLoading(false);
    }
  };

  // Condition options
  const conditions = [
    { value: "New",           label: "New",           color: "success" },
    { value: "Good",          label: "Good",          color: "success" },
    { value: "Fair",          label: "Fair",          color: "info" },
    { value: "Poor",          label: "Poor",          color: "warning" },
    { value: "Damaged",       label: "Damaged",       color: "error" },
    { value: "Missing",       label: "Missing",       color: "error" },
    { value: "Under Repair",  label: "Under Repair",  color: "warning" },
  ];

  return (
    <Box sx={{ maxWidth: 650, mx: "auto", p: 3 }}>
      <Link to={`${basePath}/equipment/info/${equipmentID || item.equipment_id}`}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          sx={{
            mb: 3,
            color: "maroon",
            borderColor: "maroon",
            "&:hover": {
              borderColor: "darkred",
              bgcolor: "rgba(128, 0, 0, 0.04)",
            },
          }}
        >
          Back to Equipment
        </Button>
      </Link>

      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        {item.id ? "Edit Unit" : "Add New Unit"}
      </Typography>

      <Paper elevation={4} sx={{ p: 5, borderRadius: 3 }}>
        {errors?.general && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {errors.general.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </Alert>
        )}

        {loading ? (
          <Box textAlign="center" my={8}>
            <CircularProgress size={70} />
          </Box>
        ) : (
          <Box component="form" onSubmit={onSubmit}>
            {/* Unit ID */}
            <Box mb={5}>
              <FormLabel component="legend" sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                Unit ID
              </FormLabel>
              <Box
                sx={{
                  mt: 2,
                  p: 3,
                  bgcolor: "#f8f9fa",
                  border: "2px dashed #ccc",
                  borderRadius: 2,
                  textAlign: "center",
                  fontFamily: "monospace",
                  fontSize: "1.4rem",
                  fontWeight: "bold",
                  color: item.unit_id ? "primary.main" : "text.disabled",
                }}
              >
                {item.unit_id || "Will be auto-generated on save"}
              </Box>
            </Box>

            {/* Condition */}
            <Box mb={6}>
              <FormLabel component="legend" sx={{ fontWeight: "bold", fontSize: "1.1rem", mb: 2 }}>
                Condition
              </FormLabel>
              <RadioGroup
                value={item.condition || 'Good'}
                onChange={(e) => setItem({ ...item, condition: e.target.value })}
              >
                {conditions.map(({ value, label, color, sx }) => (
                  <FormControlLabel
                    key={value}
                    value={value}
                    control={<Radio color={color} />}
                    label={label}
                    sx={{
                      mb: 1.5,
                      py: 0.5,
                      px: 2,
                      borderRadius: 2,
                      bgcolor: item.condition === value ? `${color}.50` : "transparent",
                      "& .MuiFormControlLabel-label": {
                        fontWeight: item.condition === value ? "bold" : "medium",
                        color: item.condition === value ? `${color}.main` : "inherit",
                      },
                      ...sx,
                    }}
                  />
                ))}
              </RadioGroup>

              {errors.condition && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {errors.condition[0]}
                </Typography>
              )}
            </Box>

            {/* Submit */}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              fullWidth
              sx={{
                py: 2,
                fontSize: "1.2rem",
                fontWeight: "bold",
                bgcolor: "maroon",
                "&:hover": { bgcolor: "darkred" },
                borderRadius: 3,
              }}
            >
              {loading ? <CircularProgress size={32} color="inherit" /> : "Save Unit"}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
