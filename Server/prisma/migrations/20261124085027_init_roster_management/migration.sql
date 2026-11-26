-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('PLANNED', 'SICK', 'COMP_OFF');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RosterStatus" AS ENUM ('DRAFT', 'GENERATED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "RosterDayStatus" AS ENUM ('WORKING', 'WEEKLY_OFF', 'HOLIDAY', 'LEAVE', 'COMP_OFF', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ConflictSeverity" AS ENUM ('WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "Pod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "podId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProcess" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "operatesOnPublicHolidays" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BrandProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "brandProcessId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATE,

    CONSTRAINT "EmployeeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingRule" (
    "id" TEXT NOT NULL,
    "brandProcessId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOperating" BOOLEAN NOT NULL DEFAULT true,
    "minimumStaff" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OperatingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingException" (
    "id" TEXT NOT NULL,
    "brandProcessId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isOperating" BOOLEAN NOT NULL,
    "minimumStaff" INTEGER,
    "reason" TEXT,

    CONSTRAINT "OperatingException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAvailability" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,

    CONSTRAINT "EmployeeAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyOff" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,

    CONSTRAINT "WeeklyOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roster" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "RosterStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeRosterDay" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "RosterDayStatus" NOT NULL DEFAULT 'WORKING',

    CONSTRAINT "EmployeeRosterDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterAllocation" (
    "id" TEXT NOT NULL,
    "rosterDayId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "shiftId" TEXT,

    CONSTRAINT "RosterAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingConflict" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "employeeId" TEXT,
    "brandProcessId" TEXT,
    "date" DATE NOT NULL,
    "severity" "ConflictSeverity" NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingConflict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pod_name_key" ON "Pod"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Pod_leadId_key" ON "Pod"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Process_name_key" ON "Process"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProcess_brandId_processId_key" ON "BrandProcess"("brandId", "processId");

-- CreateIndex
CREATE INDEX "EmployeeAssignment_employeeId_brandProcessId_idx" ON "EmployeeAssignment"("employeeId", "brandProcessId");

-- CreateIndex
CREATE INDEX "EmployeeAssignment_brandProcessId_status_idx" ON "EmployeeAssignment"("brandProcessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingRule_brandProcessId_dayOfWeek_key" ON "OperatingRule"("brandProcessId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingException_brandProcessId_date_key" ON "OperatingException"("brandProcessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAvailability_employeeId_date_key" ON "EmployeeAvailability"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyOff_employeeId_dayOfWeek_key" ON "WeeklyOff"("employeeId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Leave_employeeId_startDate_endDate_idx" ON "Leave"("employeeId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_name_key" ON "Shift"("name");

-- CreateIndex
CREATE INDEX "Roster_year_month_status_idx" ON "Roster"("year", "month", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_year_month_version_key" ON "Roster"("year", "month", "version");

-- CreateIndex
CREATE INDEX "EmployeeRosterDay_employeeId_date_idx" ON "EmployeeRosterDay"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeRosterDay_rosterId_employeeId_date_key" ON "EmployeeRosterDay"("rosterId", "employeeId", "date");

-- CreateIndex
CREATE INDEX "RosterAllocation_assignmentId_idx" ON "RosterAllocation"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterAllocation_rosterDayId_assignmentId_key" ON "RosterAllocation"("rosterDayId", "assignmentId");

-- CreateIndex
CREATE INDEX "SchedulingConflict_rosterId_date_idx" ON "SchedulingConflict"("rosterId", "date");

-- CreateIndex
CREATE INDEX "SchedulingConflict_employeeId_date_idx" ON "SchedulingConflict"("employeeId", "date");

-- CreateIndex
CREATE INDEX "SchedulingConflict_brandProcessId_date_idx" ON "SchedulingConflict"("brandProcessId", "date");

-- AddForeignKey
ALTER TABLE "Pod" ADD CONSTRAINT "Pod_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProcess" ADD CONSTRAINT "BrandProcess_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProcess" ADD CONSTRAINT "BrandProcess_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAssignment" ADD CONSTRAINT "EmployeeAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAssignment" ADD CONSTRAINT "EmployeeAssignment_brandProcessId_fkey" FOREIGN KEY ("brandProcessId") REFERENCES "BrandProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatingRule" ADD CONSTRAINT "OperatingRule_brandProcessId_fkey" FOREIGN KEY ("brandProcessId") REFERENCES "BrandProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatingException" ADD CONSTRAINT "OperatingException_brandProcessId_fkey" FOREIGN KEY ("brandProcessId") REFERENCES "BrandProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAvailability" ADD CONSTRAINT "EmployeeAvailability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyOff" ADD CONSTRAINT "WeeklyOff_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRosterDay" ADD CONSTRAINT "EmployeeRosterDay_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "Roster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRosterDay" ADD CONSTRAINT "EmployeeRosterDay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterAllocation" ADD CONSTRAINT "RosterAllocation_rosterDayId_fkey" FOREIGN KEY ("rosterDayId") REFERENCES "EmployeeRosterDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterAllocation" ADD CONSTRAINT "RosterAllocation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EmployeeAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterAllocation" ADD CONSTRAINT "RosterAllocation_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingConflict" ADD CONSTRAINT "SchedulingConflict_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "Roster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingConflict" ADD CONSTRAINT "SchedulingConflict_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingConflict" ADD CONSTRAINT "SchedulingConflict_brandProcessId_fkey" FOREIGN KEY ("brandProcessId") REFERENCES "BrandProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;
