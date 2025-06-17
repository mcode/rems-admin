import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // load env vars from .env
export default defineConfig({
  // depending on your application, base can also be "/"
  base: '',
  plugins: [react()],
  preview: {
    allowedHosts: ['.mitre.org', '.elb.us-east-1.amazonaws.com']
  },
  define: {
    'process.env': process.env
  },
  server: {
    port: parseInt(process.env.FRONTEND_PORT!),
    open: false,
    host: true,
    allowedHosts: ['.mitre.org', '.elb.us-east-1.amazonaws.com']
  }
});
