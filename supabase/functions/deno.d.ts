// Minimal runtime declarations for local TypeScript checks. Supabase runs these on Deno.
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
