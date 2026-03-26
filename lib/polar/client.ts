import { Polar } from "@polar-sh/sdk";

let _client: Polar | null = null;

export function getPolarClient(): Polar {
  if (_client) return _client;

  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) throw new Error("POLAR_ACCESS_TOKEN is not set");

  const server =
    (process.env.NEXT_PUBLIC_POLAR_SERVER as "sandbox" | "production") ??
    "sandbox";

  _client = new Polar({ accessToken, server });
  return _client;
}
