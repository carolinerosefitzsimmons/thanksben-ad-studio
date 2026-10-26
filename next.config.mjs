/** @type {import('next').NextConfig} */
const nextConfig = {
  // pg is a server-only native-ish dep; keep it external to the server bundle.
  experimental: { serverComponentsExternalPackages: ["pg"] },
  images: {
    // Allow hotlinked client logos (Clearbit) + firm favicons in <Image>/<img>.
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "**" },
    ],
  },
};
export default nextConfig;
