export const VERSION = "1.0.0";

export type ConditionStatus =
  | "Damaged - Needs Replacement"
  | "Monitor"
  | "Replaced"
  | "No Issue Found";

export type ReplacementReason = "Bent" | "Improper Placement" | "Forklift Impact" | "Monitor" | "Other";
export type Priority = "Low" | "Medium" | "High" | "Critical";
export type CantileverSide = "Left" | "Right" | "Both" | "Unknown";

export interface CantileverEntry {
  id: string;
  dateReported: string;
  reportedBy: string;
  area: string;
  fullLocation: string;
  aisle: string;
  sectionBay: string;
  level: string;
  exactRackPosition: string;
  cantileverSide: CantileverSide;
  conditionStatus: ConditionStatus;
  reason: string;
  priority: string;
  photoDataUrl?: string;
  notes: string;
  dateRepaired: string;
  repairedBy: string;
  repairAction: string;
  reviewFlag: string;
  source: string;
  followUpNeeded: boolean;
  followUpNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsData {
  associates: string[];
  reasons: string[];
  repairActions: string[];
  priorities: string[];
  areas: string[];
  commonLocations: string[];
}

export const DEFAULT_ASSOCIATES = ["Josh S", "Josh C", "Paul", "Jason", "Merced", "Maintenance", "Other"];
export const DEFAULT_REASONS = ["Bent", "Improper Placement", "Forklift Impact", "Monitor", "Other"];
export const DEFAULT_PRIORITIES = ["Low", "Medium", "High", "Critical"];
export const DEFAULT_AREAS = ["CR Rack", "Customer", "SS1 rack", "Other"];
export const DEFAULT_REPAIR_ACTIONS = [
  "Replaced arm",
  "Adjusted / corrected placement",
  "Monitored only",
  "No repair needed",
  "Turned over to next shift",
  "Other",
];

export const STATUS_OPTIONS: ConditionStatus[] = [
  "Damaged - Needs Replacement",
  "Monitor",
  "Replaced",
  "No Issue Found",
];

export const SIDE_OPTIONS: CantileverSide[] = ["Left", "Right", "Both", "Unknown"];
