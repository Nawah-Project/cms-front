import { db } from "../.server/db";

export async function loader() {
  const stats = db.getDashboardStats();
  return Response.json(stats, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
