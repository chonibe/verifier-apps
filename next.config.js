/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'], // For the artwork images from Verisart
  },
  // We don't need the rewrites anymore since we're accessing the URL directly
};

module.exports = nextConfig;
