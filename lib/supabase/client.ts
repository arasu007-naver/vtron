import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

const instantiate = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase URL or Key is missing from environment variables.");
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

type BrowserClient = ReturnType<typeof instantiate>;

let cached: BrowserClient | null = null;
const getClient = (): BrowserClient => (cached ??= instantiate());

export const supabase = new Proxy({} as BrowserClient, {
  get: (_target, prop) => {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
  has: (_target, prop) => prop in getClient(),
  set: (_target, prop, value) => Reflect.set(getClient(), prop, value),
});
