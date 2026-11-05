import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readGeminiConfig,
  generateStructured,
  geminiThinkingLevel,
  geminiResponseSchema,
  readVenueConfig,
} from "../supabase/functions/_shared/gemini.ts";
import { z } from "zod";
import { createWorkspaceApi } from "../src/lib/workspace-api.ts";
import { emptyPlanning } from "../supabase/functions/_shared/planning.ts";
import { generatedProposalSchema } from "../supabase/functions/_shared/planning.ts";

const env = (values) => (name) => values[name];

test("venue grounding model can differ from proposal and extraction model", () => {
  const values = {
    GEMINI_API_KEY: "fixture",
    GEMINI_MODEL: "text-flash",
    GEMINI_VENUE_MODEL: " models/search-flash ",
  };
  assert.deepEqual(readVenueConfig(env(values)), {
    apiKey: "fixture",
    model: "search-flash",
    extractionModel: "text-flash",
  });
  assert.equal(readGeminiConfig(env(values)).model, "text-flash");
  assert.equal(
    readVenueConfig(env({ GEMINI_API_KEY: "fixture" })).model,
    "gemini-2.5-flash-lite",
  );
  assert.throws(
    () => readVenueConfig(env({ ...values, GEMINI_VENUE_MODEL: "bad/model" })),
    /GEMINI_VENUE_MODEL is invalid/,
  );
});

test("provider proposal grammar omits expensive bounds but preserves structure and local validation", async () => {
  const wire = geminiResponseSchema(generatedProposalSchema);
  assert.equal(wire.properties.budget.properties.items.maxItems, undefined);
  assert.equal(
    wire.properties.budget.properties.items.items.properties.unitCost.maximum,
    undefined,
  );
  assert.deepEqual(wire.properties.budget.properties.currency.enum, ["VND"]);
  assert.ok(wire.required.includes("budget"));
  assert.match(
    wire.properties.budget.properties.items.description,
    /maxItems=40/,
  );
  const schema = z.object({ amount: z.number().int().min(1).max(10) });
  let calls = 0;
  await assert.rejects(
    () =>
      generateStructured(
        schema,
        {},
        {
          apiKey: "fixture",
          model: "test",
          maxAttempts: 2,
          sleep: async () => {},
          fetcher: async () => {
            calls++;
            return Response.json({
              candidates: [
                {
                  finishReason: "STOP",
                  content: { parts: [{ text: '{"amount":11}' }] },
                },
              ],
            });
          },
        },
      ),
    /invalid response/,
  );
  assert.equal(calls, 2);
});

test("thinking text is excluded from JSON and generation respects output token budget", async () => {
  const result = await generateStructured(
    z.object({ ok: z.boolean() }),
    {},
    {
      apiKey: "fixture",
      model: "test",
      maxOutputTokens: 3072,
      fetcher: async (_url, init) => {
        assert.equal(
          JSON.parse(init.body).generationConfig.maxOutputTokens,
          3072,
        );
        return Response.json({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  { thought: true, text: "private reasoning" },
                  { text: '{"ok":true}' },
                ],
              },
            },
          ],
        });
      },
    },
  );
  assert.deepEqual(result, { ok: true });
});

test("blocked generations and permanent provider errors do not waste retries or expose provider messages", async () => {
  for (const [response, expected] of [
    [
      () => Response.json({ promptFeedback: { blockReason: "SAFETY" } }),
      /blocked/,
    ],
    [
      () =>
        Response.json(
          { error: { message: "private schema state space error" } },
          { status: 400 },
        ),
      /response schema/,
    ],
    [
      () =>
        Response.json(
          { error: { message: "private thinking configuration error" } },
          { status: 400 },
        ),
      /generation settings/,
    ],
    [
      () =>
        Response.json(
          {
            error: {
              message: "private payload",
              details: [{ reason: "API_KEY_INVALID" }],
            },
          },
          { status: 400 },
        ),
      /GEMINI_API_KEY/,
    ],
  ]) {
    let calls = 0;
    await assert.rejects(
      () =>
        generateStructured(
          z.object({}),
          {},
          {
            apiKey: "fixture",
            model: "test",
            fetcher: async () => {
              calls++;
              return response();
            },
          },
        ),
      (error) => {
        assert.match(error.message, expected);
        assert.ok(!error.message.includes("private"));
        return true;
      },
    );
    assert.equal(calls, 1);
  }
});

