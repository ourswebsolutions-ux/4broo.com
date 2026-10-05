// Create an admin account, or promote an existing account to ADMIN.
//
//   npm run admin:create
//
// Prompts interactively (password input is hidden). There is deliberately no
// default/hard-coded admin and no way to self-assign the ADMIN role from the web.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { z } from "zod";
import { hashPassword } from "../src/lib/auth/password.js";
import { disconnectDb, getDb } from "../src/lib/db.js";
import { newPasswordSchema } from "../src/lib/validation/schemas/auth.js";
import { emailSchema, personNameSchema } from "../src/lib/validation/schemas/common.js";

const rl = createInterface({ input: stdin, output: stdout, terminal: true });

async function ask(question, schema) {
  for (;;) {
    const result = schema.safeParse(await rl.question(question));
    if (result.success) return result.data;
    console.log(`  ✗ ${result.error.issues[0].message}`);
  }
}

async function askHidden(question) {
  const original = rl._writeToOutput;
  rl._writeToOutput = (text) => original.call(rl, text.includes(question) ? text : "");
  const answer = await rl.question(question);
  rl._writeToOutput = original;
  stdout.write("\n");
  return answer;
}

async function askPassword() {
  for (;;) {
    const password = await askHidden("Password: ");
    const result = newPasswordSchema.safeParse(password);
    if (!result.success) {
      console.log(`  ✗ ${result.error.issues[0].message}`);
      continue;
    }
    if ((await askHidden("Confirm password: ")) !== password) {
      console.log("  ✗ Passwords do not match.");
      continue;
    }
    return password;
  }
}

async function main() {
  const db = getDb();
  console.log("\n4 BRO — create administrator\n");

  const email = await ask("Email: ", emailSchema);
  const existing = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });

  if (existing) {
    if (existing.role === "ADMIN") {
      console.log("\nThis account is already an administrator. Nothing to do.");
      return;
    }
    const confirm = await ask(
      "An account with this email exists. Promote it to ADMIN? (yes/no): ",
      z.string().trim().toLowerCase(),
    );
    if (confirm !== "yes") return console.log("\nCancelled.");

    await db.$transaction([
      db.user.update({ where: { id: existing.id }, data: { role: "ADMIN", status: "ACTIVE" } }),
      // Role changed — revoke existing sessions so the new privileges start from a fresh login.
      db.session.deleteMany({ where: { userId: existing.id } }),
    ]);
    console.log("\n✓ Account promoted to ADMIN. Sign in at /admin/login.");
    return;
  }

  const firstName = await ask("First name: ", personNameSchema);
  const lastName = await ask("Last name: ", personNameSchema);
  const password = await askPassword();

  await db.user.create({
    data: { email, firstName, lastName, role: "ADMIN", passwordHash: await hashPassword(password) },
  });
  console.log("\n✓ Administrator created. Sign in at /admin/login.");
}

main()
  .catch((error) => {
    console.error(`\n✗ ${error.internalMessage ?? error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await disconnectDb().catch(() => {});
  });
