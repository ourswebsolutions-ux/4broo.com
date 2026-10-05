// Verify integrations from the command line without exposing credentials.
//
//   npm run verify                          # configuration + database + email (no send) + cloudinary + whatsapp (session check, no send)
//   npm run verify -- email                 # SMTP connect + auth only
//   npm run verify -- email --send-to you@example.com
//   npm run verify -- whatsapp --send       # sends a test message to the admin WhatsApp number
//   npm run verify -- cloudinary
//   npm run verify -- database
import { parseArgs } from "node:util";
import { disconnectDb } from "../src/lib/db.js";
import { DIAGNOSTIC_SERVICES, diagnostics } from "../src/lib/services/diagnostics.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "send-to": { type: "string" },
    send: { type: "boolean", default: false },
  },
});

const requested = positionals.length ? positionals : DIAGNOSTIC_SERVICES;
const unknown = requested.filter((name) => !DIAGNOSTIC_SERVICES.includes(name));
if (unknown.length) {
  console.error(`Unknown check(s): ${unknown.join(", ")}. Available: ${DIAGNOSTIC_SERVICES.join(", ")}`);
  process.exit(1);
}

const optionsFor = {
  email: { sendTo: values["send-to"] },
  whatsapp: { send: values.send },
};

let failed = false;

for (const service of requested) {
  const result = await diagnostics[service](optionsFor[service]);

  if (service === "configuration") {
    console.log("\nConfiguration");
    for (const [group, status] of Object.entries(result.detail)) {
      console.log(`  ${status.configured ? "✓" : "–"} ${group.padEnd(11)} ${status.configured ? "configured" : status.problem}`);
    }
    continue;
  }

  failed ||= !result.ok;
  const mark = result.ok ? "✓" : "✗";
  console.log(`\n${mark} ${service} (${result.durationMs} ms)\n  ${result.ok ? result.detail : result.error}`);
}

await disconnectDb().catch(() => {});
process.exit(failed ? 1 : 0);
