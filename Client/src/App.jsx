import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Employees from "./pages/Employees.jsx";
import Pods from "./pages/Pods.jsx";
import BrandsProcesses from "./pages/BrandsProcesses.jsx";
import Assignments from "./pages/Assignments.jsx";
import SchedulingAvailability from "./pages/SchedulingAvailability.jsx";
import MonthlyRoster from "./pages/MonthlyRoster.jsx";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Layers,
  RefreshCw,
  SlidersHorizontal,
  Users,
} from "lucide-react";

const API = (import.meta.env.SERVER_URL || "http://localhost:5000/api").replace(/\/$/, "");

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Employees", icon: Users },
  { label: "Pods", icon: Layers },
  { label: "Brands & Processes", icon: Building2 },
  { label: "Assignments", icon: ClipboardList },
  { label: "Scheduling & Availability", icon: SlidersHorizontal },
  { label: "Monthly Roster", icon: CalendarDays },
  { label: "Conflicts", icon: AlertTriangle },
];

const pageDescriptions = {
  Dashboard: "Monitor workforce, resources and roster operations.",
  Employees: "Manage employee records and operational pod assignments.",
  Pods: "Organize employees into operational teams and pod leads.",
  "Brands & Processes": "Manage client brands and their operational processes.",
  Assignments: "Allocate employees to the brand processes they support.",
  "Scheduling & Availability": "Manage operating rules, availability, leaves and holidays.",
  "Monthly Roster": "Generate and review company-wide monthly schedules.",
  Conflicts: "Review staffing gaps and roster validation issues.",
};

const emptyData = {
  employees: [],
  pods: [],
  brands: [],
  processes: [],
  assignments: [],
  leaves: [],
  rosters: [],
};

function getListResult(result) {
  if (result.status !== "fulfilled") return [];
  const records = result.value?.data?.data;
  return Array.isArray(records) ? records : [];
}

function getStatusBadgeClass(status, conflictCount) {
  if (Number(conflictCount) > 0) return "bg-[#FFF4E5] text-[#A65B00]";
  if (status === "PUBLISHED") return "bg-[#EAF1F8] text-[#28577C]";
  if (status === "GENERATED") return "bg-[#E7F4F2] text-[#167C78]";
  return "bg-[#F1F4F8] text-[#64748B]";
}

