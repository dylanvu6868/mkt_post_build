import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly while a Hub route's JS chunk + data load, so navigation
// between tools never shows a blank/frozen content area.
export default function HubLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
