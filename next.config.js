/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
  },
  async rewrites() {
    return [
      {
        source: '/apps/verisart/:path*',
        destination: 'https://www.thestreetlamp.com/apps/verisart/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
