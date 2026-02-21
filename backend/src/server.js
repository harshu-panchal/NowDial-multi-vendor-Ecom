import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { validateEnv } from './config/env.js';

// Validate environment variables (fail fast if missing)
validateEnv();

// Connect to MongoDB
connectDB();

// Start HTTP server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});
