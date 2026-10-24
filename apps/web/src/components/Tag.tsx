import type { SourceKind } from "@npl/cricket-core";

const LABEL: Record<SourceKind | "pending" | "assumed", { text: string; cls: string }> = {
  official_confirmed: { text: "Official", cls: "" },
  admin_reported: { text: "Editor reported", cls: "tag--admin" },
  provisional_live: { text: "Provisional · live", cls: "tag--prov" },
  historical_imported: { text: "Historical · Cricsheet", cls: "tag--hist" },
  model_estimated: { text: "Model estimate", cls: "tag--prov" },
  hypothetical: { text: "Hypothetical", cls: "tag--prov" },
  unavailable: { text: "Unavailable", cls: "tag--pending" },
  pending: { text: "Pending approval", cls: "tag--pending" },
  assumed: { text: "Provisional rules", cls: "tag--prov" },
};

/** Provenance label. Every number on the site sits near one of these. */
export function Tag({ kind, children }: { kind: keyof typeof LABEL; children?: React.ReactNode }) {
  const l = LABEL[kind];
  return <span className={`tag ${l.cls}`}>{children ?? l.text}</span>;
}
