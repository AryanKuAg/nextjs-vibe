import "server-only";

import { createV0Client } from "v0";

/**
 * The one v0 Platform API client for the whole app.
 *
 * Site builds run entirely on v0 — there is no sandbox to boot and no agent
 * loop of ours to supervise, so this client plus the routes in
 * `src/app/api/v0` is the entire build backend.
 *
 * The API key never reaches the browser: every call goes through our own route
 * handlers, which is also where auth and credit accounting happen.
 */
export const v0 = createV0Client({
  auth: () => {
    const key = process.env.V0_API_KEY;
    if (!key) {
      throw new Error("V0_API_KEY is not set — site builds cannot run without it");
    }
    return key;
  },
});
