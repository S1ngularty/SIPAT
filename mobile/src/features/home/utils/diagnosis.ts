import type { TrackResult, VideoAnalysis } from "../../diagnosis/diagnosisTypes";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

/** Highest-confidence detection in an analysis, or null when there are none. */
export const getTopFinding = (analysis: VideoAnalysis): TrackResult | null => {
  const results = analysis.results ?? [];
  if (results.length === 0) return null;

  return results.reduce((best, current) =>
    current.confidence > best.confidence ? current : best,
  );
};

/** Human-readable title: the saved name, the detected crop, or the file name. */
export const getDiagnosisTitle = (analysis: VideoAnalysis): string => {
  const named = analysis.diagnosisName?.trim();
  if (named) return named;

  const crop = getTopFinding(analysis)?.crop?.trim();
  if (crop) return crop;

  return analysis.video?.originalFileName || "Untitled video";
};

/** Short condition/status line shown under the title. */
export const getDiagnosisSubtitle = (analysis: VideoAnalysis): string => {
  const status = analysis.video?.status ?? "processing";

  if (status === "completed") {
    const top = getTopFinding(analysis);
    return top ? top.condition : "Analysis complete";
  }

  switch (status) {
    case "pending_upload":
      return "Waiting to upload";
    case "uploaded":
      return "Queued for analysis";
    case "processing":
      return "Analyzing video";
    case "failed":
      return "Analysis failed";
    default:
      return "Unknown status";
  }
};

export const isProcessing = (analysis: VideoAnalysis): boolean => {
  const status = analysis.video?.status;
  return status === "processing" || status === "uploaded" || status === "pending_upload";
};

export const getStatusTone = (analysis: VideoAnalysis): StatusTone => {
  const status = analysis.video?.status;
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status) return "warning";
  return "neutral";
};

export const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

export type DateBucket = "today" | "yesterday" | "last7Days" | "older";

export const getDateBucket = (dateString?: string): DateBucket => {
  if (!dateString) return "older";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "older";

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const ts = date.getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOf7DaysAgo = startOfToday - 6 * 86400000;

  if (ts >= startOfToday) return "today";
  if (ts >= startOfYesterday) return "yesterday";
  if (ts >= startOf7DaysAgo) return "last7Days";
  return "older";
};
