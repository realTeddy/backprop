export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Your mastery map will appear here once the curriculum graph and
          onboarding are wired up.
        </p>
      </div>
      <div className="rounded-md border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700">
        Phase A scaffold — auth and DB are live; curriculum graph ships in Phase B.
      </div>
    </div>
  );
}
