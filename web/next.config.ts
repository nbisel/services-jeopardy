import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Temporary: lets the GitHub upload page fetch the repo manifest from
    // the local dev server. Removed after the one-time repo upload.
    return [
      {
        source: "/repo-manifest.json",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
