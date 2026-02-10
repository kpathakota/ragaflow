import { notFound } from "next/navigation";
import ragamsData from "@/content/ragams.json";
import { SessionPlayer } from "./session-player";

const validModes = ["focus", "sleep", "meditate"];

export function generateStaticParams() {
  return ragamsData.ragams.map((r) => ({ mode: r.mode, ragamId: r.id }));
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ mode: string; ragamId: string }>;
}) {
  const { mode, ragamId } = await params;

  if (!validModes.includes(mode)) notFound();

  const ragam = ragamsData.ragams.find(
    (r) => r.id === ragamId && r.mode === mode
  );

  if (!ragam) notFound();

  return <SessionPlayer ragam={ragam} mode={mode} />;
}