test("model thinking settings use supported low latency levels", () => {
  assert.equal(geminiThinkingLevel("gemini-3.8-flash"), "low");
  assert.equal(geminiThinkingLevel("gemini-3.5-flash"), "minimal");
  assert.equal(geminiThinkingLevel("custom-model"), undefined);
});

test("provider quota, availability and timeout failures remain distinguishable", async () => {
  for (const [status, expected] of [
    [429, /quota.*429/],
    [503, /busy.*503/],
  ]) {
    await assert.rejects(
      () =>
        generateStructured(
          z.object({}),
          {},
          {
            apiKey: "fixture",
            model: "test",
            maxAttempts: 1,
            fetcher: async () =>
              new Response("private-provider-body", { status }),
          },
        ),
      expected,
    );
  }
  await assert.rejects(
    () =>
      generateStructured(
        z.object({}),
        {},
        {
          apiKey: "fixture",
          model: "test",
          maxAttempts: 1,
          fetcher: async () => {
            throw new DOMException("private-provider-body", "TimeoutError");
          },
        },
      ),
    /did not respond before the timeout/,
  );
});

test("browser requests have finite loading limits for planning reads and generation", async () => {
  const calls = [];
  const api = createWorkspaceApi({
    functions: {
      invoke: async (_endpoint, options) => {
        calls.push(options.timeout);
        return { data: emptyPlanning(1), error: null };
      },
    },
  });
  const briefId = "10000000-0000-4000-8000-000000000001";
  await api.planning({ action: "load", briefId });
  await api.planning({
    action: "generateConcepts",
    briefId,
    briefVersion: 1,
    expectedRevision: 0,
  });
  assert.deepEqual(calls, [30000, 180000]);
});

test("a Supabase API key alone configures Gemini with the default model", async () => {
  const config = readGeminiConfig(
    env({ GEMINI_API_KEY: "  private-fixture\n" }),
  );
  assert.deepEqual(config, {
    apiKey: "private-fixture",
    model: "gemini-3.8-flash",
  });
  const output = await generateStructured(
    z.object({ ok: z.boolean() }),
    {},
    {
      ...config,
      fetcher: async (url, init) => {
        assert.match(url, /models\/gemini-3\.8-flash:generateContent$/);
        assert.equal(init.headers["x-goog-api-key"], "private-fixture");
        assert.equal(
          JSON.parse(init.body).generationConfig.thinkingConfig,
          undefined,
        );
        return Response.json({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: '{"ok":true}' }] },
            },
          ],
        });
      },
    },
  );
  assert.deepEqual(output, { ok: true });
});

test("explicit model overrides are preserved and Google model resource prefixes are normalized", () => {
  assert.equal(
    readGeminiConfig(
      env({
        GEMINI_API_KEY: "fixture",
        GEMINI_MODEL: " models/custom-flash \n",
      }),
    ).model,
    "custom-flash",
  );
  assert.equal(
    readGeminiConfig(env({ GEMINI_API_KEY: "fixture", GEMINI_MODEL: "  " }))
      .model,
    "gemini-3.8-flash",
  );
});

test("configuration failures identify the setting without exposing secret values", () => {
  for (const key of [undefined, "", "  \n"]) {
    assert.throws(
      () => readGeminiConfig(env({ GEMINI_API_KEY: key })),
      /GEMINI_API_KEY is missing/,
    );
  }
  for (const values of [
    { GEMINI_API_KEY: "private fixture" },
    {
      GEMINI_API_KEY: "private-fixture",
      GEMINI_MODEL: "bad/model/private-value",
    },
  ]) {
    assert.throws(
      () => readGeminiConfig(env(values)),
      (error) => {
        assert.ok(!error.message.includes("private"));
        assert.match(error.message, /GEMINI_API_KEY|GEMINI_MODEL/);
        return true;
      },
    );
  }
});
