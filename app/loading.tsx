export default function Loading() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="flex items-center justify-between">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-8 w-28 animate-pulse rounded-lg bg-surface-2" />
      </div>
      <div className="h-12 animate-pulse rounded-xl bg-surface-2" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-36 animate-pulse rounded-2xl bg-surface-2" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
