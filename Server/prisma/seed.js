
const prisma = require("../src/config/prisma");

async function main() {
  console.log("Starting DataStraw sample data insertion...");

  // 1. Create operational pods
  const podNames = [
    "Customer Support Pod",
    "Retention Pod",
    "Operations Pod",
    "Conversion Pod",
  ];

  const pods = [];

  for (const name of podNames) {
    const pod = await prisma.pod.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    pods.push(pod);
  }

  // 2. Create 30 employees
  const employees = [];

  for (let i = 1; i <= 30; i++) {
    const pod = pods[(i - 1) % pods.length];

    const employee = await prisma.employee.upsert({
      where: { employeeCode: `DS${String(i).padStart(3, "0")}` },
      update: { podId: pod.id },
      create: {
        employeeCode: `DS${String(i).padStart(3, "0")}`,
        firstName: `Employee${i}`,
        lastName: "DataStraw",
        email: `employee${i}@datastraw.com`,
        status: "ACTIVE",
        podId: pod.id,
      },
    });

    employees.push(employee);
  }

  // 3. Assign one pod leader to each pod
  for (let i = 0; i < pods.length; i++) {
    await prisma.pod.update({
      where: { id: pods[i].id },
      data: { leadId: employees[i].id },
    });
  }

  // 4. Create brands
  const brandNames = [
    "NovaCart",
    "UrbanNest",
    "GlowTheory",
    "PureBite",
    "FitFuel",
    "DailyDrobe",
  ];

  const brands = [];

  for (const name of brandNames) {
    const brand = await prisma.brand.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `${name} D2C brand`,
        isActive: true,
      },
    });

    brands.push(brand);
  }

  // 5. Create operational processes
  const processNames = [
    "CS",
    "ACC",
    "NDR",
    "Retention",
    "Order Operations",
  ];

  const processes = [];

  for (const name of processNames) {
    const process = await prisma.process.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `${name} operational process`,
        isActive: true,
      },
    });

    processes.push(process);
  }

  // 6. Connect brands with processes
  const mappings = [
    [0, 0], [0, 1],
    [1, 0], [1, 2],
    [2, 0], [2, 3],
    [3, 0], [3, 1], [3, 2],
    [4, 0], [4, 3],
    [5, 0], [5, 1], [5, 2],
  ];

  const brandProcesses = [];

  for (const [brandIndex, processIndex] of mappings) {
    const brand = brands[brandIndex];
    const process = processes[processIndex];

    const brandProcess = await prisma.brandProcess.upsert({
      where: {
        brandId_processId: {
          brandId: brand.id,
          processId: process.id,
        },
      },
      update: {},
      create: {
        brandId: brand.id,
        processId: process.id,
        isActive: true,
        operatesOnPublicHolidays: false,
      },
    });

    brandProcesses.push(brandProcess);
  }

  // 7. Create employee assignments
  // Five brands have one dedicated employee.
  // DailyDrobe has three employees sharing its processes.

  const assignmentGroups = [
    { brandIndex: 0, employeeIndexes: [0] },
    { brandIndex: 1, employeeIndexes: [1] },
    { brandIndex: 2, employeeIndexes: [2] },
    { brandIndex: 3, employeeIndexes: [3] },
    { brandIndex: 4, employeeIndexes: [4] },
    { brandIndex: 5, employeeIndexes: [5, 6, 7] },
  ];

  const startDate = new Date("2026-01-01T00:00:00.000Z");

  for (const group of assignmentGroups) {
    const brand = brands[group.brandIndex];

    const relatedProcesses = brandProcesses.filter(
      (bp) => bp.brandId === brand.id
    );

    for (const employeeIndex of group.employeeIndexes) {
      for (const brandProcess of relatedProcesses) {
        const employee = employees[employeeIndex];

        const existing = await prisma.employeeAssignment.findFirst({
          where: {
            employeeId: employee.id,
            brandProcessId: brandProcess.id,
            status: "ACTIVE",
          },
        });

        if (!existing) {
          await prisma.employeeAssignment.create({
            data: {
              employeeId: employee.id,
              brandProcessId: brandProcess.id,
              status: "ACTIVE",
              startDate,
            },
          });
        }
      }
    }
  }

  // 8. Display inserted record counts
  const counts = await Promise.all([
    prisma.pod.count(),
    prisma.employee.count(),
    prisma.brand.count(),
    prisma.process.count(),
    prisma.brandProcess.count(),
    prisma.employeeAssignment.count(),
  ]);

  console.log("\nSample data inserted successfully!");
  console.table({
    Pods: counts[0],
    Employees: counts[1],
    Brands: counts[2],
    Processes: counts[3],
    BrandProcesses: counts[4],
    Assignments: counts[5],
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
