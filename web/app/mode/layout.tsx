import { AppFrame } from "@/components/app-frame";

export default function ModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppFrame>{children}</AppFrame>;
}
