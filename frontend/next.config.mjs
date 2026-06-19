/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  allowedDevOrigins: ['http://192.168.1.113:3001'],
};
export default nextConfig;
