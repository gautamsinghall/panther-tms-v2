/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  swcMinify: true,
  experimental: {
    cpus: 1,
    workerThreads: false,
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async redirects() {
    return [
      {
        source: "/transport/tracking",
        destination: "/tracking/sim",
        permanent: true,
      },
      {
        source: "/transport/tracking/fastag",
        destination: "/tracking/fastag",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
