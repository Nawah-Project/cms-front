import test from "node:test";
import assert from "node:assert/strict";
import {
  blank,
  execute,
  coverage,
  mergeRanges,
  weekStats,
  visibleGraph,
  arrangeGraph,
  uid,
  validate,
} from "../src/app/features/learning-library/domain/model.mjs";
function base() {
  const d = blank(),
    bookId = "book-1",
    editionId = "edition-1",
    at = "2026-11-01T10:00:00Z";
  return execute(d, {
    id: uid(),
    type: "register",
    payload: {
      book: {
        id: bookId,
        title: "Synthetic book",
        author: "",
        purpose: "",
        cover: "",
        subjects: [],
        sectors: [],
        tags: [],
        status: "planned",
        archived: false,
        currentEditionId: editionId,
        createdAt: at,
      },
      edition: {
        id: editionId,
        bookId,
        label: "First",
        fingerprint: "a".repeat(64),
        bytes: 100,
        pageCount: 30,
        filename: "one.pdf",
        chapters: [],
        pageLabels: [],
        storage: "local",
        createdAt: at,
      },
    },
  });
}
function command(d, type, payload, at = "2026-11-04T10:00:00Z") {
  return execute(d, { id: uid(), type, payload, at });
}
test("visiting page 20 does not claim earlier reading; confirmed overlapping ranges form a unique union", () => {
  let d = command(base(), "position", {
    editionId: "edition-1",
    page: 20,
    recordVisit: true,
  });
  assert.equal(coverage(d, "edition-1").completed, 0);
  d = command(d, "confirm", { editionId: "edition-1", start: 10, end: 12 });
  d = command(d, "confirm", { editionId: "edition-1", start: 11, end: 15 });
  assert.deepEqual(coverage(d, "edition-1"), {
    completed: 6,
    total: 30,
    percent: 20,
  });
  assert.deepEqual(coverage(d, "edition-1", [{ start: 12, end: 17 }]), {
    completed: 4,
    total: 6,
    percent: 67,
  });
  assert.equal(d.positions["edition-1"].page, 20);
});
test("the same save attempt is idempotent and cannot be reused for different content", () => {
  let d = base();
  const c = {
    id: uid(),
    type: "confirm",
    payload: { editionId: "edition-1", start: 4, end: 6 },
  };
  d = execute(d, c);
  assert.equal(execute(d, c), d);
  assert.throws(
    () => execute(d, { ...c, payload: { ...c.payload, end: 7 } }),
    /REQUEST_CONFLICT/,
  );
  assert.equal(d.commands.at(-1).content.length, 64);
});
test("a renamed identical PDF does not duplicate a book, while another edition has independent notes and progress", () => {
  let d = base();
  const book = d.books[0],
    edition = d.editions[0];
  const same = command(d, "register", {
    book: { ...book, id: "another" },
    edition: {
      ...edition,
      id: "another-edition",
      bookId: "another",
      filename: "renamed.pdf",
    },
  });
  assert.equal(same, d);
  d = command(d, "note", {
    note: {
      id: "note-1",
      bookId: book.id,
      editionId: edition.id,
      page: 14,
      scope: "page",
      quote: "",
      rectangles: [],
      body: "My independent note",
      tags: [],
    },
  });
  d = command(d, "confirm", { editionId: edition.id, start: 14, end: 14 });
  d = command(d, "register", {
    bookId: book.id,
    edition: {
      ...edition,
      id: "edition-2",
      fingerprint: "b".repeat(64),
      pageCount: 40,
      label: "Second",
    },
  });
  assert.equal(d.notes[0].editionId, "edition-1");
  assert.equal(coverage(d, "edition-2").completed, 0);
  d = command(d, "book", { id: book.id, changes: { archived: true } });
  assert.equal(d.notes[0].body, "My independent note");
  assert.equal(d.editions.length, 2);
});
test("weekly reports distinguish first-time pages and rereading and use Cairo calendar dates at midnight", () => {
  let d = command(
    base(),
    "confirm",
    { editionId: "edition-1", start: 10, end: 12 },
    "2026-10-28T10:00:00Z",
  );
  d = command(
    d,
    "confirm",
    { editionId: "edition-1", start: 11, end: 15 },
    "2026-11-03T23:30:00Z",
  );
  assert.deepEqual(weekStats(d, "2026-11-04", "2026-11-05"), {
    newPages: 3,
    rereadPages: 2,
    visitedPages: 0,
    books: 1,
    confirmations: 1,
  });
  assert.equal(weekStats(d, "2026-11-03", "2026-11-04").newPages, 0);
});
test("invalid anchors, out-of-range pages and rectangles cannot silently attach to a book", () => {
  const d = base(),
    note = {
      id: "n",
      bookId: "book-1",
      editionId: "edition-1",
      page: 3,
      scope: "selection",
      quote: "word",
      rectangles: [{ x: 0.9, y: 0.2, width: 0.3, height: 0.1 }],
      body: "note",
      tags: [],
    };
  assert.throws(() => command(d, "note", { note }), /RECTANGLE/);
  assert.throws(
    () => command(d, "confirm", { editionId: "edition-1", start: 20, end: 10 }),
    /PAGE_RANGE/,
  );
  assert.throws(
    () => command(d, "note", { note: { ...note, rectangles: [], page: 31 } }),
    /PAGE_RANGE/,
  );
  assert.throws(
    () =>
      command(d, "note", {
        note: { ...note, rectangles: [], scope: "unknown" },
      }),
    /ANCHOR/,
  );
});
test("graph context contains only explicitly added nodes, keeps reasons, and folds cyclic branches safely", () => {
  const nodes = ["root", "child", "unlinked"].map((id, i) => ({
    id,
    kind: "idea",
    title: id,
    refId: "",
    x: i * 100,
    y: 100,
    collapsed: false,
  }));
  const map = {
    id: "map",
    title: "My question",
    topics: ["UX"],
    rootId: "root",
    nodes,
    edges: [
      {
        id: "e",
        source: "root",
        target: "child",
        kind: "deepens",
        reason: "A specific reason",
      },
      {
        id: "back",
        source: "child",
        target: "root",
        kind: "contrasts",
        reason: "A different perspective",
      },
    ],
  };
  assert.equal(visibleGraph(map).nodes.length, 3);
  assert.equal(
    visibleGraph({
      ...map,
      nodes: nodes.map((n) =>
        n.id === "root" ? { ...n, collapsed: true } : n,
      ),
    }).nodes.length,
    2,
  );
  assert(
    arrangeGraph(map).every(
      (n) => Number.isFinite(n.x) && Number.isFinite(n.y),
    ),
  );
  const d = command(base(), "map", { map });
  assert.equal(d.maps[0].edges[0].reason, "A specific reason");
  assert.throws(
    () =>
      command(base(), "map", {
        map: { ...map, edges: [{ ...map.edges[0], reason: "" }] },
      }),
    /EDGE/,
  );
  assert.equal(d.books.length, 1);
});
test("completing a goal requires synthesis, application and review and never changes reading automatically", () => {
  const d = base(),
    goal = {
      id: "g",
      title: "Learn a practice",
      question: "What works?",
      ranges: [],
      summary: "",
      application: "",
      review: "",
      reviewAt: "",
      founderLink: "",
      stage: "done",
    };
  assert.throws(() => command(d, "goal", { goal }), /REVIEW_REQUIRED/);
  const next = command(d, "goal", {
    goal: {
      ...goal,
      summary: "My synthesis",
      application: "A bounded trial",
      review: "What changed and what remains",
    },
  });
  assert.equal(next.reading.length, 0);
  assert.equal(coverage(next, "edition-1").percent, 0);
});

