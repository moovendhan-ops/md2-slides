import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default {
  ...defineCloudflareConfig(),
  // OpenNext runs `npm run build` by default, but that script itself runs `opennextjs-cloudflare build`:
  // the nested build appends next-env.mjs twice and wrangler then fails on the duplicate exports.
  buildCommand: "npm run build:next",
};
