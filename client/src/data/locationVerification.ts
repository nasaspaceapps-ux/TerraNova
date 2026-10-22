import reportJson from "../../../data/scientific_audit_report.json";
import progressJson from "../../../data/verification_progress.json";
import type { Site } from "@/data/sites";

export type ScientificAuditRecord = {
  id: string;
  site_name: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | string;
  risk: "HIGH" | "MEDIUM" | "LOW" | string;
  verdict: string;
  sources: string[];
  corrections: string[];
  supported_claims: string[];
  unverifiable_claims: string[];
};

type ScientificAuditReport = {
  reviewedRows: number;
  policy: string;
  summary: {
    verdictCounts: Record<string, number>;
    confidenceCounts: Record<string, number>;
    riskCounts: Record<string, number>;
  };
  records: ScientificAuditRecord[];
};

export const scientificAudit = reportJson as ScientificAuditReport;

export function auditForSite(site: Site): ScientificAuditRecord | null {
  if (site.origin !== "excel" || !site.spreadsheetRow) return null;
  return scientificAudit.records.find((record) => record.id === String(site.spreadsheetRow)) ?? null;
}

export const scientificAuditSummary = {
  reviewedRows: scientificAudit.reviewedRows,
  totalRecords: scientificAudit.records.length,
  primaryReviewedRows: progressJson.completed.length,
  pendingPrimaryRows: progressJson.notCompletedRows.length,
  partlySupported: scientificAudit.summary.verdictCounts.PARTLY_SUPPORTED ?? 0,
  highConfidence: scientificAudit.summary.confidenceCounts.HIGH ?? 0,
  mediumConfidence: scientificAudit.summary.confidenceCounts.MEDIUM ?? 0,
  highRisk: scientificAudit.summary.riskCounts.HIGH ?? 0,
  supportedClaims: scientificAudit.records.reduce((sum, record) => sum + record.supported_claims.length, 0),
  unresolvedClaims: scientificAudit.records.reduce((sum, record) => sum + record.unverifiable_claims.length, 0),
  corrections: scientificAudit.records.reduce((sum, record) => sum + record.corrections.length, 0),
};
