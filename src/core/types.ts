import type { AbilityPhase, ToolName } from "../abilities/registry.js";

export interface AbilityUse {
  name: string;
  params: Record<string, string | number | boolean>;
}

export interface JobOutputs {
  outDir?: string;
  suffix?: string;
  overwrite?: boolean;
  keepStructure?: boolean;
}

export interface JobReportConfig {
  json?: boolean;
  path?: string;
}

export interface JobSpec {
  inputs: string[];
  uses: AbilityUse[];
  outputs?: JobOutputs;
  report?: JobReportConfig;
  failFast?: boolean;
}

export interface BasicInspectInfo {
  path: string;
  width: number;
  height: number;
  bands: number;
  format: string;
  colorSpace?: string;
  orientation?: string;
  hasAlpha: boolean;
  bytes: number;
}

export interface InspectResult {
  path: string;
  basic?: BasicInspectInfo;
  metadata?: Record<string, unknown>;
  capabilities?: ToolCapabilitySnapshot;
}

export interface ToolCapability {
  tool: ToolName;
  binary: string;
  available: boolean;
  version?: string;
  details?: Record<string, unknown>;
  error?: string;
}

export interface ToolCapabilitySnapshot {
  tools: Record<ToolName, ToolCapability>;
}

export interface MetadataDiffEntry {
  key: string;
  before?: unknown;
  after?: unknown;
}

export interface RunCommandRecord {
  tool: string;
  command: string[];
}

export type RunStatus = "success" | "skipped_larger" | "failed";

export interface RunResultItem {
  input: string;
  output?: string;
  status: RunStatus;
  failureCode?: number;
  bytesBefore?: number;
  bytesAfter?: number;
  widthBefore?: number;
  heightBefore?: number;
  widthAfter?: number;
  heightAfter?: number;
  formatBefore?: string;
  formatAfter?: string;
  warnings: string[];
  commands: RunCommandRecord[];
  metadataDiff?: MetadataDiffEntry[];
  error?: string;
}

export interface RunResult {
  status: "success" | "partial" | "failed";
  items: RunResultItem[];
  generatedAt: string;
}

export interface ResolvedPipeline {
  phaseUses: Record<AbilityPhase, AbilityUse[]>;
  outputs: Required<Pick<JobOutputs, "overwrite" | "keepStructure">> & JobOutputs;
  report: JobReportConfig;
  failFast: boolean;
  format?: "jpg" | "png" | "webp";
  targetMaxBytes?: number;
  skipIfLarger: boolean;
  metadataMode: "strip-all-meta" | "keep-basic-meta" | "none";
  keepTimestamps: boolean;
  copySourceDates: boolean;
  auditMetaDiff: boolean;
  keepAlpha: boolean;
  dropAlphaWithBg?: string;
  flattenBg?: string;
}
