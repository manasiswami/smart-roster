
const prisma = require("../src/config/prisma");

async function main() {
  const brandProcesses = await prisma.brandProcess.findMany({
    where: { isActive: true },
    include: {
      brand: true,
      process: true,
    },
  });

  if (brandProcesses.length === 0) {
    throw new Error("No active brand-process records found. Run the main seed first.");
  }

  let createdOrUpdated = 0;

  for (let index = 0; index < brandProcesses.length; index++) {
    const item = brandProcesses[index];

    // Demonstrate different operating calendars:
    // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    const scheduleType = index % 3;

    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      let isOperating;

      if (scheduleType === 0) {
        isOperating = true; // All seven days
      } else if (scheduleType === 1) {
        isOperating = dayOfWeek !== 0; // Monday to Saturday
      } else {
        isOperating = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
      }

      // DailyDrobe has multiple employees sharing its processes.
      const minimumStaff =
        item.brand.name === "DailyDrobe" ? 2 : 1;

      await prisma.operatingRule.upsert({
        where: {
          brandProcessId_dayOfWeek: {
            brandProcessId: item.id,
            dayOfWeek,
          },
        },
        update: {
          isOperating,
          minimumStaff,
        },
        create: {
          brandProcessId: item.id,
          dayOfWeek,
          isOperating,
          minimumStaff,
        },
      });

      createdOrUpdated++;
    }
  }

  console.log("Operating rules configured successfully!");
  console.log(`Brand-process combinations: ${brandProcesses.length}`);
  console.log(`Rules created or updated: ${createdOrUpdated}`);
}

main()
  .catch((error) => {
    console.error("Operating rules setup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
