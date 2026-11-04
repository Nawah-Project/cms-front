// Local review harness only. Excluded from Docker contexts; never a production auth path.
import { createServer } from "vite";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
if (process.env.NODE_ENV === "production")
  throw Error("Review server is not a production server");
process.env.VITE_API_URL = "/preview-api";
process.env.VITE_LEARNING_PREVIEW = "true";
process.env.NAWAH_LEARNING_PREVIEW = "true";
process.env.NAWAH_FRONTEND_APP = "combined";
const samples = process.env.LEARNING_REVIEW_SAMPLES || "/review-samples";
const server = await createServer({
  server: { host: "0.0.0.0", port: 3000, strictPort: true, allowedHosts: true },
  plugins: [
    {
      name: "learning-review-only",
      configureServer(vite) {
        vite.middlewares.use("/learning-pdf-assets", (req, res) => {
          const match = new URL(req.url, "http://review.local").pathname.match(
            /^\/(cmaps|standard_fonts|wasm)\/([\w.-]+)$/,
          );
          if (!match) {
            res.statusCode = 404;
            res.end();
            return;
          }
          res.setHeader(
            "Content-Type",
            match[2].endsWith(".wasm")
              ? "application/wasm"
              : "application/octet-stream",
          );
          readFile(
            join(process.cwd(), "node_modules/pdfjs-dist", match[1], match[2]),
          )
            .then((data) => res.end(data))
            .catch(() => {
              res.statusCode = 404;
              res.end();
            });
        });
        vite.middlewares.use("/preview-api", (req, res) => {
          void (async () => {
            const path = new URL(req.url, "http://review.local").pathname;
            res.setHeader("Cache-Control", "no-store");
            res.setHeader("X-Nawah-Review", "synthetic-only");
            const json = (value, status = 200) => {
              res.statusCode = status;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(value));
            };
            if (req.method === "GET" && path === "/auth/me")
              return json({
                id: "00000000-0000-4000-8000-000000000004",
                name: "معاينة مكتبة التعلّم",
                email: "learning-review@example.invalid",
                role: "ADMIN",
                emailVerified: true,
                adminAccess: {
                  isRoot: true,
                  fullAccess: true,
                  canManageAdmins: false,
                  permissions: {},
                },
              });
            if (req.method === "GET" && path === "/journey/state")
              return json({ state: { currentWeek: 0 }, nodes: [] });
            if (req.method === "GET" && path === "/ux-lab/assignment")
              return json({ excluded: true, sections: {} });
            if (req.method === "GET" && path.includes("notifications"))
              return json({ items: [], unreadCount: 0 });
            const sample = path.match(/^\/samples\/(text|scan|mixed)\.pdf$/);
            if (req.method === "GET" && sample) {
              try {
                res.setHeader("Content-Type", "application/pdf");
                res.end(await readFile(join(samples, sample[1] + ".pdf")));
              } catch {
                json({ message: "Review sample unavailable" }, 404);
              }
              return;
            }
            return json(
              {
                message:
                  "This endpoint is not available in the local learning review.",
              },
              403,
            );
          })().catch(() => {
            res.statusCode = 500;
            res.end("Review request failed");
          });
        });
      },
    },
  ],
});
await server.listen();
server.printUrls();
