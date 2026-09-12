import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosClient, { assetUrl } from "../../axiosClient";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Button from "@mui/material/Button";

export default function LaboratoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [laboratory, setLaboratory] = useState({
    id: null,
    name: "",
    location: "",
    description: "",
    gallery: null, 
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      axiosClient
        .get(`/laboratories/${id}`)
        .then(({ data }) => {
          setLoading(false);
          setLaboratory(data);
          setPreviewImage(
            data.gallery ? assetUrl(`/storage/${data.gallery}`) : null);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [id]);

  
  const handleImageSelection = (ev) => {
    const file = ev.target.files[0];
    if (file) {
      setSelectedImage(file); 
      setPreviewImage(URL.createObjectURL(file)); 
    }
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const formData = new FormData();

    formData.append("name", laboratory.name);
    formData.append("location", laboratory.location);
    formData.append("description", laboratory.description);

    if (selectedImage) {
      formData.append("gallery", selectedImage);
    }

    if (!laboratory.id) {
      formData.append("_method", "POST");
    } else {
      formData.append("_method", "PUT");
    }

    try {
      if (laboratory.id) {
        // Use PUT for updates
        await axiosClient.post(`/laboratories/${laboratory.id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        // Use POST for creating a new laboratory
        await axiosClient.post("/laboratories", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }
      navigate("../lab");
    } catch (err) {
      const response = err.response;
      if (response && response.status === 422) {
        setErrors(response.data.errors);
      } else {
        console.error("Server Error:", response?.data || err.message);
        setErrors({ general: ["An unexpected error occurred. Please try again."] });
      }
    }
  };

  return (
    <>
      {/* Back Button */}
      <Link to="../lab">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          sx={{
            color: "maroon",
            borderColor: "maroon",
            marginBottom: 2,
            "&:hover": {
              borderColor: "maroon",
              backgroundColor: "rgba(128, 0, 0, 0.04)",
            },
          }}
        >
          Back
        </Button>
      </Link>

      {/* Form Title */}
      {laboratory.id && <h1>Update Laboratory: {laboratory.name}</h1>}
      {!laboratory.id && <h1>New Laboratory</h1>}

      <div className="card animated fadeInDown">
        {loading && <div className="text-center">Loading...</div>}
        {errors && (
          <div className="alert">
            {Object.keys(errors).map((key) => (
              <p key={key}>{errors[key][0]}</p>
            ))}
          </div>
        )}
        {!loading && (
          <form onSubmit={onSubmit}>
            {/* Name Field */}
            <input
              value={laboratory.name}
              onChange={(ev) =>
                setLaboratory({ ...laboratory, name: ev.target.value })
              }
              placeholder="Name"
            />

            {/* Location Field */}
            <input
              value={laboratory.location}
              onChange={(ev) =>
                setLaboratory({ ...laboratory, location: ev.target.value })
              }
              placeholder="Location"
            />

            {/* Description Field */}
            <input
              value={laboratory.description}
              onChange={(ev) =>
                setLaboratory({ ...laboratory, description: ev.target.value })
              }
              placeholder="Description"
            />

            {/* Image Upload */}
            <div>
              <h3>Image</h3>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelection}
              />
              {(previewImage || laboratory.gallery) && (
                <div style={{ marginTop: "10px" }}>
                  <img
                    src={previewImage || assetUrl(`/storage/${laboratory.gallery}`)}
                    alt="Preview"
                    style={{ width: "100px", height: "100px", objectFit: "cover" }}
                  />
                </div>
              )}
            </div>

            {/* Save Button */}
            <button className="btn">Save</button>
          </form>
        )}
      </div>
    </>
  );
}
