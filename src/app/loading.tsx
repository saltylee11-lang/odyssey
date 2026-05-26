import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full">
      <div className="text-center py-8 space-y-4">
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-8 w-24 mx-auto mt-4" />
        <Skeleton className="h-12 w-20 mx-auto rounded-full mt-6" />
      </div>
      <div className="flex flex-col gap-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </main>
  );
}
