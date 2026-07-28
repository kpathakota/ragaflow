import { AppFrame } from "@/components/app-frame";

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppFrame>{children}</AppFrame>;
}
