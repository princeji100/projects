/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'linktreeaws.s3.amazonaws.com',
        port: '',
        pathname: '/**', 
      },
    ],
  },
};

export default nextConfig;
