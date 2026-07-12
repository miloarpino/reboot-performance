export type UserRole = "coach" | "client" | "admin";
export type Formula = "perte" | "masse" | "maintien";
export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type ContentType =
  | "workout"
  | "program"
  | "recipe"
  | "nutrition_plan"
  | "revision"
  | "dossier"
  | "badge"
  | "challenge"
  | "announcement"
  | "message";

export interface Profile {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ClientProfile extends Profile {
  coachId: string;
  age: number;
  sex: string;
  formula: Formula;
  goal: string;
  level: string;
  sport: string;
  injuries: string[];
  restrictions: string[];
}

export interface PublicationTarget {
  mode: "all" | "manual" | "profile";
  clientIds?: string[];
  formulas?: Formula[];
  goals?: string[];
  sexes?: string[];
  levels?: string[];
  sports?: string[];
  minAge?: number;
  maxAge?: number;
}
