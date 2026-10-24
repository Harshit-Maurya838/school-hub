export default function AcademicsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-4 border-b border-slate-200/80 pb-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="h-3 w-48 rounded-md bg-slate-200" />
            <div className="h-7 w-72 rounded-lg bg-slate-200" />
            <div className="h-3.5 w-96 rounded-md bg-slate-100" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-36 rounded-xl bg-slate-200" />
            <div className="h-8 w-24 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>

      {/* Sub-nav Tab Skeleton */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <div className="h-8 w-24 rounded-xl bg-slate-200" />
        <div className="h-8 w-24 rounded-xl bg-slate-100" />
        <div className="h-8 w-24 rounded-xl bg-slate-100" />
        <div className="h-8 w-24 rounded-xl bg-slate-100" />
      </div>

      {/* Main Content Skeleton Cards/Table */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-28 rounded-2xl border border-slate-200/70 bg-slate-50 p-4" />
          <div className="h-28 rounded-2xl border border-slate-200/70 bg-slate-50 p-4" />
          <div className="h-28 rounded-2xl border border-slate-200/70 bg-slate-50 p-4" />
        </div>
        <div className="h-64 rounded-2xl border border-slate-200/70 bg-slate-50" />
      </div>
    </div>
  );
}
