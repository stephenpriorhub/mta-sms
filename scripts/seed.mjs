// Idempotent demo seed so a fresh deploy is immediately viewable.
// Run: `node scripts/seed.mjs` (uses DATABASE_URL). Safe to re-run — upserts on slug.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_SLUG = "trade"; // exactly 5 chars, valid

async function main() {
  const list = await prisma.list.upsert({
    where: { slug: DEMO_SLUG },
    update: {},
    create: {
      name: "Trade of the Day",
      slug: DEMO_SLUG,
      topAdEnabled: true,
      topAdText:
        "Sponsored: See the full War Room briefing — this week's highest-conviction setups.\nLimited seats for new members.",
      topAdLink: "https://monumenttradersalliance.com",
      archivesEnabled: true,
    },
  });

  const count = await prisma.post.count({ where: { listId: list.id } });
  if (count === 0) {
    await prisma.post.create({
      data: {
        listId: list.id,
        title: "Why This Setup Has My Full Attention",
        content:
          "<p>Good morning. The market handed us a rare signal overnight, and I want to walk you through exactly what I'm seeing before the open.</p>" +
          "<p>Volatility compressed to a multi-week low while volume quietly built underneath. That combination has preceded some of the sharpest moves we've traded this year.</p>" +
          '<p>Here is the key level I\'m watching, and <a href="https://monumenttradersalliance.com">the full breakdown is here</a>.</p>' +
          "<p>Manage your risk, size sensibly, and let the setup come to you.</p>",
        actionToTake:
          "<p>Buy shares up to <strong>$52.00</strong>. Set a stop at $47.50. Target the prior high near $61.</p>",
        actionSecondary: "This is a swing position — plan to hold 2 to 6 weeks.",
        buttonText: "See the Full Briefing",
        buttonUrl: "https://monumenttradersalliance.com",
      },
    });
    // A second, older post so the archives accordion has content.
    const older = new Date();
    older.setDate(older.getDate() - 7);
    await prisma.post.create({
      data: {
        listId: list.id,
        title: "Last Week's Recap",
        publishDate: older,
        content:
          "<p>A quick look back at how last week's ideas played out and what carried over into this week.</p>",
      },
    });
  }

  console.log(`Seed complete. Public page: /${DEMO_SLUG}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
