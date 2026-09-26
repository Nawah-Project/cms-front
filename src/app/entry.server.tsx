import { PassThrough } from "node:stream";
import type { EntryContext, RouterContextProvider } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";
import { db } from "./.server/db";

export const streamTimeout = 5_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: RouterContextProvider,
) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();
  const accept = request.headers.get("accept") || "";

  // Check if this is an API call to /applications or /applications/:id
  const isApiRequest =
    pathname.startsWith("/applications") &&
    pathname !== "/applications/dashboard" &&
    (method !== "GET" || accept.includes("application/json") || !accept.includes("text/html"));

  if (isApiRequest) {
    // 1. /applications (collection)
    if (pathname === "/applications" || pathname === "/applications/") {
      if (method === "GET") {
        const stage = url.searchParams.get("stage") || undefined;
        const outcome = url.searchParams.get("outcome") || undefined;
        const search = url.searchParams.get("search") || undefined;

        const applications = db.getAll({ stage, outcome, search });
        return Response.json(applications, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      }

      if (method === "POST") {
        try {
          let body: any;
          const contentType = request.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            body = await request.json();
          } else {
            const formData = await request.formData();
            body = Object.fromEntries(formData);
          }

          if (!body.companyName || !body.jobTitle) {
            return Response.json(
              { error: "Company name and job title are required" },
              { status: 400 }
            );
          }

          const created = db.create(body);
          return Response.json(created, { status: 201 });
        } catch (err: any) {
          return Response.json({ error: err.message || "Invalid request" }, { status: 400 });
        }
      }
    }

    // 2. /applications/:id (single item)
    const match = pathname.match(/^\/applications\/([^/]+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]);

      if (method === "GET") {
        const application = db.getById(id);
        if (!application) {
          return Response.json({ error: "Application not found" }, { status: 404 });
        }
        return Response.json(application, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      }

      if (method === "PATCH" || method === "PUT") {
        try {
          let body: any;
          const contentType = request.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            body = await request.json();
          } else {
            const formData = await request.formData();
            body = Object.fromEntries(formData);
          }

          const updated = db.update(id, body);
          if (!updated) {
            return Response.json({ error: "Application not found" }, { status: 404 });
          }
          return Response.json(updated, { status: 200 });
        } catch (err: any) {
          return Response.json({ error: err.message || "Invalid update" }, { status: 400 });
        }
      }

      if (method === "DELETE") {
        const deleted = db.delete(id);
        if (!deleted) {
          return Response.json({ error: "Application not found" }, { status: 404 });
        }
        return Response.json({ success: true }, { status: 200 });
      }
    }
  }

  // HEAD method handling
  if (method === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  // Standard SSR rendering for browser HTML requests
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");

    let readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? "onAllReady"
        : "onShellReady";

    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => abort(),
      streamTimeout + 1000,
    );

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          pipe(body);

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );
  });
}
