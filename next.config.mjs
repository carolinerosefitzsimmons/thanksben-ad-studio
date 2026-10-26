/** @type {import('next').NextConfig} */
const nextConfig = {
  // pg is a server-only native-ish dep; keep it external to the server bundle.
  experimental: { serverComponentsExternalPackages: ["pg"] },
  images: {
    // Only the logo sources lib/logos.ts actually uses. The prototype allowed
    // hostname "**", which let any remote host be proxied through /_next/image.
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons**" },
      { protocol: "https", hostname: "img.logo.dev" },
    ],
  },
};
export default nextConfig;
