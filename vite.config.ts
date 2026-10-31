import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  if (command === "build" && mode === "production") {
    const { VITE_API_URL } = loadEnv(mode, process.cwd(), "VITE_");
    let apiUrl: URL;
    try {
      apiUrl = new URL(VITE_API_URL);
    } catch {
      throw new Error("Production builds require an explicit HTTPS VITE_API_URL.");
    }
    const hostname = apiUrl.hostname.toLowerCase();
    if (
      apiUrl.protocol !== "https:" ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.startsWith("127.") ||
      hostname === "[::1]" ||
      hostname === "0.0.0.0" ||
      apiUrl.username ||
      apiUrl.password
    ) {
      throw new Error(
        "Production VITE_API_URL must use HTTPS and cannot point to a local API.",
      );
    }
  }

  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      proxy: {
        "/applications": {
          target: "http://localhost:3000",
          changeOrigin: true,
          bypass(req) {
            const accept = req.headers["accept"] || "";
            if (req.method === "GET" && accept.includes("text/html")) {
              return req.url;
            }
          },
        },
      },
    },
  };
});

