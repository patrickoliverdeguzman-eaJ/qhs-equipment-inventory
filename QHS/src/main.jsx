import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ContextProvider } from './Context/ContextProvider.jsx'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { appTheme } from './theme.js'
import './index.css'
import './echo'
import router from './router.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <ContextProvider>
        <RouterProvider router={router} />
      </ContextProvider>
    </ThemeProvider>
  </React.StrictMode>
)
