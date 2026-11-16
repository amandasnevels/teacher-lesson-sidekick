/** CHAMPS classroom expectations: starter presets (classroom-wide, no student data). */

export const CHAMPS_FIELDS = [
  { key: "C", label: "Conversation" },
  { key: "H", label: "Help" },
  { key: "A", label: "Activity" },
  { key: "M", label: "Movement" },
  { key: "P", label: "Participation" },
  { key: "S", label: "Success" },
] as const;

export type ChampsKey = (typeof CHAMPS_FIELDS)[number]["key"];
export type ChampsExpectations = Record<ChampsKey, string>;

export const CHAMPS_PRESETS = [
  { id: "wholeGroup", name: "Whole Group" },
  { id: "smallGroup", name: "Small Group" },
  { id: "stations", name: "Stations" },
  { id: "independent", name: "Independent Work" },
  { id: "partner", name: "Partner Work" },
  { id: "transitions", name: "Transitions" },
  { id: "assessments", name: "Assessments" },
  { id: "teacherTable", name: "Teacher-Led Table" },
] as const;

export type ChampsPresetId = (typeof CHAMPS_PRESETS)[number]["id"];

export const DEFAULT_CHAMPS: Record<ChampsPresetId, ChampsExpectations> = {
  wholeGroup: {
    C: "Level 0–1. Listen and speak when called on.",
    H: "Raise your hand and wait.",
    A: "Follow the class lesson.",
    M: "Stay in your learning spot.",
    P: "Listen and respond when cued.",
    S: "Explain what we learned.",
  },
  smallGroup: {
    C: "Level 1–2. Talk with your group.",
    H: "Ask your group, then signal the teacher.",
    A: "Work on the group task.",
    M: "Stay with your group.",
    P: "Take turns and share ideas.",
    S: "Everyone contributes.",
  },
  stations: {
    C: "Level 2. Talk with your station group.",
    H: "Check the directions, then ask your group.",
    A: "Complete the station task.",
    M: "Rotate on the signal.",
    P: "Do your part and share materials.",
    S: "Finish the task and reset the station.",
  },
  independent: {
    C: "Level 0. Work silently.",
    H: "Reread the directions, then signal the teacher.",
    A: "Complete your own assignment.",
    M: "Stay in your work spot.",
    P: "Get started and keep working.",
    S: "Check your work before turning it in.",
  },
  partner: {
    C: "Level 2. Talk with your partner.",
    H: "Ask your partner, then signal the teacher.",
    A: "Work through the task together.",
    M: "Stay in your partner spot.",
    P: "Take turns talking and listening.",
    S: "Both partners can explain the work.",
  },
  transitions: {
    C: "Level 0–1. Move quietly.",
    H: "Signal the teacher if you need help.",
    A: "Put away materials and get ready.",
    M: "Walk directly to your next spot.",
    P: "Move when you hear the signal.",
    S: "Be in place with materials ready.",
  },
  assessments: {
    C: "Level 0. Work silently.",
    H: "Raise your hand and wait for the teacher.",
    A: "Follow directions and do your own work.",
    M: "Stay seated unless directed.",
    P: "Read carefully and do your best.",
    S: "Review and submit as directed.",
  },
  teacherTable: {
    C: "Level 1. Use a quiet voice.",
    H: "Ask the teacher at your table.",
    A: "Practice the skill with your teacher.",
    M: "Stay at the table until dismissed.",
    P: "Follow the model and take your turn.",
    S: "Show the skill on your turn.",
  },
};

export interface ChampsConfig {
  active: ChampsPresetId;
  presets: Record<ChampsPresetId, ChampsExpectations>;
}

export function defaultChampsConfig(): ChampsConfig {
  return { active: "wholeGroup", presets: JSON.parse(JSON.stringify(DEFAULT_CHAMPS)) };
}

/** Saved text for a preset, falling back to the starter wording for anything missing. */
export function expectationsFor(config: Partial<ChampsConfig> | undefined, id: ChampsPresetId): ChampsExpectations {
  return { ...DEFAULT_CHAMPS[id], ...(config?.presets?.[id] ?? {}) };
}

export function isPresetId(v: unknown): v is ChampsPresetId {
  return typeof v === "string" && CHAMPS_PRESETS.some((p) => p.id === v);
}

export const presetName = (id: ChampsPresetId) => CHAMPS_PRESETS.find((p) => p.id === id)?.name ?? "";
