/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
  // Serve uploaded files (if any static assets are ever needed)
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
}

export default nextConfig
