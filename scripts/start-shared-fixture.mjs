// Browser acceptance server for a fresh clone with no private environment files.
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

for (const name of [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
])
  delete process.env[name];
process.env.VITE_APP_MODE = "supabase";
const server = await createServer({
  // This intentionally empty/nonexistent directory prevents Vite loading .env.local.
  envDir: fileURLToPath(
    new URL("../tests/shared-backend-e2e/no-env", import.meta.url),
  ),
  server: { host: "127.0.0.1", port: 5190, strictPort: true },
});
await server.listen();
