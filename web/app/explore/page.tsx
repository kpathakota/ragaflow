import { getAllTracks, getAllRagams } from "@/lib/data";
import { NavHeader } from "@/components/nav-header";
import { ExploreClient } from "./explore-client";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const [tracks, ragams] = await Promise.all([getAllTracks(), getAllRagams()]);

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-16">
      <NavHeader
        backHref="/"
        title="Explore"
        titleClass="text-[#C17F59]"
      />

      <main className="w-full max-w-sm">
        <ExploreClient tracks={tracks} ragams={ragams} />
      </main>
    </div>
  );
}
