import type { Metadata } from "next";
import { TableView } from "@/components/TableView";

export const metadata: Metadata = { title: "Table" };

export default function TablePage() {
  return <TableView seasonId="s3" />;
}
