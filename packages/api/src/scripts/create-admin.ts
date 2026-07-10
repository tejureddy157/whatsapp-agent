// One-off bootstrap: creates the first ADMIN user for the CRM. There's no
// public signup — every other account is created by an admin later via the
// CRM itself (a future phase). Run with: npx tsx src/scripts/create-admin.ts
//   --email you@example.com --password 'Something-Strong-1' --name "Your Name"
import { findUserByEmail, createUser } from "../modules/auth/repository.js";
import { hashPassword } from "../modules/auth/service.js";
import { prisma } from "../shared/db.js";

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const email = getArg("--email");
  const password = getArg("--password");
  const name = getArg("--name") ?? "Admin";

  if (!email || !password) {
    console.error('Usage: tsx src/scripts/create-admin.ts --email you@example.com --password "..." --name "Your Name"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    console.error(`A user with email ${email} already exists (role: ${existing.role}).`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, passwordHash, name, role: "ADMIN" });
  console.log(`Created ADMIN user: ${user.email} (id: ${user.id})`);
}

main()
  .catch((err) => {
    console.error("Failed to create admin user:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
