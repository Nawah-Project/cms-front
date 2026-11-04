import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Book, Command, Edition, LibraryDocument } from "./domain/types";
import { uid } from "./domain/model.mjs";
import { useAuth } from "../auth/store/authStore";
import type { LearningRepository } from "./infrastructure/repository";
import { fingerprint, inspectPdf, openPdf } from "./reader/pdf";
import { canAdminAccess } from "../../platform/access/adminAccess";
type Value = {
  canWrite: boolean;
  document: LibraryDocument;
  busy: boolean;
  error: string;
  externalChange: boolean;
  files: Map<string, File>;
  draft: boolean;
  setDraft(value: boolean): void;
  commit(type: string, payload: Command["payload"]): Promise<boolean>;
  reload(): Promise<void>;
  register(file: File, bookId?: string): Promise<string | undefined>;
  attach(file: File, editionId: string): Promise<boolean>;
  forget(editionId: string): void;
  clearError(): void;
};
const Context = createContext<Value | null>(null);
export const useLibrary = () => {
  const value = useContext(Context);
  if (!value) throw Error("Library provider missing");
  return value;
};
export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const canWrite = canAdminAccess(user, "LEARNING_LIBRARY", "WRITE");
  const [document, setDocument] = useState<LibraryDocument | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [externalChange, setExternal] = useState(false),
    [draft, setDraft] = useState(false),
    [files, setFiles] = useState(new Map<string, File>());
  const repository = useRef<LearningRepository | null>(null),
    latest = useRef(document),
    queue = useRef<Promise<unknown>>(Promise.resolve());
  latest.current = document;
  useEffect(() => {
    let closed = false;
    let repo: LearningRepository | undefined,
      unsubscribe: (() => void) | undefined;
    if (!user?.id) return;
    const opening =
      import.meta.env.DEV && import.meta.env.VITE_LEARNING_PREVIEW === "true"
        ? import("./infrastructure/preview-repository").then((x) =>
            x.openPreviewRepository(user.id),
          )
        : import("./infrastructure/account-repository").then((x) =>
            x.openAccountRepository(user.id),
          );
    opening
      .then(async (value) => {
        repo = value;
        if (closed) {
          repo.close();
          return;
        }
        repository.current = repo;
        unsubscribe = repo.subscribe(() => setExternal(true));
        const initial = await repo.load();
        if (!closed) setDocument(initial);
      })
      .catch(() => setError("STORAGE_UNAVAILABLE"));
    return () => {
      closed = true;
      unsubscribe?.();
      repo?.close();
      repository.current = null;
      setFiles(new Map());
    };
  }, [user?.id]);
  const reload = useCallback(async () => {
    if (repository.current) {
      const value = await repository.current.load();
      latest.current = value;
      setDocument(value);
      setExternal(false);
      setError("");
    }
  }, []);
  const commit = useCallback(
    (type: string, payload: Command["payload"]): Promise<boolean> => {
      if (!canWrite) {
        setError("PERMISSION_DENIED");
        return Promise.resolve(false);
      }
      // Queue this tab's autosaves; an external revision still fails CAS and keeps the draft.
      const request: Command = {
        id: uid(),
        type,
        payload: structuredClone(payload),
      };
      const operation = queue.current.then(async () => {
        if (!repository.current || !latest.current) {
          setError("SAVE_FAILED");
          return false;
        }
        try {
          const result = await repository.current.commit(
            latest.current.revision,
            request,
          );
          latest.current = result;
          setDocument(result);
          setExternal(false);
          setError("");
          return true;
        } catch (e) {
          setError(e instanceof Error ? e.message : "SAVE_FAILED");
          return false;
        }
      });
      queue.current = operation.catch(() => undefined);
      return operation;
    },
    [canWrite],
  );
  const remember = (editionId: string, file: File) =>
    setFiles((old) => new Map(old).set(editionId, file));
  async function attach(file: File, editionId: string) {
    setBusy(true);
    try {
      if (file.size > 500 * 1024 ** 2 || file.size === 0)
        throw Error("FILE_SIZE");
      const hash = await fingerprint(file);
      if (
        latest.current?.editions.find((x) => x.id === editionId)
          ?.fingerprint !== hash
      ) {
        setError("DIFFERENT_EDITION");
        return false;
      }
      remember(editionId, file);
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "FILE_FAILED");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function register(file: File, bookId?: string) {
    setBusy(true);
    let handle: Awaited<ReturnType<typeof openPdf>> | undefined;
    try {
      if (file.size > 500 * 1024 ** 2 || file.size === 0)
        throw Error("FILE_SIZE");
      const hash = await fingerprint(file),
        old = latest.current?.editions.find((x) => x.fingerprint === hash);
      if (old) {
        remember(old.id, file);
        setError("");
        return old.bookId;
      }
      handle = await openPdf(file, async (retry) =>
        window.prompt(
          retry
            ? "كلمة المرور غير صحيحة / Incorrect password"
            : "كلمة مرور PDF / PDF password",
        ),
      );
      const inspection = await inspectPdf(handle),
        at = new Date().toISOString(),
        id = bookId || uid(),
        editionId = uid();
      const headings = inspection.outline
        .filter((x, i, a) => a.findIndex((y) => y.page === x.page) === i)
        .sort((a, b) => a.page - b.page);
      const edition: Edition = {
        id: editionId,
        bookId: id,
        label: bookId
          ? "نسخة إضافية / Additional edition"
          : "النسخة الأولى / First edition",
        fingerprint: hash,
        bytes: file.size,
        filename: file.name,
        pageCount: inspection.pageCount,
        storage: "local",
        pageLabels: inspection.pageLabels,
        chapters: headings.map((x, i) => ({
          id: uid(),
          title: x.title,
          start: x.page,
          end: (headings[i + 1]?.page || inspection.pageCount + 1) - 1,
        })),
        createdAt: at,
      };
      const book: Book = {
        id,
        title: (
          inspection.title.trim() || file.name.replace(/\.pdf$/i, "")
        ).slice(0, 300),
        author: inspection.author,
        purpose: "",
        cover: inspection.cover,
        subjects: [],
        sectors: [],
        tags: [],
        status: "planned",
        archived: false,
        currentEditionId: editionId,
        createdAt: at,
      };
      if (!(await commit("register", { book, edition, bookId }))) return;
      remember(editionId, file);
      return id;
    } catch (e) {
      setError(e instanceof Error ? e.message : "FILE_FAILED");
    } finally {
      await handle?.close().catch(() => undefined);
      setBusy(false);
    }
  }
  if (!document)
    return (
      <div role="status" className="ll-message">
        {error === "ACCOUNT_ADAPTER_PENDING"
          ? "المكتبة لم تُفعّل على حساب الإنتاج بعد. / Account library is not enabled yet."
          : error
            ? "تعذر فتح المكتبة. تحقق من الاتصال وتسجيل الدخول ثم أعد تحميل الصفحة؛ لم ننتقل إلى حفظ محلي بديل. / Library unavailable. Check connection and session, then reload; no local fallback was used."
            : "جارٍ فتح المكتبة… / Opening library…"}
      </div>
    );
  return (
    <Context.Provider
      value={{
        canWrite,
        document,
        busy,
        error,
        externalChange,
        files,
        draft,
        setDraft,
        commit,
        reload,
        register,
        attach,
        forget: (id) =>
          setFiles((old) => {
            const copy = new Map(old);
            copy.delete(id);
            return copy;
          }),
        clearError: () => setError(""),
      }}
    >
      {children}
    </Context.Provider>
  );
}
