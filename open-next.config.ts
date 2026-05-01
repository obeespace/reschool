import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  buildConfig: {
    serverBuildOptions: {
      external: ["@libsql/client"],
    },
  },
});
