import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
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
});


