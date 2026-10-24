import type { Metadata } from "next";
import { RecordsView } from "@/components/RecordsView";

export const metadata: Metadata = { title: "Records" };

export default function RecordsPage() {
  return <RecordsView />;
}
