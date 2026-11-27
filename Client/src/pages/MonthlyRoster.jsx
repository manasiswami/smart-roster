import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Users,
  X,
  XCircle,
} from "lucide-react";

const API = import.meta.env.SERVER_URL || "http://localhost:5000/api";
const PAGE_SIZE = 12;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SCHEDULE_VIEWS = [
  { value: "company", label: "Company-wide" },
  { value: "pod", label: "Pod-wise" },
  { value: "brand", label: "Brand-wise" },
  { value: "process", label: "Process-wise" },
  { value: "employee", label: "Employee-wise" },
];

const inputClass =
  "w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#18334F] outline-none transition focus:border-[#168F8B] focus:ring-3 focus:ring-[#168F8B]/10";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#168F8B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#117875] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9E2EC] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#496176] shadow-sm transition hover:bg-[#F7F9FC] disabled:opacity-60";

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error || fallback;
}

function dateKey(value) {
  return value ? String(value).slice(0, 10) : "";
}

function displayDate(value, options = { day: "2-digit", month: "short", year: "numeric" }) {
  const key = dateKey(value);
  if (!key) return "—";
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    ...options,
    timeZone: "UTC",
  });
}

function monthLabel(month, year) {
  return `${MONTHS[month - 1]} ${year}`;
}

function statusStyle(status) {
  const styles = {
    WORKING: "bg-[#E7F4F2] text-[#176B67]",
    WEEKLY_OFF: "bg-[#F1F4F8] text-[#64748B]",
    HOLIDAY: "bg-[#EDF3F8] text-[#28577C]",
    LEAVE: "bg-[#FFF4E5] text-[#A65B13]",
    COMP_OFF: "bg-[#F2EDFA] text-[#7047A3]",
    UNAVAILABLE: "bg-[#FDECEC] text-[#B42318]",
  };
  return styles[status] || "bg-[#F1F4F8] text-[#64748B]";
}

function statusLabel(status) {
  return (status || "UNKNOWN").replaceAll("_", " ");
}

