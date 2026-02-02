/**
 * Type declarations for Supabase Edge Functions (Deno runtime).
 * This file silences IDE/TypeScript errors when editing functions locally.
 * Functions are executed in Deno; these are for editor support only.
 */
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(
    url: string,
    key: string,
    options?: { global?: { headers?: Record<string, string> } }
  ): any;
}

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {
  // Edge runtime types; no exports needed for global Deno
}
