// Hostinger / cPanel / Passenger Node.js Entry Point
// This file allows Hostinger's Node.js Application Manager to boot the compiled server directly.

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Load compiled CommonJS backend server
require('./dist/server.cjs');
