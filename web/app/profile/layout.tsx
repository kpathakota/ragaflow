import { AppFrame } from "@/components/app-frame";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppFrame>{children}</AppFrame>;
}