test("the account library stays isolated and personal PDFs remain outside the source tree", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const routes = readFileSync("src/app/routes.ts", "utf8");
  assert.match(
    routes,
    /route\("learning\/\*", "features\/learning-library\/LearningLibraryPage.tsx"\)/,
  );
  const adapter = readFileSync(
    "src/app/features/learning-library/LibraryContext.tsx",
    "utf8",
  );
  assert.match(adapter, /account-repository/);
  assert.match(adapter, /import.meta.env.DEV/);
  assert.match(readFileSync(".dockerignore", "utf8"), /^preview\/?$/m);
  const root = "src/app/features/learning-library";
  function files(path) {
    return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(path + "/" + e.name) : [path + "/" + e.name],
    );
  }
  for (const path of files(root)) {
    assert.ok(!/\.(pdf|epub)$/i.test(path));
    if (!/\.(tsx?|mjs|mts)$/.test(path)) continue;
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*\()['"][^'"]*(?:career-consulting|founder-workspace|strategic-relationships|journey|ux-lab|marketing)[^'"]*['"]/,
      "Learning cannot import another domain’s internals: " + path,
    );
    assert.doesNotMatch(
      source,
      /PrismaService|prisma\.|cv-storage|uploads\/cv/,
      "Learning cannot own another domain’s data or files",
    );
  }
});
