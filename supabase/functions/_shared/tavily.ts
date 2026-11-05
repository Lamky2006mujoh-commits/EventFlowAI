import { z } from "zod";
import { GenerationError } from "./gemini.ts";
import type { BriefData } from "./contracts.ts";
import { sourceSchema } from "./venues.ts";

const responseSchema = z.object({
  results: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
      }),
    )
    .max(20),
});

export function venueSearchProvider(env: (key: string) => string | undefined) {
  const provider = env("VENUE_SEARCH_PROVIDER")?.trim() || "tavily";
  if (provider !== "tavily" && provider !== "google")
    throw new GenerationError(
      "VENUE_SEARCH_PROVIDER must be tavily or google.",
    );
  return provider;
}

export async function tavilyVenueSources(
  brief: BriefData,
  preferences: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
) {
  const key = apiKey.trim();
  if (!key || /\s/.test(key))
    throw new GenerationError(
      "Add TAVILY_API_KEY to this Supabase project's Edge Function secrets to enable free-tier venue web search. Get a free key at app.tavily.com; no Google Search grounding is required.",
    );
  let response: Response;
  try {
    response = await fetcher("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        // No client identity, full brief, or private objectives are sent to search.
        query:
          `Event venue rental ${brief.venue} ${brief.eventType} ${brief.attendees} guests prices capacity booking conditions ${preferences}`.slice(
            0,
            380,
          ),
        search_depth: "basic",
        auto_parameters: false,
        max_results: 6,
        include_answer: false,
        include_raw_content: false,
        topic: "general",
      }),
    });
  } catch {
    throw new GenerationError(
      "Tavily venue search timed out or could not connect. Saved venue results are unchanged.",
    );
  }
  if (!response.ok) {
    if ([429, 432].includes(response.status))
      throw new GenerationError(
        "Tavily search credits or rate limit reached. Check the free allowance in Tavily; no paid fallback was used.",
      );
    if ([401, 403].includes(response.status))
      throw new GenerationError(
        "Tavily rejected TAVILY_API_KEY. Check the secret saved in this Supabase project.",
      );
    throw new GenerationError(
      "Tavily venue search is unavailable. Please retry later; saved results are unchanged.",
    );
  }
  const parsed = responseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success)
    throw new GenerationError(
      "Tavily returned invalid search data. Saved venue results are unchanged.",
    );
  const sources: Array<z.infer<typeof sourceSchema>> = [];
  const reports: string[] = [];
  for (const result of parsed.data.results) {
    const source = sourceSchema.safeParse({
      title: result.title.slice(0, 500),
      url: result.url,
    });
    if (
      !source.success ||
      !result.content.trim() ||
      sources.some((s) => s.url === source.data.url)
    )
      continue;
    reports.push(
      `Source ${sources.length}: ${source.data.title}\n${source.data.url}\n${result.content.slice(0, 4000)}`,
    );
    sources.push(source.data);
  }
  if (!sources.length)
    throw new GenerationError(
      "No sourced venue results were found. Broaden the location or search preferences.",
    );
  return { report: reports.join("\n\n"), sources };
}
