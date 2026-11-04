import { useRef, useState } from "react";
import { useLibrary } from "./LibraryContext";
import type { Goal } from "./domain/types";
import { Dialog, readerUrl, useWords } from "./ui";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../auth/store/authStore";
import { canAdminAccess } from "../../platform/access/adminAccess";
export function FounderLink({ goal }: { goal: Goal }) {
  const { document, commit, canWrite } = useLibrary(),
    { user } = useAuth(),
    t = useWords(),
    [open, setOpen] = useState(false),
    [plan, setPlan] = useState<any>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    attempt = useRef(crypto.randomUUID());
  const allowed = canAdminAccess(user, "FOUNDER_WORKSPACE", "READ");
  async function load() {
    try {
      const list = await apiClient.get<{ items: { id: string }[] }>(
        "/admin/founder-workspace/plans",
      );
      if (!list.items.length) {
        setError(
          t(
            "افتح مساحة المؤسس وأنشئ خطتك أولًا.",
            "Open Founder workspace and create your plan first.",
          ),
        );
        return;
      }
      setPlan(
        await apiClient.get(
          "/admin/founder-workspace/plans/" + list.items[0].id,
        ),
      );
    } catch {
      setError(
        t(
          "تعذر فتح خطة المؤسس. المكتبة تظل متاحة.",
          "Founder plan unavailable. The library remains available.",
        ),
      );
    }
  }
  async function link(taskId: string) {
    if (
      await commit("goal", {
        goal: {
          ...goal,
          founderLink:
            "/admin/founder-workspace/today?task=" + encodeURIComponent(taskId),
        },
      })
    )
      setOpen(false);
    else
      setError(
        t(
          "المهمة موجودة في المؤسس؛ تعذر حفظ مرجعها هنا. أعد الربط بعد تحميل التحديثات.",
          "The task exists in Founder; its link could not be saved here. Reload updates and link again.",
        ),
      );
  }
  return (
    <>
      {goal.founderLink && (
        <a className="ll-button" href={goal.founderLink}>
          {t("افتح المهمة المرتبطة", "Open linked task")}
        </a>
      )}
      <button
        className="ll-button"
        disabled={!allowed || !canWrite}
        onClick={() => {
          setOpen(true);
          setError("");
          void load();
        }}
      >
        {t("ربط بجدولة المؤسس", "Link Founder scheduling")}
      </button>
      {open && (
        <Dialog
          title={t(
            "الجدولة تظل في مساحة المؤسس",
            "Scheduling stays in Founder workspace",
          )}
          onClose={() => setOpen(false)}
        >
          {error && <p role="alert">{error}</p>}
          {plan && (
            <>
              <p>
                {t(
                  "اختر مهمة موجودة، أو أنشئ مهمة تعلم صراحةً. لن يُعاد ترتيب خطتك أو إنجاز أي مهمة تلقائيًا.",
                  "Choose an existing task or explicitly create a learning task. Your plan is not rearranged and no task is completed automatically.",
                )}
              </p>
              <form
                className="ll-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void link(String(new FormData(e.currentTarget).get("task")));
                }}
              >
                <label>
                  {t("مهمة موجودة", "Existing task")}
                  <select name="task" required>
                    {plan.document.tasks
                      .filter((x: any) => !x.archived)
                      .map((x: any) => (
                        <option key={x.id} value={x.id}>
                          {x.title}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className="ll-button"
                  disabled={!plan.document.tasks.length}
                >
                  {t("اربط المهمة فقط", "Link task only")}
                </button>
              </form>
              <details>
                <summary>
                  {t("إنشاء مهمة جديدة باختياري", "Explicitly create a task")}
                </summary>
                <form
                  className="ll-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSaving(true);
                    setError("");
                    const f = new FormData(e.currentTarget),
                      edition = document.editions.find(
                        (x) => x.id === goal.editionId,
                      );
                    try {
                      const result = await apiClient.post<any>(
                        "/admin/founder-workspace/plans/" + plan.id + "/tasks",
                        {
                          requestId: attempt.current,
                          taskId: attempt.current,
                          expectedRevision: plan.revision,
                          title: String(f.get("title")),
                          cycleId: String(f.get("cycle")),
                          laneId: String(f.get("lane")),
                          start: String(f.get("start")),
                          end: String(f.get("end")),
                          hours: Number(f.get("hours")),
                          resourceUrl:
                            window.location.origin +
                            (edition
                              ? readerUrl(
                                  edition.bookId,
                                  edition.id,
                                  goal.ranges[0]?.start,
                                )
                              : "/admin/learning/practice"),
                        },
                      );
                      setPlan(result);
                      await link(attempt.current);
                    } catch {
                      setError(
                        t(
                          "لم تكتمل العملية؛ احتفظنا باختيارك. حدّث خطة المؤسس ثم أعد المحاولة.",
                          "The operation did not finish; your choices remain. Reload the Founder plan and retry.",
                        ),
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <label>
                    {t("اسم المهمة", "Task title")}
                    <input
                      required
                      maxLength={220}
                      name="title"
                      defaultValue={goal.title.slice(0, 220)}
                    />
                  </label>
                  <label>
                    {t("الدورة", "Cycle")}
                    <select
                      name="cycle"
                      defaultValue={plan.document.settings.currentCycleId}
                    >
                      {plan.document.cycles.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.titleAr + " · " + c.start + "–" + c.end}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("المسار", "Lane")}
                    <select name="lane">
                      {plan.document.lanes.map((l: any) => (
                        <option key={l.id} value={l.id}>
                          {l.labelAr + " / " + l.labelEn}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="ll-two">
                    <label>
                      {t("البداية", "Start")}
                      <input
                        required
                        type="date"
                        name="start"
                        defaultValue={
                          goal.reviewAt ||
                          plan.document.cycles.find(
                            (c: any) =>
                              c.id === plan.document.settings.currentCycleId,
                          )?.start
                        }
                      />
                    </label>
                    <label>
                      {t("النهاية", "End")}
                      <input
                        required
                        type="date"
                        name="end"
                        defaultValue={
                          goal.reviewAt ||
                          plan.document.cycles.find(
                            (c: any) =>
                              c.id === plan.document.settings.currentCycleId,
                          )?.start
                        }
                      />
                    </label>
                  </div>
                  <label>
                    {t("الجهد بالساعات", "Effort in hours")}
                    <input
                      required
                      name="hours"
                      type="number"
                      min={0}
                      max={1000}
                      step={0.25}
                      defaultValue={1}
                    />
                  </label>
                  <p>
                    {t(
                      "هذه إضافة جديدة للخطة؛ راجع السعة والتعارضات في جدول المؤسس. لا يُحرك النظام مهامك الأخرى.",
                      "This adds work to your plan. Review capacity and conflicts in Founder timeline. Other tasks are not moved.",
                    )}
                  </p>
                  <button
                    className="ll-button primary"
                    disabled={
                      saving ||
                      !canAdminAccess(user, "FOUNDER_WORKSPACE", "WRITE")
                    }
                  >
                    {t("إنشاء المهمة وربطها", "Create and link task")}
                  </button>
                  <button
                    type="button"
                    className="ll-button"
                    onClick={() => void load()}
                  >
                    {t(
                      "تحميل أحدث خطة مع إبقاء الاختيارات",
                      "Load latest plan; keep choices",
                    )}
                  </button>
                </form>
              </details>
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
