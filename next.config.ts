import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Exercise demo GIFs are served from Supabase Storage.
      { protocol: "https", hostname: "*.supabase.co" },
      // Marketing photography (landing page hero).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
