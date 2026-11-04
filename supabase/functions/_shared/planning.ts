import { z } from "zod";
const text = z.string().trim().min(1).max(5000);
export const conceptSchema = z.object({
  id: z.uuid(),
  title: text,
  theme: text,
  activities: z.array(text).min(1).max(12),
  assumptions: z.array(text).min(1).max(12),
});
export const conceptsSchema = z.object({
  concepts: z
    .array(conceptSchema.omit({ id: true }))
    .min(2)
    .max(3),
});
export const proposalDataSchema = z.object({
  title: text,
  objectives: text,
  audience: text,
  theme: text,
  agenda: text,
  assumptions: text,
});
export type ProposalData = z.infer<typeof proposalDataSchema>;
export const proposalSchema = z.object({
  data: proposalDataSchema,
  version: z.number().int().positive(),
  briefVersion: z.number().int().positive(),
  conceptId: z.uuid(),
  status: z.enum(["Draft", "Approved"]),
  author: text,
  createdAt: z.iso.datetime({ offset: true }),
});
export const planningSchema = z.object({
  revision: z.number().int().nonnegative(),
  briefVersion: z.number().int().positive(),
  concepts: z.array(conceptSchema).max(3),
  selectedId: z.uuid().nullable(),
  proposal: proposalSchema.nullable(),
  history: z.array(proposalSchema),
});
export type Planning = z.infer<typeof planningSchema>;
const base = {
  briefId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  briefVersion: z.number().int().positive(),
};
export const planningRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("load"), briefId: z.uuid() }),
  z.object({
    ...base,
    action: z.literal("generateConcepts"),
    confirm: z.boolean().default(false),
  }),
  z.object({ ...base, action: z.literal("select"), conceptId: z.uuid() }),
  z.object({
    ...base,
    action: z.literal("generateProposal"),
    confirm: z.boolean().default(false),
  }),
  z.object({
    ...base,
    action: z.literal("saveProposal"),
    data: proposalDataSchema,
  }),
]);
export type PlanningRequest = z.infer<typeof planningRequestSchema>;
export const emptyPlanning = (briefVersion: number): Planning => ({
  revision: 0,
  briefVersion,
  concepts: [],
  selectedId: null,
  proposal: null,
  history: [],
});
export function proposalText(proposal: z.infer<typeof proposalSchema>) {
  return [
    proposal.data.title,
    "Status: " + proposal.status,
    "Version: " + proposal.version,
    "Brief version: " + proposal.briefVersion,
    "Saved by: " + proposal.author,
    "Saved at: " + proposal.createdAt,
    ...Object.entries(proposal.data)
      .filter(([k]) => k !== "title")
      .map(([k, v]) => "\n" + k.toUpperCase() + "\n" + v),
  ].join("\n");
}
