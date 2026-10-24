export default function StudentsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-4 border-b border-slate-200/80 pb-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="h-3 w-40 rounded-md bg-slate-200" />
            <div className="h-7 w-64 rounded-lg bg-slate-200" />
            <div className="h-3.5 w-80 rounded-md bg-slate-100" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-32 rounded-xl bg-slate-200" />
            <div className="h-8 w-28 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <div className="h-8 w-32 rounded-xl bg-slate-200" />
        <div className="h-8 w-32 rounded-xl bg-slate-100" />
      </div>

      {/* Content Skeleton */}
      <div className="space-y-4">
        <div className="h-14 rounded-2xl border border-slate-200/70 bg-slate-50" />
        <div className="h-96 rounded-2xl border border-slate-200/70 bg-slate-50" />
      </div>
    </div>
  );
}
