import { z } from "zod";

export const briefDataSchema = z.object({
  title: z.string().trim().min(3, "Enter at least 3 characters.").max(160),
  client: z.string().trim().min(2, "Enter the client name.").max(160),
  eventType: z.enum([
    "Conference",
    "Product launch",
    "Team building",
    "Gala dinner",
    "Workshop",
    "Other",
  ]),
  date: z.iso.date(),
  venue: z
    .string()
    .trim()
    .min(2, "Enter a venue or proposed location.")
    .max(300),
  attendees: z.number().int().min(1).max(100000),
  budget: z.number().finite().positive().max(1000000000000),
  objectives: z
    .string()
    .trim()
    .min(10, "Describe the objectives in at least 10 characters.")
    .max(5000),
  audience: z.string().trim().max(2000),
  constraints: z.string().trim().max(5000),
});
export type BriefData = z.infer<typeof briefDataSchema>;
export const roleSchema = z.enum(["admin", "member"]);
export const sessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  agencyId: z.string(),
  agencyName: z.string(),
  role: roleSchema,
});
export const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: roleSchema,
});
export const versionSchema = z.object({
  version: z.number().int().positive(),
  data: briefDataSchema,
  author: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
});
export const briefSchema = z.object({
  id: z.string(),
  agencyId: z.string(),
  data: briefDataSchema,
  version: z.number().int().positive(),
  updatedAt: z.iso.datetime({ offset: true }),
  author: z.string(),
  needsReview: z.boolean(),
  history: z.array(versionSchema),
});
export type Brief = z.infer<typeof briefSchema>;
export const workspaceSchema = z.object({
  session: sessionSchema,
  briefs: z.array(briefSchema),
  members: z.array(memberSchema),
});
export type Workspace = z.infer<typeof workspaceSchema>;
export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(160),
  email: z.email(),
  password: z.string().min(12, "Use at least 12 characters.").max(128),
  agencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-F0-9]{16}$/,
      "Enter the 16-character agency code supplied by your administrator.",
    ),
});
export const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("workspace") }),
  z.object({ action: z.literal("signupQueue") }),
  z.object({
    action: z.literal("reviewSignup"),
    requestId: z.uuid(),
    decision: z.enum(["approve", "reject"]),
  }),
  z.object({
    action: z.literal("save"),
    id: z.uuid().optional(),
    expectedVersion: z.number().int().positive().optional(),
    data: briefDataSchema,
  }),
  z.object({ action: z.literal("delete"), id: z.uuid() }),
  z.object({ action: z.literal("role"), memberId: z.uuid(), role: roleSchema }),
  z.object({
    action: z.literal("addMember"),
    email: z.email(),
    name: z.string().trim().min(2).max(160),
    role: roleSchema,
  }),
  z.object({ action: z.literal("removeMember"), memberId: z.uuid() }),
]);
export type ApiRequest = z.infer<typeof requestSchema>;

export const briefFieldLabels: Record<keyof BriefData, string> = {
  title: "Event name",
  client: "Client",
  eventType: "Event type",
  date: "Event date",
  venue: "Venue",
  attendees: "Expected attendees",
  budget: "Client budget (VND)",
  objectives: "Event objectives",
  audience: "Audience profile",
  constraints: "Planning constraints",
};
export function briefChanges(before: BriefData, after: BriefData) {
  return (Object.keys(briefFieldLabels) as (keyof BriefData)[])
    .filter((field) => before[field] !== after[field])
    .map((field) => ({
      field,
      label: briefFieldLabels[field],
      before: before[field],
      after: after[field],
    }));
}

export function readiness(data: BriefData) {
  const missing: { field: string; suggestion: string }[] = [];
  if (!data.audience.trim())
    missing.push({
      field: "Audience profile",
      suggestion: "Who is attending, and what should they take away?",
    });
  if (!data.constraints.trim())
    missing.push({
      field: "Planning constraints",
      suggestion:
        "Confirm access times, dietary needs, accessibility, and technical limits. Enter “None confirmed” if there are no known constraints.",
    });
  return missing;
}

export const signupQueueSchema = z.object({
  registrationCode: z.string().regex(/^[A-F0-9]{16}$/),
  pendingCount: z.number().int().nonnegative(),
  requests: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      email: z.email(),
      status: z.enum(["pending", "approved", "rejected"]),
      emailConfirmed: z.boolean(),
      createdAt: z.iso.datetime({ offset: true }),
      reviewedAt: z.iso.datetime({ offset: true }).nullable(),
      reviewerName: z.string().nullable(),
    }),
  ),
});
export type SignupQueue = z.infer<typeof signupQueueSchema>;
