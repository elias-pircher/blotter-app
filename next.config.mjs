/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The old Vercel address forwards to the real domain, so everyone uses one address (and one login).
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'blotter-journal.vercel.app' }],
        destination: 'https://blotterjournal.com/:path*',
        permanent: false,
      },
    ];
  },
};
export default nextConfig;
