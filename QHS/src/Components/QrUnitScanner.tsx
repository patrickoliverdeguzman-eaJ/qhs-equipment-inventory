import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { parseUnitScan } from '../utils/custodyWorkflow';

interface QrUnitScannerProps {
  onScan: (unitId: string) => void;
  disabled?: boolean;
}

export default function QrUnitScanner({ onScan, disabled = false }: QrUnitScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef<{ value: string; time: number } | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [cameraRunning, setCameraRunning] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraRunning(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const submitScan = useCallback((rawValue: string) => {
    const unitId = parseUnitScan(rawValue);
    if (!unitId) return;

    const now = Date.now();
    if (lastScanRef.current?.value === unitId && now - lastScanRef.current.time < 1500) return;
    lastScanRef.current = { value: unitId, time: now };
    onScan(unitId);
  }, [onScan]);

  const startCamera = async () => {
    setCameraError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera scanning is not supported in this browser. Use the unit-ID field or checklist below.');
      return;
    }

    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (result) submitScan(result.getText());
      });
      controlsRef.current = controls;
      setCameraRunning(true);
    } catch {
      stopCamera();
      setCameraError('Camera access was denied or no camera is available. You can continue with manual entry or the checklist.');
    }
  };

  const submitManual = () => {
    submitScan(manualValue);
    setManualValue('');
  };

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          display: cameraRunning ? 'block' : 'none',
          overflow: 'hidden',
          borderRadius: 2,
          bgcolor: 'common.black',
          aspectRatio: '16 / 9',
        }}
      >
        <Box component="video" ref={videoRef} muted playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        {!cameraRunning ? (
          <Button variant="outlined" startIcon={<CameraAltOutlinedIcon />} onClick={startCamera} disabled={disabled}>
            Start camera
          </Button>
        ) : (
          <Button variant="outlined" color="error" startIcon={<StopCircleOutlinedIcon />} onClick={stopCamera}>
            Stop camera
          </Button>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
          Video stays on this device and is never uploaded.
        </Typography>
      </Stack>

      {cameraError && <Alert severity="warning">{cameraError}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          fullWidth
          size="small"
          label="Scan or enter unit ID"
          value={manualValue}
          disabled={disabled}
          onChange={(event) => setManualValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submitManual();
            }
          }}
          helperText="Accepts EQ unit IDs and existing item-history QR URLs."
        />
        <Button
          variant="contained"
          startIcon={<QrCodeScannerOutlinedIcon />}
          onClick={submitManual}
          disabled={disabled || !manualValue.trim()}
          sx={{ alignSelf: { sm: 'flex-start' }, whiteSpace: 'nowrap' }}
        >
          Add unit
        </Button>
      </Stack>
    </Stack>
  );
}
