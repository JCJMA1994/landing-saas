/// <reference types="astro/client" />
import type { User } from "@supabase/supabase-js";
import type { HostContext, HostRoutingContext } from "./domain/tenant/host";
import type { createRequestClient } from "./infrastructure/supabase/server";
declare global {
  namespace App {
    interface Locals {
      requestId: string;
      user: User | null;
      hostContext: HostContext;
      hostRouting: HostRoutingContext;
      supabase: ReturnType<typeof createRequestClient>;
    }
  }
}

