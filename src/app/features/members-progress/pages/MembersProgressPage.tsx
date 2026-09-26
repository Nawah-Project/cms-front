import { useAuth } from "../../auth/store/authStore";
import { useMembersProgress } from "../hooks/useMembersProgress";
import { MembersProgressTable } from "../components/MembersProgressTable";
import { SpinnerIcon } from "../../../components/Icons";

export default function MembersProgressPage() {
  const { user } = useAuth();
  const { members, loading, error, retry } = useMembersProgress();

  return (
    <section className="space-y-8">
      <header className="border-b border-stone-300/80 pb-7 dark:border-neutral-800">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 sm:text-4xl">
          Members Progress
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Your group’s application progress.
        </p>
      </header>

      {loading ? (
        <div
          className="flex min-h-56 flex-col items-center justify-center border-y border-stone-200 text-sm text-neutral-500 dark:border-neutral-800"
          role="status"
        >
          <SpinnerIcon className="mb-3 h-6 w-6" />
          <span>Loading members progress…</span>
        </div>
      ) : error ? (
        <div
          className="border-y border-stone-200 py-8 text-center dark:border-neutral-800"
          role="alert"
        >
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {error === "unassigned"
              ? "Your account isn’t assigned to a group yet."
              : "We couldn’t load members progress."}
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {error === "unassigned"
              ? "Contact your workspace administrator to get access."
              : "Please check your connection and try again."}
          </p>
          {error === "general" && (
            <button
              type="button"
              onClick={() => void retry()}
              className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Try again
            </button>
          )}
        </div>
      ) : members.length === 0 ? (
        <div className="border-y border-stone-200 px-6 py-16 text-center dark:border-neutral-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No members to display yet.
          </p>
        </div>
      ) : (
        <>
          {members.length === 1 &&
            (members[0].isCurrentUser || members[0].userId === user?.id) && (
              <p className="border-l-2 border-neutral-300 pl-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                You are currently the only member in your group.
              </p>
            )}
          <MembersProgressTable members={members} currentUserId={user?.id} />
        </>
      )}
    </section>
  );
}