function StatCard({ title, value, description, icon: Icon, iconClass }) {
  return (
    <section className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#718096]">{title}</p>
        <span className={`rounded-lg p-3 ${iconClass}`}>
          <Icon size={21} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums text-[#18334F]">{value}</p>
      <p className="mt-2 text-xs text-[#8492A6]">{description}</p>
    </section>
  );
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [dashboardData, setDashboardData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [refreshToken, setRefreshToken] = useState(0);

  const loadDashboardData = useCallback(async () => {
    const requests = [
      axios.get(`${API}/employees`, { timeout: 10000 }),
      axios.get(`${API}/pods`, { timeout: 10000 }),
      axios.get(`${API}/brands`, { timeout: 10000 }),
      axios.get(`${API}/processes`, { timeout: 10000 }),
      axios.get(`${API}/assignments`, { timeout: 10000 }),
      axios.get(`${API}/leaves`, { timeout: 10000 }),
      axios.get(`${API}/rosters`, { timeout: 10000 }),
      axios.get(`${API}/health`, { timeout: 10000 }),
    ];

    const results = await Promise.allSettled(requests);
    const endpointNames = [
      "employees",
      "pods",
      "brands",
      "processes",
      "assignments",
      "leaves",
      "rosters",
      "backend health",
    ];
    const failedEndpoints = results
      .map((result, index) => (result.status === "rejected" ? endpointNames[index] : null))
      .filter(Boolean);

    const nextData = {
      employees: getListResult(results[0]),
      pods: getListResult(results[1]),
      brands: getListResult(results[2]),
      processes: getListResult(results[3]),
      assignments: getListResult(results[4]),
      leaves: getListResult(results[5]),
      rosters: getListResult(results[6]),
    };

    const healthResponse = results[7];
    const isConnected =
      healthResponse.status === "fulfilled" &&
      healthResponse.value?.data?.success === true;

    return {
      data: nextData,
      failedEndpoints,
      backendStatus: isConnected ? "connected" : "disconnected",
    };
  }, []);

  // Reload dashboard information whenever the user returns to this page.
  useEffect(() => {
    if (activePage !== "Dashboard") return undefined;

    let cancelled = false;

    loadDashboardData()
      .then(({ data, failedEndpoints, backendStatus: nextBackendStatus }) => {
        if (cancelled) return;
        setDashboardData(data);
        setBackendStatus(nextBackendStatus);
        setError(
          failedEndpoints.length
            ? `Some dashboard data could not be loaded: ${failedEndpoints.join(", ")}. Use Refresh to try again.`
            : ""
        );
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error("Dashboard loading failed:", loadError);
        setBackendStatus("disconnected");
        setError("Unable to load dashboard data. Check that the backend server is running.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activePage, refreshToken, loadDashboardData]);

  const stats = useMemo(() => {
    const activeEmployees = dashboardData.employees.filter(
      (employee) => employee.status === "ACTIVE"
    );
    const activeBrands = dashboardData.brands.filter((brand) => brand.isActive);
    const activeProcesses = dashboardData.processes.filter((process) => process.isActive);
    const activeAssignments = dashboardData.assignments.filter(
      (assignment) => assignment.status === "ACTIVE"
    );
    const pendingLeaves = dashboardData.leaves.filter(
      (leave) => leave.status === "PENDING"
    );

    return {
      totalEmployees: dashboardData.employees.length,
      activeEmployees: activeEmployees.length,
      pods: dashboardData.pods.length,
      activeBrands: activeBrands.length,
      activeProcesses: activeProcesses.length,
      activeAssignments: activeAssignments.length,
      pendingLeaves: pendingLeaves.length,
      rosters: dashboardData.rosters.length,
    };
  }, [dashboardData]);

  const latestRoster = dashboardData.rosters[0] || null;
  const latestConflictCount = latestRoster?._count?.conflicts ?? 0;
  const statCards = [
    {
      title: "Total Employees",
      value: stats.totalEmployees,
      description: `${stats.activeEmployees} currently active`,
      icon: Users,
      iconClass: "bg-[#EAF1F8] text-[#28577C]",
    },
    {
      title: "Operational Pods",
      value: stats.pods,
      description: "Registered operational teams",
      icon: Layers,
      iconClass: "bg-[#EDF3F8] text-[#28577C]",
    },
    {
      title: "Active Brands",
      value: stats.activeBrands,
      description: "Brands enabled for operations",
      icon: Building2,
      iconClass: "bg-[#E7F4F2] text-[#168F8B]",
    },
    {
      title: "Active Processes",
      value: stats.activeProcesses,
      description: "Processes available for assignment",
      icon: ClipboardList,
      iconClass: "bg-[#E7F4F2] text-[#168F8B]",
    },
  ];

  const handleRefresh = () => {
    setLoading(true);
    setRefreshToken((current) => current + 1);
  };

  return (
    <div className="min-h-screen bg-[#F1F4F8] text-[#18334F] md:flex">
      <aside className="w-full bg-[#173653] text-white md:fixed md:inset-y-0 md:left-0 md:h-screen md:w-64 md:overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-[#294863] px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#168F8B]">
            <CalendarDays size={23} />
          </div>
          <div>
            <h1 className="text-lg font-bold">DataStraw</h1>
            <p className="text-xs text-[#B8CBDC]">Smart Roster System</p>
          </div>
        </div>

        <div className="px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[#B8CBDC]">
            Workspace
          </p>
          <nav className="space-y-1" aria-label="Main navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (item.label === "Dashboard") {
                      setLoading(true);
                      setRefreshToken((current) => current + 1);
                    }
                    setActivePage(item.label);
                  }}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                    active
                      ? "bg-[#28577C] text-white"
                      : "text-[#D6E1EA] hover:bg-[#244863] hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-[#294863] px-5 py-5 md:mt-2">
          <p className="text-sm font-medium">Roster Management</p>
          <p className="mt-1 text-xs text-[#B8CBDC]">
            Workforce scheduling platform
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:ml-64">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#E1E7EF] bg-white px-5 py-4 md:px-8">
          <div>
            <h2 className="text-xl font-bold">{activePage}</h2>
            <p className="mt-1 text-sm text-[#718096]">
              {pageDescriptions[activePage] || "DataStraw workforce management"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activePage === "Dashboard" && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E1E7EF] px-3 py-2.5 text-sm font-medium text-[#496176] transition hover:bg-[#F1F4F8] disabled:cursor-not-allowed disabled:opacity-60"
                title="Refresh dashboard data"
              >
                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            {activePage === "Dashboard" && (
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${
                  backendStatus === "connected"
                    ? "bg-[#E7F4F2] text-[#167C78]"
                    : backendStatus === "disconnected"
                      ? "bg-[#FDECEC] text-[#B42318]"
                      : "bg-[#F1F4F8] text-[#64748B]"
                }`}
                role="status"
                aria-live="polite"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    backendStatus === "connected"
                      ? "bg-[#168F8B]"
                      : backendStatus === "disconnected"
                        ? "bg-[#DC2626]"
                        : "bg-[#94A3B8]"
                  }`}
                />
                {backendStatus === "connected"
                  ? "Backend connected"
                  : backendStatus === "disconnected"
                    ? "Backend disconnected"
                    : "Checking backend"}
              </div>
            )}
          </div>
        </header>

        <div className="p-5 md:p-8">
          {activePage === "Employees" && <Employees />}
          {activePage === "Pods" && <Pods />}
          {activePage === "Brands & Processes" && <BrandsProcesses />}
          {activePage === "Assignments" && <Assignments />}
          {activePage === "Scheduling & Availability" && <SchedulingAvailability />}
          {(activePage === "Monthly Roster" || activePage === "Conflicts") && (
            <MonthlyRoster
              key={activePage}
              initialTab={activePage === "Conflicts" ? "conflicts" : "schedule"}
            />
          )}

          {activePage === "Dashboard" && (
            <>
              <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-[#18334F]">Overview</h3>
                  <p className="mt-1 text-sm text-[#718096]">
                    Live operational information from your DataStraw database.
                  </p>
                </div>
                <span className="rounded-lg bg-[#E7F4F2] px-4 py-2 text-sm font-medium text-[#168F8B]">
                  Workforce overview
                </span>
              </div>

              {error && (
                <div className="mb-5 rounded-lg border border-[#F2C7C7] bg-[#FFF1F1] p-4 text-sm text-[#B42318]" role="alert">
                  {error}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => (
                  <StatCard
                    key={card.title}
                    title={card.title}
                    value={loading ? "—" : card.value}
                    description={card.description}
                    icon={card.icon}
                    iconClass={card.iconClass}
                  />
                ))}
              </div>

              <div className="mt-7 grid gap-6 xl:grid-cols-3">
                <section className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm xl:col-span-2">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[#18334F]">Recent monthly rosters</h3>
                      <p className="mt-1 text-sm text-[#718096]">
                        Latest generated schedules and their recorded conflicts.
                      </p>
                    </div>
                    <CalendarDays className="shrink-0 text-[#168F8B]" size={22} />
                  </div>

                  {loading ? (
                    <p className="py-8 text-center text-sm text-[#8492A6]">Loading rosters...</p>
                  ) : dashboardData.rosters.length === 0 ? (
                    <div className="py-8 text-center">
                      <CalendarDays size={28} className="mx-auto text-[#A8B5C3]" />
                      <p className="mt-2 text-sm font-semibold text-[#496176]">No rosters generated yet</p>
                      <p className="mt-1 text-xs text-[#8492A6]">Generate a monthly roster to see it here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dashboardData.rosters.slice(0, 5).map((roster) => {
                        const conflictCount = roster._count?.conflicts ?? 0;
                        const rosterMonth = new Date(
                          Date.UTC(roster.year, roster.month - 1, 1)
                        ).toLocaleDateString("en-IN", {
                          month: "long",
                          year: "numeric",
                          timeZone: "UTC",
                        });
                        return (
                          <div
                            key={roster.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E1E7EF] p-4"
                          >
                            <div>
                              <p className="font-semibold text-[#18334F]">{rosterMonth}</p>
                              <p className="mt-1 text-xs text-[#718096]">Version {roster.version}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(roster.status, conflictCount)}`}>
                                {conflictCount > 0 ? "Needs review" : roster.status}
                              </span>
                              <span className="text-xs text-[#718096]">
                                {conflictCount} {conflictCount === 1 ? "conflict" : "conflicts"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-[#18334F]">Operational summary</h3>
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-sm text-[#718096]">Total monthly rosters</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-[#18334F]">
                        {loading ? "—" : stats.rosters}
                      </p>
                    </div>
                    <div className="border-t border-[#E1E7EF] pt-4">
                      <p className="text-sm text-[#718096]">Active assignments</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-[#18334F]">
                        {loading ? "—" : stats.activeAssignments}
                      </p>
                    </div>
                    <div className="border-t border-[#E1E7EF] pt-4">
                      <p className="text-sm text-[#718096]">Pending leave requests</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-[#18334F]">
                        {loading ? "—" : stats.pendingLeaves}
                      </p>
                    </div>
                    <div className="border-t border-[#E1E7EF] pt-4">
                      <p className="text-sm text-[#718096]">Latest roster conflicts</p>
                      <p className={`mt-1 text-2xl font-bold tabular-nums ${latestConflictCount > 0 ? "text-[#B45309]" : "text-[#18334F]"}`}>
                        {loading || !latestRoster ? "—" : latestConflictCount}
                      </p>
                      <p className="mt-1 text-xs text-[#8492A6]">
                        {latestRoster ? "From the most recent roster" : "No roster available"}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
