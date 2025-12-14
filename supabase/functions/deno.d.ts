// Deno global namespace and types for Supabase Edge Functions
declare namespace Deno {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;

  export namespace env {
    export function get(key: string): string | undefined;
  }
}

// Global Deno object
declare const Deno: typeof Deno;

// npm: protocol support for Deno
declare module "npm:stripe@20.0.0" {
  import Stripe from "npm:stripe@20.0.0";
  export default Stripe;
}

declare module "npm:@supabase/supabase-js@2.87.1" {
  export * from "@supabase/supabase-js";
}

declare module "npm:zod@4.1.12" {
  export * from "zod";
}

// Standard web APIs available in Deno
declare const Response: typeof globalThis.Response;
declare const Request: typeof globalThis.Request;
declare const Headers: typeof globalThis.Headers;
declare const fetch: typeof globalThis.fetch;
declare const console: typeof globalThis.console;
declare const JSON: typeof globalThis.JSON;
declare const Date: typeof globalThis.Date;
declare const Math: typeof globalThis.Math;
declare const Number: typeof globalThis.Number;
declare const Error: typeof globalThis.Error;
