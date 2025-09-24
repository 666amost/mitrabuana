import { vercelPreset } from '@vercel/react-router/vite';
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  serverModuleFormat: "esm",
  presets: [vercelPreset()],
} satisfies Config;
