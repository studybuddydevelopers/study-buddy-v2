import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function CollectionComingSoon({
  title,
  materialType,
  backHref,
}: {
  title: string;
  materialType: string;
  backHref: string;
}) {
  return (
    <div className="w-[90vw] max-w-4xl mx-auto py-10 space-y-8">
      <div className="space-y-8">
        <Link
          href={backHref}
          className="text-sm font-semibold text-primary-600 hover:underline"
        >
          Back to {materialType}
        </Link>

        <div className="rounded-lg border border-accent-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase text-primary-600">
              {materialType}
            </p>
            <h1 className="text-4xl font-bold tracking-normal text-gray-900">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-gray-600">
              Mathematics will appear here first. This collection page is ready
              for the next content pass.
            </p>
          </div>

          <Link
            href="/materials"
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-primary-500 px-4 py-3 text-sm font-semibold text-primary-500 transition hover:bg-primary-500 hover:text-background"
          >
            Study Materials
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
