import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow importing the compiled Hardhat artifact shared with the contracts package.
    fs: { allow: ['..'] },
  },
});