// Seed script — intentionally a NO-OP.
//
// The old demo "trade" list was removed permanently (it collided with real
// content and kept reappearing). This script no longer creates any list, so
// re-running it can never resurrect the demo. Real lists are created through
// the admin UI.
//
// If a future task needs throwaway sample content, create it under a unique,
// clearly-temporary slug that cannot collide with a real list — and delete it
// again afterwards. NEVER use 'trade' or any plausible real slug.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log(
    "Seed is a no-op: no demo content is created. Manage lists in the admin UI."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
