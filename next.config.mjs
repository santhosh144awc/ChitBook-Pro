/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to support dynamic routes with Firebase
  // Static export doesn't work with dynamic routes like [id] without generateStaticParams
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
