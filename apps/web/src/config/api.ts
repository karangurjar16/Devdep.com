// Use VITE_API_URL env var in production builds.
// In development, falls back to localhost:5000.
// Set VITE_API_URL=https://api.devdep.dpdns.org in your production .env
export const API_URL: string =
    import.meta.env.VITE_API_URL || "http://localhost:5000";
