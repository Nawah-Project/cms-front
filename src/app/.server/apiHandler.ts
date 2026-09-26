import { db } from "./db";

export async function handleApiRequest(
  method: string,
  pathname: string,
  searchParams: URLSearchParams,
  bodyText?: string
): Promise<{ status: number; data: any } | null> {
  const m = method.toUpperCase();

  // 1. GET /applications/dashboard
  if (pathname === "/applications/dashboard") {
    if (m === "GET") {
      const stats = db.getDashboardStats();
      return { status: 200, data: stats };
    }
  }

  // 2. /applications (list or create)
  if (pathname === "/applications" || pathname === "/applications/") {
    if (m === "GET") {
      const stage = searchParams.get("stage") || undefined;
      const outcome = searchParams.get("outcome") || undefined;
      const search = searchParams.get("search") || undefined;
      const apps = db.getAll({ stage, outcome, search });
      return { status: 200, data: apps };
    }

    if (m === "POST") {
      let body: any = {};
      try {
        if (bodyText) {
          body = JSON.parse(bodyText);
        }
      } catch {
        return { status: 400, data: { error: "Invalid JSON body" } };
      }

      if (!body.companyName || !body.jobTitle) {
        return {
          status: 400,
          data: { error: "Company name and job title are required" },
        };
      }

      const created = db.create(body);
      return { status: 201, data: created };
    }
  }

  // 3. /applications/:id
  const match = pathname.match(/^\/applications\/([^/]+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    if (id === "dashboard") {
      return { status: 200, data: db.getDashboardStats() };
    }

    if (m === "GET") {
      const app = db.getById(id);
      if (!app) {
        return { status: 404, data: { error: "Application not found" } };
      }
      return { status: 200, data: app };
    }

    if (m === "PATCH" || m === "PUT") {
      let body: any = {};
      try {
        if (bodyText) {
          body = JSON.parse(bodyText);
        }
      } catch {
        return { status: 400, data: { error: "Invalid JSON body" } };
      }

      const updated = db.update(id, body);
      if (!updated) {
        return { status: 404, data: { error: "Application not found" } };
      }
      return { status: 200, data: updated };
    }

    if (m === "DELETE") {
      const deleted = db.delete(id);
      if (!deleted) {
        return { status: 404, data: { error: "Application not found" } };
      }
      return { status: 200, data: { success: true } };
    }
  }

  return null;
}
