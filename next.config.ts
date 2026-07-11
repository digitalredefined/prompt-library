import type { NextConfig } from "next";

// Validate environment variables at startup/build so misconfiguration fails
// fast with a clear message. Set SKIP_ENV_VALIDATION=1 to bypass.
import "./lib/env";

const nextConfig: NextConfig = {/* config options here */};

export default nextConfig;
