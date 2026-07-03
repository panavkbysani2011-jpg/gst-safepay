export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-32 animate-pulse rounded-2xl bg-surface-2" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[68px] animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
