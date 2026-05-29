// Main server entry point for the BillBook Express API
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const clientsRoutes = require('./routes/clientsRoutes');
const invoicesRoutes = require('./routes/invoicesRoutes');
const paymentsRoutes = require('./routes/paymentsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure pdfs directory exists
const pdfsDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
}

// Serve pdfs as static files (accessible at /pdfs/INV-XXXX.pdf)
app.use('/pdfs', express.static(pdfsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  return res.json({ status: 'healthy', app: 'BillBook Backend' });
});

// Serve static assets from Vite's build folder (client/dist) in production/cloud deployment
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  
  // Catch-all route to serve React index.html for client-side routing
  app.get('*', (req, res) => {
    // Only serve index.html if the request is not for an API endpoint or a PDF file
    if (!req.path.startsWith('/api') && !req.path.startsWith('/pdfs')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
  console.log(`[BillBook Server] Serving static client build from ${clientBuildPath}`);
}

// Start the server
app.listen(PORT, () => {
  console.log(`[BillBook API] Server is running on port ${PORT}`);
});
