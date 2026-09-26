import { useAuth } from "../store/authStore";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <section className="max-w-2xl space-y-7">
      <header className="border-b border-border pb-6 dark:border-neutral-800">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
          Profile
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Your account details.
        </p>
      </header>
      <dl className="divide-y divide-border rounded-xl border border-border-strong bg-surface px-5 shadow-xs dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 sm:px-7">
        <div className="py-5">
          <dt className="text-xs font-medium text-neutral-500">Name</dt>
          <dd className="mt-1.5 text-base font-medium text-neutral-900 dark:text-neutral-100">
            {user?.name}
          </dd>
        </div>
        <div className="py-5">
          <dt className="text-xs font-medium text-neutral-500">Email</dt>
          <dd className="mt-1.5 text-base text-neutral-800 dark:text-neutral-200">
            {user?.email}
          </dd>
        </div>
      </dl>
    </section>
  );
}
