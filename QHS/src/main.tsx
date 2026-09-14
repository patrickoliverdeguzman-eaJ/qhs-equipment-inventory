import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ContextProvider } from './Context/ContextProvider'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { appTheme } from './theme'
import './index.css'
import './echo'
import router from './router';

const root = document.getElementById('root');
if (!root) throw new Error('Application root element was not found.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <ContextProvider>
        <RouterProvider router={router} />
      </ContextProvider>
    </ThemeProvider>
  </React.StrictMode>
)
