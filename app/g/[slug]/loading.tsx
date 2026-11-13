import { LoadingState } from "@/components/ui/full-screen-loader";

/** Switching tabs keeps the fut's header and tab bar; only the content waits. */
export default function Loading() {
  return (
    <div className="flex justify-center py-20">
      <LoadingState />
    </div>
  );
}
