import "dotenv/config";
import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

/**
 * One-time registration of this account's Circle entity secret.
 *
 *   npm run circle:entity
 *
 * The entity secret is the second half of Circle's developer-controlled wallet
 * auth: the API key says which account, the entity secret authorises each
 * signing request. Circle never receives the secret itself — the SDK encrypts
 * it per request with Circle's public key, and what gets registered is that
 * ciphertext.
 *
 * REGISTRATION IS NOT IDEMPOTENT. Circle's own docs say so. Running it a
 * second time on an account that already has one is not a no-op, and the
 * recovery file it hands back is the only way to recover the account if the
 * secret is lost. So this refuses to run when CIRCLE_ENTITY_SECRET is already
 * set, writes the recovery file before printing anything else, and says
 * plainly which value goes where — the raw secret is what the daemon needs,
 * not the ciphertext and not the recovery file.
 */
async function main() {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  if (!apiKey) {
    console.error("✗ CIRCLE_API_KEY is not set in agent/daemon/.env");
    process.exit(1);
  }

  if (process.env.CIRCLE_ENTITY_SECRET?.trim()) {
    console.error(
      "✗ CIRCLE_ENTITY_SECRET is already set.\n" +
        "  An account has one entity secret. Registering another is not a\n" +
        "  no-op — clear the variable only if you know this account has none.",
    );
    process.exit(1);
  }

  if (apiKey.startsWith("TEST_API_KEY")) {
    console.warn("⚠ That is a SANDBOX key. Wallets created with it live on testnets only.\n");
  }

  /* 32 bytes of hex — the format Circle expects. Generated here rather than
     with the SDK's generateEntitySecret(), which prints to stdout and returns
     nothing, so there is no way to also register it in one pass. */
  const entitySecret = randomBytes(32).toString("hex");

  const res = await registerEntitySecretCiphertext({ apiKey, entitySecret });

  const recovery = res.data?.recoveryFile ?? "";
  const path = join(process.cwd(), "recovery_file.dat");
  if (recovery) {
    if (existsSync(path)) {
      console.error(`✗ ${path} already exists — refusing to overwrite a recovery file.`);
      process.exit(1);
    }
    writeFileSync(path, recovery);
  }

  console.log("\n✅ Entity secret registered.\n");
  console.log("── Put this in agent/daemon/.env AND the Railway daemon service ──");
  console.log(`CIRCLE_ENTITY_SECRET=${entitySecret}`);
  console.log(
    "\nRecovery file written to:\n  " +
      path +
      "\n\nKeep both somewhere safe and OFF this machine. The recovery file is the\n" +
      "only way back into this account if the secret is lost, and neither can be\n" +
      "issued again.\n\nNext: npm run circle:setup\n",
  );
}

main().catch((err) => {
  console.error("✗ Registration failed:", err?.response?.data ?? err?.message ?? err);
  process.exit(1);
});
