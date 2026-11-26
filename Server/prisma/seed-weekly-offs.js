
const prisma = require("../src/config/prisma");

async function main() {
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    orderBy: { employeeCode: "asc" },
  });

  for (let i = 0; i < employees.length; i++) {
    // Rotate weekly offs across Sunday, Saturday and Monday.
    const dayOfWeek = i % 3 === 0 ? 0 : i % 3 === 1 ? 6 : 1;

    await prisma.weeklyOff.upsert({
      where: {
        employeeId_dayOfWeek: {
          employeeId: employees[i].id,
          dayOfWeek,
        },
      },
      update: {},
      create: {
        employeeId: employees[i].id,
        dayOfWeek,
      },
    });
  }

  console.log(`Weekly offs configured for ${employees.length} employees.`);
}

main()
  .catch((error) => {
    console.error("Weekly off setup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
