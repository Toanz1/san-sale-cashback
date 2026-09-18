import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Thêm dòng này để cho phép IP mạng LAN truy cập HMR
  allowedDevOrigins: ['192.168.1.118', 'localhost:3000'],
};

export default nextConfig;