function StatCard({ label, value, icon: Icon, tone }) {
  const tones = {
    blue: "bg-[#EDF3F8] text-[#28577C]",
    teal: "bg-[#E7F4F2] text-[#168F8B]",
    amber: "bg-[#FFF4E5] text-[#B76A16]",
    red: "bg-[#FDECEC] text-[#B42318]",
  };
  return (
    <div className="rounded-xl border border-[#E1E7EF] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#718096]">{label}</p>
        <span className={`rounded-lg p-2.5 ${tones[tone] || tones.blue}`}>
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-[#18334F]">{value}</p>
    </div>
  );
}

export default function MonthlyRoster({ initialTab = "schedule" }) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [rosters, setRosters] = useState([]);
  const [selectedRosterId, setSelectedRosterId] = useState("");
  const [rosterDetail, setRosterDetail] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [generationSummary, setGenerationSummary] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [availableAssignments, setAvailableAssignments] = useState([]);
  const [editingAssignmentIds, setEditingAssignmentIds] = useState([]);
  const [loadingEditOptions, setLoadingEditOptions] = useState(false);
  const [savingAllocations, setSavingAllocations] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [viewBy, setViewBy] = useState("company");
  const [scopeFilter, setScopeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const tableRef = useRef(null);

  const loadRosters = useCallback(async () => {
    const response = await axios.get(`${API}/rosters`);
    return response.data.data || [];
  }, []);

  const fetchRosterDetail = useCallback(async (rosterId) => {
    const [detailResponse, conflictResponse] = await Promise.all([
      axios.get(`${API}/rosters/${rosterId}`),
      axios.get(`${API}/rosters/${rosterId}/conflicts`),
    ]);
    return {
      detail: detailResponse.data.data || null,
      conflicts: conflictResponse.data.data || [],
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    loadRosters()
      .then((records) => {
        if (ignore) return;
        setRosters(records);
        if (records.length) {
          setLoadingDetail(true);
          setSelectedRosterId(records[0].id);
        }
      })
      .catch((error) => {
        if (ignore) return;
        console.error("Unable to load rosters:", error);
        setPageError(getErrorMessage(error, "Unable to load generated rosters."));
      })
      .finally(() => {
        if (!ignore) setLoadingList(false);
      });
    return () => { ignore = true; };
  }, [loadRosters]);

  useEffect(() => {
    if (!selectedRosterId) return undefined;

    let ignore = false;
    fetchRosterDetail(selectedRosterId)
      .then(({ detail, conflicts: nextConflicts }) => {
        if (ignore) return;
        setRosterDetail(detail);
        setConflicts(nextConflicts);
        setPageError("");
      })
      .catch((error) => {
        if (ignore) return;
        console.error("Unable to load roster details:", error);
        setPageError(getErrorMessage(error, "Unable to load roster details."));
        setRosterDetail(null);
        setConflicts([]);
      })
      .finally(() => {
        if (!ignore) setLoadingDetail(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedRosterId, fetchRosterDetail]);

  const loadRosterDetail = async (rosterId) => {
    if (!rosterId) {
      setRosterDetail(null);
      setConflicts([]);
      return;
    }

    setLoadingDetail(true);
    setPageError("");
    try {
      const { detail, conflicts: nextConflicts } = await fetchRosterDetail(rosterId);
      setRosterDetail(detail);
      setConflicts(nextConflicts);
    } catch (error) {
      console.error("Unable to load roster details:", error);
      setPageError(getErrorMessage(error, "Unable to load roster details."));
      setRosterDetail(null);
      setConflicts([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    const selectedMonth = Number(month);
    const selectedYear = Number(year);
    if (!Number.isInteger(selectedMonth) || selectedMonth < 1 || selectedMonth > 12 ||
        !Number.isInteger(selectedYear) || selectedYear < 2020 || selectedYear > 2100) {
      setPageError("Select a valid month and year.");
      return;
    }
    const confirmed = window.confirm(
      `Generate a new ${monthLabel(selectedMonth, selectedYear)} roster version? Existing versions will be preserved.`
    );
    if (!confirmed) return;

    setGenerating(true);
    setPageError("");
    setNotice("");
    setGenerationSummary(null);
    try {
      const response = await axios.post(`${API}/rosters/generate`, {
        month: selectedMonth,
        year: selectedYear,
      });
      const result = response.data.data || {};
      const newRosterId = result.roster?.id;
      setGenerationSummary(result);
      setNotice(response.data.message || "Monthly roster generated successfully.");
      const records = await loadRosters();
      setRosters(records);
      const nextRosterId = newRosterId || records[0]?.id;
      if (nextRosterId && nextRosterId !== selectedRosterId) {
        setLoadingDetail(true);
        setSelectedRosterId(nextRosterId);
      }
      setActiveTab("schedule");
      setPage(1);
      setSearch("");
      setStatusFilter("ALL");
      setScopeFilter("ALL");
    } catch (error) {
      console.error("Roster generation failed:", error);
      setPageError(getErrorMessage(error, "Failed to generate roster. Check the backend logs."));
    } finally {
      setGenerating(false);
    }
  };

  const rosterDays = useMemo(() => rosterDetail?.rosterDays || [], [rosterDetail]);
  const assignmentsForDay = (day) => day.allocations || [];

  const openAllocationEditor = async (day) => {
    if (selectedRoster?.status === "PUBLISHED") {
      setPageError("Published rosters cannot be edited. Generate a new roster version first.");
      return;
    }

    setPageError("");
    setNotice("");
    setEditingDay(day);
    setAvailableAssignments([]);
    setEditingAssignmentIds([]);
    setLoadingEditOptions(true);

    try {
      const response = await axios.get(`${API}/assignments`, {
        params: { employeeId: day.employeeId, status: "ACTIVE" },
      });
      const rosterDate = dateKey(day.date);
      const eligible = (response.data.data || []).filter((assignment) =>
        assignment.status === "ACTIVE" &&
        assignment.brandProcess?.isActive &&
        dateKey(assignment.startDate) <= rosterDate &&
        (!assignment.endDate || dateKey(assignment.endDate) >= rosterDate)
      );
      setAvailableAssignments(eligible);
      const assignmentBlocked =
        ["WEEKLY_OFF", "LEAVE", "COMP_OFF", "UNAVAILABLE"].includes(day.status) ||
        day.employee?.status === "INACTIVE";
      if (!assignmentBlocked) {
        const eligibleIds = new Set(eligible.map((assignment) => assignment.id));
        const currentIds = (day.allocations || [])
          .map((allocation) => allocation.assignmentId || allocation.assignment?.id)
          .filter((id) => id && eligibleIds.has(id));
        setEditingAssignmentIds(currentIds);
      }
    } catch (error) {
      console.error("Unable to load employee assignments:", error);
      setPageError(getErrorMessage(error, "Unable to load active assignments for this employee."));
      setEditingDay(null);
    } finally {
      setLoadingEditOptions(false);
    }
  };

  const closeAllocationEditor = () => {
    if (savingAllocations) return;
    setEditingDay(null);
    setAvailableAssignments([]);
    setEditingAssignmentIds([]);
  };

  const handleSaveAllocations = async (event) => {
    event.preventDefault();
    if (!editingDay || !selectedRosterId) return;

    setSavingAllocations(true);
    setPageError("");
    setNotice("");
    try {
      const response = await axios.patch(
        `${API}/rosters/${selectedRosterId}/days/${editingDay.id}/allocations`,
        { assignmentIds: editingAssignmentIds }
      );
      const validation = response.data.data?.validation;
      const errors = validation?.errorCount ?? 0;
      const warnings = validation?.warningCount ?? 0;
      setNotice(
        `${response.data.message || "Roster allocations updated."} Validation found ${errors} error(s) and ${warnings} warning(s).`
      );
      setEditingDay(null);
      setAvailableAssignments([]);
      setEditingAssignmentIds([]);
      const records = await loadRosters();
      setRosters(records);
      await loadRosterDetail(selectedRosterId);
    } catch (error) {
      console.error("Unable to update roster allocations:", error);
      setPageError(getErrorMessage(error, "Unable to update roster allocations."));
    } finally {
      setSavingAllocations(false);
    }
  };

  const handleRevalidate = async () => {
    if (!selectedRosterId) return;
    setRevalidating(true);
    setPageError("");
    setNotice("");
    try {
      const response = await axios.post(`${API}/rosters/${selectedRosterId}/revalidate`);
      const validation = response.data.data || {};
      setNotice(
        `Roster revalidated successfully: ${validation.errorCount ?? 0} error(s), ${validation.warningCount ?? 0} warning(s).`
      );
      const records = await loadRosters();
      setRosters(records);
      await loadRosterDetail(selectedRosterId);
    } catch (error) {
      console.error("Roster revalidation failed:", error);
      setPageError(getErrorMessage(error, "Unable to revalidate this roster."));
    } finally {
      setRevalidating(false);
    }
  };

  const filterOptions = useMemo(() => {
    if (!rosterDetail) return [];
    const map = new Map();
    if (viewBy === "pod") {
      rosterDays.forEach((day) => {
        const pod = day.employee?.pod;
        if (pod?.id) map.set(pod.id, pod.name);
      });
    } else if (viewBy === "employee") {
      rosterDays.forEach((day) => {
        const employee = day.employee;
        if (employee?.id) map.set(employee.id, `${employee.firstName} ${employee.lastName} (${employee.employeeCode})`);
      });
    } else if (viewBy === "brand") {
      rosterDays.forEach((day) => assignmentsForDay(day).forEach((allocation) => {
        const brand = allocation.assignment?.brandProcess?.brand;
        if (brand?.id) map.set(brand.id, brand.name);
      }));
    } else if (viewBy === "process") {
      rosterDays.forEach((day) => assignmentsForDay(day).forEach((allocation) => {
        const process = allocation.assignment?.brandProcess?.process;
        if (process?.id) map.set(process.id, process.name);
      }));
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rosterDetail, rosterDays, viewBy]);

  const filteredDays = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rosterDays.filter((day) => {
      const employee = day.employee || {};
      const dayAllocations = assignmentsForDay(day);
      const matchesStatus = statusFilter === "ALL" || day.status === statusFilter;
      let matchesScope = true;
      if (scopeFilter !== "ALL") {
        if (viewBy === "pod") matchesScope = employee.podId === scopeFilter || employee.pod?.id === scopeFilter;
        if (viewBy === "employee") matchesScope = employee.id === scopeFilter;
        if (viewBy === "brand") matchesScope = dayAllocations.some((item) => item.assignment?.brandProcess?.brand?.id === scopeFilter);
        if (viewBy === "process") matchesScope = dayAllocations.some((item) => item.assignment?.brandProcess?.process?.id === scopeFilter);
      }
      const allocationText = dayAllocations.map((item) => {
        const bp = item.assignment?.brandProcess;
        return `${bp?.brand?.name || ""} ${bp?.process?.name || ""}`;
      }).join(" ");
      const searchable = [
        employee.employeeCode, employee.firstName, employee.lastName,
        employee.email, employee.pod?.name, day.status, allocationText,
        dateKey(day.date),
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && matchesScope && (!query || searchable.includes(query));
    });
  }, [rosterDays, search, statusFilter, scopeFilter, viewBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDays.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleDays = filteredDays.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const summary = useMemo(() => {
    const count = (status) => rosterDays.filter((day) => day.status === status).length;
    const allocationCount = rosterDays.reduce((total, day) => total + (day.allocations?.length || 0), 0);
    const employeeCount = new Set(rosterDays.map((day) => day.employeeId)).size;
    return {
      employeeCount,
      totalDays: rosterDetail?.rosterDays?.length || 0,
      working: count("WORKING"),
      weeklyOff: count("WEEKLY_OFF"),
      leave: count("LEAVE") + count("COMP_OFF"),
      holiday: count("HOLIDAY"),
      allocationCount,
      conflictCount: conflicts.length,
    };
  }, [rosterDays, rosterDetail, conflicts]);

  const selectedRoster = rosters.find((item) => item.id === selectedRosterId);

  const changePage = (nextPage) => {
    setPage(nextPage);
    requestAnimationFrame(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const exportCsv = () => {
    if (!filteredDays.length) return;
    const rows = [
      ["Date", "Employee Code", "Employee", "Pod", "Day Status", "Brand", "Process", "Shift"],
    ];
    filteredDays.forEach((day) => {
      const employee = day.employee || {};
      const allocations = day.allocations?.length ? day.allocations : [null];
      allocations.forEach((allocation) => {
        const bp = allocation?.assignment?.brandProcess;
        rows.push([
          dateKey(day.date), employee.employeeCode || "",
          `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
          employee.pod?.name || "", statusLabel(day.status),
          bp?.brand?.name || "", bp?.process?.name || "",
          allocation?.shift?.name || "",
        ]);
      });
    });
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `datastraw-roster-${rosterDetail.month}-${rosterDetail.year}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#168F8B]">Workforce planning</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#18334F]">Monthly roster</h1>
          <p className="mt-1 text-sm text-[#718096]">Generate, review and inspect monthly employee schedules and coverage conflicts.</p>
        </div>
        <form onSubmit={handleGenerate} className="flex flex-col gap-2 rounded-xl border border-[#E1E7EF] bg-white p-3 shadow-sm sm:flex-row sm:items-end">
          <label className="text-xs font-semibold text-[#496176]">
            Month
            <select value={month} onChange={(event) => setMonth(event.target.value)} className={`${inputClass} mt-1 min-w-[145px]`}>
              {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#496176]">
            Year
            <input type="number" min="2020" max="2100" value={year} onChange={(event) => setYear(event.target.value)} className={`${inputClass} mt-1 w-28`} />
          </label>
          <button type="submit" disabled={generating} className={`${primaryButton} min-h-[42px]`}>
            {generating ? <LoaderCircle size={16} className="animate-spin" /> : <CalendarDays size={16} />}
            {generating ? "Generating..." : "Generate roster"}
          </button>
        </form>
      </div>

      {pageError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{pageError}</span>
          <button type="button" onClick={() => setPageError("")} className="ml-auto rounded p-1 hover:bg-red-100" aria-label="Dismiss error"><XCircle size={16} /></button>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-[#B9E1D8] bg-[#EAF6F3] px-4 py-3 text-sm text-[#176B67]">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" /><span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="ml-auto rounded p-1 hover:bg-[#D7EEE8]" aria-label="Dismiss message"><XCircle size={16} /></button>
        </div>
      )}
      {generationSummary && (
        <div className="rounded-xl border border-[#B9E1D8] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[#18334F]">Roster generation summary</p>
              <p className="mt-1 text-sm text-[#718096]">{generationSummary.employeeCount ?? 0} employees · {generationSummary.totalDays ?? 0} dates · {generationSummary.allocationCount ?? 0} allocations</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${generationSummary.conflictCount > 0 ? "bg-[#FFF4E5] text-[#A65B13]" : "bg-[#E7F4F2] text-[#176B67]"}`}>
              {generationSummary.conflictCount ?? 0} conflicts detected
            </span>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-[#E1E7EF] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-[#18334F]">Generated roster versions</h2>
            <p className="mt-1 text-sm text-[#718096]">Choose a roster to inspect its schedules and conflicts.</p>
          </div>
          <button type="button" onClick={async () => { setLoadingList(true); try { const records = await loadRosters(); setRosters(records); if (!selectedRosterId && records[0]) { setLoadingDetail(true); setSelectedRosterId(records[0].id); } } catch (error) { setPageError(getErrorMessage(error, "Unable to refresh rosters.")); } finally { setLoadingList(false); } }} disabled={loadingList} className={secondaryButton}>
            <RefreshCw size={16} className={loadingList ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        {loadingList ? (
          <p className="py-8 text-center text-sm text-[#8492A6]"><LoaderCircle size={18} className="mr-2 inline animate-spin" />Loading roster history...</p>
        ) : rosters.length === 0 ? (
          <div className="py-9 text-center">
            <CalendarDays size={30} className="mx-auto text-[#A8B5C3]" />
            <p className="mt-2 text-sm font-semibold text-[#496176]">No rosters generated yet</p>
            <p className="mt-1 text-xs text-[#8492A6]">Choose a month and generate your first monthly roster.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rosters.map((roster) => (
              <button key={roster.id} type="button" onClick={() => { if (roster.id !== selectedRosterId) setLoadingDetail(true); setSelectedRosterId(roster.id); setActiveTab("schedule"); setPage(1); }} className={`rounded-xl border p-4 text-left transition ${selectedRosterId === roster.id ? "border-[#168F8B] bg-[#F2FAF8] ring-2 ring-[#168F8B]/10" : "border-[#E1E7EF] bg-white hover:border-[#B8C9D8] hover:bg-[#FAFBFD]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[#18334F]">{monthLabel(roster.month, roster.year)}</p>
                  <span className="rounded-full bg-[#EDF3F8] px-2.5 py-1 text-[11px] font-semibold text-[#28577C]">v{roster.version}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#718096]">
                  <span className="inline-flex items-center gap-1"><Users size={13} />{roster._count?.rosterDays ?? 0} employee-days</span>
                  <span className={`inline-flex items-center gap-1 ${(roster._count?.conflicts || 0) > 0 ? "text-[#B76A16]" : "text-[#168F8B]"}`}><ShieldAlert size={13} />{roster._count?.conflicts ?? 0} conflicts</span>
                </div>
                <p className="mt-3 text-xs font-semibold text-[#168F8B]">{selectedRosterId === roster.id ? "Currently selected" : "View roster details"}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedRosterId && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#18334F]">{selectedRoster ? monthLabel(selectedRoster.month, selectedRoster.year) : "Roster details"}</h2>
              <p className="mt-1 text-sm text-[#718096]">Version {selectedRoster?.version ?? "—"} · {selectedRoster?.status ?? ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={handleRevalidate} disabled={revalidating || loadingDetail} className={secondaryButton}>
                <RefreshCw size={15} className={revalidating ? "animate-spin" : ""} />
                {revalidating ? "Revalidating..." : "Revalidate roster"}
              </button>
              <div className="inline-flex rounded-lg border border-[#D9E2EC] bg-white p-1">
                <button type="button" onClick={() => setActiveTab("schedule")} className={`rounded-md px-3 py-2 text-sm font-semibold ${activeTab === "schedule" ? "bg-[#28577C] text-white" : "text-[#496176] hover:bg-[#F1F4F8]"}`}>Schedule</button>
                <button type="button" onClick={() => setActiveTab("conflicts")} className={`rounded-md px-3 py-2 text-sm font-semibold ${activeTab === "conflicts" ? "bg-[#28577C] text-white" : "text-[#496176] hover:bg-[#F1F4F8]"}`}>Conflicts ({conflicts.length})</button>
              </div>
            </div>
          </div>

          {loadingDetail ? (
            <div className="rounded-xl border border-[#E1E7EF] bg-white py-16 text-center text-sm text-[#718096]"><LoaderCircle size={20} className="mr-2 inline animate-spin" />Loading roster details...</div>
          ) : !rosterDetail ? (
            <div className="rounded-xl border border-[#E1E7EF] bg-white p-8 text-center text-sm text-[#718096]">Unable to display this roster.</div>
          ) : activeTab === "schedule" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Employees" value={summary.employeeCount} icon={Users} tone="blue" />
                <StatCard label="Working days" value={summary.working} icon={CheckCircle2} tone="teal" />
                <StatCard label="Weekly offs" value={summary.weeklyOff} icon={Clock3} tone="blue" />
                <StatCard label="Leaves / comp-offs" value={summary.leave} icon={CalendarDays} tone="amber" />
                <StatCard label="Allocations" value={summary.allocationCount} icon={ClipboardList} tone="teal" />
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-[#DCE7F0] bg-[#F7FAFC] px-4 py-3 text-sm text-[#496176] sm:flex-row sm:items-center sm:justify-between">
                <p>Use <strong>Edit allocations</strong> to change an employee's brand/process work for a selected date. Each save automatically revalidates roster coverage.</p>
                {selectedRoster?.status === "PUBLISHED" && <span className="shrink-0 rounded-full bg-[#FFF4E5] px-3 py-1 text-xs font-semibold text-[#A65B13]">Published · read only</span>}
              </div>

              <section ref={tableRef} className="overflow-hidden rounded-xl border border-[#E1E7EF] bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-[#E1E7EF] p-5 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="font-bold text-[#18334F]">Roster schedule</h3>
                    <p className="mt-1 text-sm text-[#718096]">View by company, pod, brand, process or individual employee.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[690px] xl:grid-cols-4">
                    <label className="text-xs font-semibold text-[#496176]">
                      View
                      <select value={viewBy} onChange={(event) => { setViewBy(event.target.value); setScopeFilter("ALL"); setPage(1); }} className={`${inputClass} mt-1`}>
                        {SCHEDULE_VIEWS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-[#496176]">
                      {viewBy === "company" ? "Scope" : `Select ${viewBy}`}
                      <select value={scopeFilter} onChange={(event) => { setScopeFilter(event.target.value); setPage(1); }} disabled={viewBy === "company"} className={`${inputClass} mt-1 disabled:bg-[#F7F9FC]`}>
                        <option value="ALL">{viewBy === "company" ? "All employees" : `All ${viewBy}s`}</option>
                        {filterOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-[#496176]">
                      Day status
                      <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className={`${inputClass} mt-1`}>
                        <option value="ALL">All statuses</option>
                        {["WORKING", "WEEKLY_OFF", "HOLIDAY", "LEAVE", "COMP_OFF", "UNAVAILABLE"].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-[#496176]">
                      Search
                      <span className="relative mt-1 block">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8492A6]" />
                        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Employee, date, brand..." className={`${inputClass} pl-9`} />
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <p className="text-sm text-[#718096]">Showing <span className="font-semibold text-[#18334F]">{filteredDays.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(safePage * PAGE_SIZE, filteredDays.length)}</span> of <span className="font-semibold text-[#18334F]">{filteredDays.length}</span> employee schedule days</p>
                  <button type="button" onClick={exportCsv} disabled={!filteredDays.length} className={secondaryButton}><Download size={15} /> Export CSV</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] border-collapse text-left">
                    <thead>
                      <tr className="bg-[#F7F9FC] text-xs uppercase tracking-wide text-[#718096]">
                        <th className="px-5 py-3.5 font-semibold">Date</th>
                        <th className="px-5 py-3.5 font-semibold">Employee</th>
                        <th className="px-5 py-3.5 font-semibold">Pod</th>
                        <th className="px-5 py-3.5 font-semibold">Status</th>
                        <th className="px-5 py-3.5 font-semibold">Brand / process allocations</th>
                        <th className="px-5 py-3.5 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF1F5]">
                      {visibleDays.length === 0 ? (
                        <tr><td colSpan="6" className="px-5 py-14 text-center text-sm text-[#8492A6]">No schedule records match the selected filters.</td></tr>
                      ) : visibleDays.map((day) => (
                        <tr key={day.id} className="align-top transition hover:bg-[#FAFBFD]">
                          <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-[#496176]">{displayDate(day.date)}</td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-[#18334F]">{day.employee?.firstName} {day.employee?.lastName}</p>
                            <p className="mt-0.5 text-xs text-[#8492A6]">{day.employee?.employeeCode || "—"}</p>
                          </td>
                          <td className="px-5 py-4 text-sm text-[#496176]">{day.employee?.pod?.name || "—"}</td>
                          <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(day.status)}`}>{statusLabel(day.status)}</span></td>
                          <td className="px-5 py-4">
                            {day.allocations?.length ? (
                              <div className="flex max-w-[520px] flex-wrap gap-1.5">
                                {day.allocations.map((allocation) => {
                                  const bp = allocation.assignment?.brandProcess;
                                  return <span key={allocation.id} className="rounded-md border border-[#DDE8EF] bg-[#F7FAFC] px-2 py-1 text-xs text-[#496176]">{bp?.brand?.name || "Brand"} · {bp?.process?.name || "Process"}{allocation.shift?.name ? ` · ${allocation.shift.name}` : ""}</span>;
                                })}
                              </div>
                            ) : <span className="text-xs text-[#9AA8B7]">No process allocation</span>}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openAllocationEditor(day)}
                              disabled={selectedRoster?.status === "PUBLISHED" || loadingEditOptions || savingAllocations}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E2EC] bg-white px-3 py-2 text-xs font-semibold text-[#28577C] transition hover:border-[#B8C9D8] hover:bg-[#EDF3F8] disabled:cursor-not-allowed disabled:opacity-40"
                              title={selectedRoster?.status === "PUBLISHED" ? "Published rosters cannot be edited" : "Edit this employee's process allocations"}
                            >
                              <Pencil size={14} /> Edit allocations
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 border-t border-[#E1E7EF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[#718096]">Page {safePage} of {totalPages}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" onClick={() => changePage(Math.max(1, safePage - 1))} disabled={safePage === 1} className={`${secondaryButton} px-3 py-2`}><ChevronLeft size={15} /> Previous</button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                      .filter((number) => number === 1 || number === totalPages || Math.abs(number - safePage) <= 1)
                      .map((number, index, shown) => (
                        <span key={number} className="contents">
                          {index > 0 && number - shown[index - 1] > 1 && <span className="px-1 text-[#8492A6]">…</span>}
                          <button type="button" onClick={() => changePage(number)} className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold ${safePage === number ? "bg-[#28577C] text-white" : "border border-[#D9E2EC] bg-white text-[#496176] hover:bg-[#F1F4F8]"}`}>{number}</button>
                        </span>
                      ))}
                    <button type="button" onClick={() => changePage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} className={`${secondaryButton} px-3 py-2`}>Next <ChevronRight size={15} /></button>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="overflow-hidden rounded-xl border border-[#E1E7EF] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E7EF] p-5">
                <div>
                  <h3 className="font-bold text-[#18334F]">Scheduling conflicts</h3>
                  <p className="mt-1 text-sm text-[#718096]">Coverage gaps and other issues detected during roster generation.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${conflicts.length ? "bg-[#FFF4E5] text-[#A65B13]" : "bg-[#E7F4F2] text-[#176B67]"}`}>{conflicts.length} total</span>
              </div>
              {conflicts.length === 0 ? (
                <div className="py-14 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-[#168F8B]" />
                  <p className="mt-2 text-sm font-semibold text-[#18334F]">No conflicts detected</p>
                  <p className="mt-1 text-xs text-[#8492A6]">This roster has no recorded scheduling conflicts.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] border-collapse text-left">
                    <thead><tr className="bg-[#F7F9FC] text-xs uppercase tracking-wide text-[#718096]">
                      <th className="px-5 py-3.5 font-semibold">Date</th>
                      <th className="px-5 py-3.5 font-semibold">Severity</th>
                      <th className="px-5 py-3.5 font-semibold">Employee / brand-process</th>
                      <th className="px-5 py-3.5 font-semibold">Issue</th>
                      <th className="px-5 py-3.5 font-semibold">Resolution</th>
                    </tr></thead>
                    <tbody className="divide-y divide-[#EDF1F5]">
                      {conflicts.map((conflict) => (
                        <tr key={conflict.id} className="align-top hover:bg-[#FAFBFD]">
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-[#496176]">{displayDate(conflict.date)}</td>
                          <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${conflict.severity === "ERROR" ? "bg-[#FDECEC] text-[#B42318]" : "bg-[#FFF4E5] text-[#A65B13]"}`}>{conflict.severity}</span></td>
                          <td className="px-5 py-4 text-sm text-[#496176]">
                            {conflict.employee ? <><p className="font-semibold text-[#18334F]">{conflict.employee.firstName} {conflict.employee.lastName}</p><p className="text-xs text-[#8492A6]">{conflict.employee.employeeCode}</p></> : <><p className="font-semibold text-[#18334F]">{conflict.brandProcess?.brand?.name || "Brand"}</p><p className="text-xs text-[#8492A6]">{conflict.brandProcess?.process?.name || "Process"}</p></>}
                          </td>
                          <td className="px-5 py-4"><p className="text-sm font-semibold text-[#18334F]">{conflict.code}</p><p className="mt-1 max-w-xl text-sm text-[#718096]">{conflict.message}</p></td>
                          <td className="px-5 py-4 text-sm text-[#718096]">{conflict.isResolved ? conflict.resolutionNote || "Resolved" : "Needs review"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102A43]/55 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingAllocations) closeAllocationEditor(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="allocation-editor-title" className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E1E7EF] px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#168F8B]">Manual roster update</p>
                <h2 id="allocation-editor-title" className="mt-1 text-lg font-bold text-[#18334F]">Edit process allocations</h2>
                <p className="mt-1 text-sm text-[#718096]">{editingDay.employee?.firstName} {editingDay.employee?.lastName} · {editingDay.employee?.employeeCode} · {displayDate(editingDay.date)}</p>
              </div>
              <button type="button" onClick={closeAllocationEditor} disabled={savingAllocations} className="rounded-lg p-2 text-[#718096] hover:bg-[#F1F4F8] disabled:opacity-50" aria-label="Close allocation editor"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveAllocations}>
              <div className="max-h-[58vh] space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                {(["WEEKLY_OFF", "LEAVE", "COMP_OFF", "UNAVAILABLE"].includes(editingDay.status) || editingDay.employee?.status === "INACTIVE") && (
                  <div className="flex items-start gap-2 rounded-lg border border-[#F1D4A8] bg-[#FFF8EC] px-3 py-2.5 text-sm text-[#965A13]">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <span>This employee is not eligible for new allocations on this date ({statusLabel(editingDay.status)} or inactive). You may clear existing allocations, but the server will reject new ones.</span>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-[#18334F]">Available active assignments</h3>
                  <p className="mt-1 text-xs text-[#718096]">Select one or more active brand/process assignments already linked to this employee. Saving replaces the allocations for this employee on this date. Inactive or expired previous allocations are not offered.</p>
                </div>

                {loadingEditOptions ? (
                  <div className="py-10 text-center text-sm text-[#718096]"><LoaderCircle size={18} className="mr-2 inline animate-spin" />Loading eligible assignments...</div>
                ) : availableAssignments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#D9E2EC] bg-[#F8FAFC] px-4 py-8 text-center">
                    <ClipboardList size={25} className="mx-auto text-[#9AA8B7]" />
                    <p className="mt-2 text-sm font-semibold text-[#496176]">No active assignments available</p>
                    <p className="mt-1 text-xs text-[#8492A6]">Create or activate an employee assignment, then return here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableAssignments.map((assignment) => {
                      const bp = assignment.brandProcess;
                      const checked = editingAssignmentIds.includes(assignment.id);
                      return (
                        <label key={assignment.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? "border-[#168F8B] bg-[#F0F8F7]" : "border-[#E1E7EF] bg-white hover:bg-[#FAFBFD]"}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={["WEEKLY_OFF", "LEAVE", "COMP_OFF", "UNAVAILABLE"].includes(editingDay.status) || editingDay.employee?.status === "INACTIVE"}
                            onChange={() => setEditingAssignmentIds((current) => checked ? current.filter((id) => id !== assignment.id) : [...current, assignment.id])}
                            className="mt-1 h-4 w-4 accent-[#168F8B]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[#18334F]">{bp?.brand?.name || "Brand"} · {bp?.process?.name || "Process"}</span>
                            <span className="mt-1 block text-xs text-[#718096]">Active from {displayDate(assignment.startDate)}{assignment.endDate ? ` to ${displayDate(assignment.endDate)}` : " · No end date"}</span>
                          </span>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${checked ? "bg-[#DCEFEB] text-[#176B67]" : "bg-[#EDF3F8] text-[#496176]"}`}>{checked ? "Selected" : "Available"}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <div className="rounded-lg bg-[#F7FAFC] px-3 py-2.5 text-xs text-[#64748B]">
                  Selected assignments: <strong className="text-[#18334F]">{editingAssignmentIds.length}</strong>. After saving, DataStraw will automatically revalidate coverage and refresh the conflicts list.
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-[#E1E7EF] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button type="button" onClick={closeAllocationEditor} disabled={savingAllocations} className={secondaryButton}>Cancel</button>
                <button type="submit" disabled={savingAllocations || loadingEditOptions} className={primaryButton}>
                  {savingAllocations ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                  {savingAllocations ? "Saving and validating..." : "Save and revalidate"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
