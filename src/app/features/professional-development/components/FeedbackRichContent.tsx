import { createElement, Fragment, type ReactNode } from "react";

type SafeTag =
  | "p"
  | "br"
  | "strong"
  | "b"
  | "em"
  | "i"
  | "u"
  | "s"
  | "ul"
  | "ol"
  | "li"
  | "h2"
  | "h3"
  | "h4"
  | "blockquote"
  | "a"
  | "code"
  | "pre";

type TreeNode = {
  tag: "root" | SafeTag;
  text?: string;
  href?: string;
  children: TreeNode[];
};

const ALLOWED_TAGS = new Set<SafeTag>([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "a",
  "code",
  "pre",
]);

function decodeEntities(value: string): string {
  return value.replace(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (entity, code: string) => {
      const normalized = code.toLowerCase();
      if (normalized === "amp") return "&";
      if (normalized === "lt") return "<";
      if (normalized === "gt") return ">";
      if (normalized === "quot") return '"';
      if (normalized === "apos" || normalized === "#39") return "'";
      if (normalized === "nbsp") return "\u00a0";
      const parsed = normalized.startsWith("#x")
        ? Number.parseInt(normalized.slice(2), 16)
        : Number.parseInt(normalized.slice(1), 10);
      try {
        return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : entity;
      } catch {
        return entity;
      }
    },
  );
}

function safeHref(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function parseSafeContent(content: string): TreeNode {
  const root: TreeNode = { tag: "root", children: [] };
  const stack = [root];
  const tokens = content.match(/<\/?[a-z][^>]*>|[^<]+|</gi) ?? [];

  for (const token of tokens) {
    const closing = token.match(/^<\/([a-z][\w-]*)\s*>$/i);
    if (closing) {
      const tag = closing[1].toLowerCase() as SafeTag;
      let index = stack.length - 1;
      while (index > 0 && stack[index].tag !== tag) index -= 1;
      if (index > 0) stack.length = index;
      continue;
    }

    const opening = token.match(/^<([a-z][\w-]*)\b([^>]*)>$/i);
    if (opening) {
      const tag = opening[1].toLowerCase() as SafeTag;
      if (!ALLOWED_TAGS.has(tag)) continue;
      const node: TreeNode = { tag, children: [] };
      if (tag === "a") {
        const href = opening[2].match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
        node.href = safeHref(href);
      }
      stack[stack.length - 1].children.push(node);
      if (tag !== "br" && !/\/\s*>$/.test(token)) stack.push(node);
      continue;
    }

    stack[stack.length - 1].children.push({
      tag: "root",
      text: decodeEntities(token),
      children: [],
    });
  }
  return root;
}

function renderNode(node: TreeNode, key: number): ReactNode {
  if (node.text !== undefined) return node.text;
  const children = node.children.map((child, index) =>
    renderNode(child, index),
  );
  if (node.tag === "root") return createElement(Fragment, { key }, ...children);
  if (node.tag === "a") {
    if (!node.href) return createElement(Fragment, { key }, ...children);
    return createElement(
      "a",
      {
        key,
        href: node.href,
        target: "_blank",
        rel: "noopener noreferrer nofollow",
        className: "text-info-strong underline underline-offset-2",
      },
      ...children,
    );
  }
  const classes: Partial<Record<SafeTag, string>> = {
    p: "whitespace-pre-wrap leading-7",
    br: "",
    ul: "list-disc space-y-1 ps-6",
    ol: "list-decimal space-y-1 ps-6",
    h2: "text-lg font-semibold text-neutral-900 dark:text-neutral-100",
    h3: "text-base font-semibold text-neutral-900 dark:text-neutral-100",
    h4: "font-semibold text-neutral-900 dark:text-neutral-100",
    blockquote:
      "border-s-2 border-border ps-4 text-neutral-600 dark:text-neutral-300",
    code: "rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-neutral-800",
    pre: "overflow-x-auto rounded-lg bg-neutral-100 p-3 font-mono text-sm dark:bg-neutral-800",
  };
  return createElement(
    node.tag,
    { key, className: classes[node.tag] },
    ...children,
  );
}

export function FeedbackRichContent({
  content,
  preview = false,
}: {
  content: string;
  preview?: boolean;
}) {
  const tree = parseSafeContent(content);
  const rendered = tree.children.map((node, index) => renderNode(node, index));
  if (preview) {
    return (
      <div className="line-clamp-3 break-words whitespace-pre-wrap text-sm leading-6 text-neutral-900 dark:text-neutral-100">
        {rendered}
      </div>
    );
  }
  return (
    <div className="space-y-3 break-words whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-100">
      {rendered}
    </div>
  );
}
