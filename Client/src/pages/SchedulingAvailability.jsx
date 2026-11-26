import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const PAGE_SIZE = 8;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TABS = [
  { id: "rules", label: "Operating Rules", icon: SlidersHorizontal },
  { id: "exceptions", label: "Date Exceptions", icon: CalendarDays },
  { id: "weekly-offs", label: "Weekly Offs", icon: Clock3 },
  { id: "availability", label: "Availability", icon: Users },
  { id: "leaves", label: "Leave Requests", icon: CalendarDays },
  { id: "holidays", label: "Public Holidays", icon: CalendarDays },
];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#18334F] outline-none transition placeholder:text-[#9AA8B7] focus:border-[#168F8B] focus:ring-3 focus:ring-[#168F8B]/10";
const labelClass = "block text-sm font-medium text-[#344B62]";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#168F8B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#117875] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9E2EC] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#496176] shadow-sm transition hover:bg-[#F7F9FC] disabled:opacity-60";

function errorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function dateInputValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

function formatDate(value) {
  const raw = dateInputValue(value);
  if (!raw) return "—";
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StatusBadge({ children, tone = "neutral" }) {
  const styles = {
    success: "bg-[#EAF6F3] text-[#176B67]",
    danger: "bg-[#FFF1F1] text-[#B45353]",
    warning: "bg-[#FFF7E8] text-[#A16207]",
    info: "bg-[#EDF3F8] text-[#28577C]",
    neutral: "bg-[#F1F4F8] text-[#64748B]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}>
      {children}
    </span>
  );
}

function Pagination({ page, pageCount, total, onChange, noun = "records" }) {
  if (total <= PAGE_SIZE) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const pageNumbers = Array.from({ length: pageCount }, (_, index) => index + 1);
  return (
    <div className="flex flex-col gap-3 border-t border-[#E1E7EF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#718096]">
        Showing <strong className="text-[#496176]">{start}–{end}</strong> of <strong className="text-[#496176]">{total}</strong> {noun}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} className="rounded-lg border border-[#D9E2EC] p-2 text-[#496176] hover:bg-[#F1F4F8] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        {pageNumbers.map((number) => (
          <button key={number} type="button" onClick={() => onChange(number)} aria-current={page === number ? "page" : undefined} className={`min-w-9 rounded-lg px-3 py-2 text-xs font-semibold ${page === number ? "bg-[#28577C] text-white" : "border border-[#D9E2EC] text-[#496176] hover:bg-[#F1F4F8]"}`}>
            {number}
          </button>
        ))}
        <button type="button" onClick={() => onChange(page + 1)} disabled={page === pageCount} className="rounded-lg border border-[#D9E2EC] p-2 text-[#496176] hover:bg-[#F1F4F8] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function DataTable({ columns, rows, loading, emptyText, noun = "records", page, setPage }) {
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  return (
    <div className="overflow-hidden rounded-xl border border-[#E1E7EF] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="bg-[#F7F9FC] text-xs uppercase tracking-wide text-[#718096]">
              {columns.map((column) => <th key={column.key} className="px-5 py-3.5 font-semibold">{column.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F5]">
            {loading ? (
              <tr><td colSpan={columns.length} className="px-5 py-14 text-center text-sm text-[#8492A6]"><span className="inline-flex items-center gap-2"><LoaderCircle size={17} className="animate-spin" /> Loading records...</span></td></tr>
            ) : visibleRows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-5 py-14 text-center text-sm text-[#8492A6]">{emptyText}</td></tr>
            ) : visibleRows.map((row) => (
              <tr key={row.id} className="transition hover:bg-[#FAFBFD]">
                {columns.map((column) => <td key={column.key} className="px-5 py-4 text-sm text-[#496176]">{column.render ? column.render(row) : row[column.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={safePage} pageCount={pageCount} total={rows.length} onChange={setPage} noun={noun} />
    </div>
  );
}

function Panel({ title, description, children, action }) {
  return (
    <section className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-[#18334F]">{title}</h2>
          {description && <p className="mt-1 text-sm text-[#718096]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, className = "" }) {
  return <label className={`${labelClass} ${className}`}>{label}{children}</label>;
}

function SubmitButton({ loading, children = "Save" }) {
  return <button type="submit" disabled={loading} className={primaryButton}>{loading && <LoaderCircle size={16} className="animate-spin" />}{loading ? "Saving..." : children}</button>;
}

export default function SchedulingAvailability() {
  const [activeTab, setActiveTab] = useState("rules");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [brandProcesses, setBrandProcesses] = useState([]);
  const [rules, setRules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [weeklyOffs, setWeeklyOffs] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [editingException, setEditingException] = useState(null);
  const [editingAvailability, setEditingAvailability] = useState(null);

  const [ruleForm, setRuleForm] = useState({ brandProcessId: "", dayOfWeek: "1", isOperating: "true", minimumStaff: "1" });
  const [exceptionForm, setExceptionForm] = useState({ brandProcessId: "", date: "", isOperating: "false", minimumStaff: "", reason: "" });
  const [weeklyForm, setWeeklyForm] = useState({ employeeId: "", dayOfWeek: "0" });
  const [availabilityForm, setAvailabilityForm] = useState({ employeeId: "", date: "", isAvailable: "false", reason: "" });
  const [leaveForm, setLeaveForm] = useState({ employeeId: "", type: "PLANNED", startDate: "", endDate: "", reason: "" });
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "" });

  const activeEmployees = useMemo(() => employees.filter((employee) => employee.status === "ACTIVE"), [employees]);
  const activeLinks = useMemo(() => brandProcesses.filter((item) => item.isActive && item.brand?.isActive && item.process?.isActive), [brandProcesses]);

  const loadData = useCallback(async () => {
    const [employeeRes, linksRes, rulesRes, exceptionsRes, weeklyRes, availabilityRes, leavesRes, holidaysRes] = await Promise.all([
      axios.get(`${API}/employees`),
      axios.get(`${API}/brand-processes`),
      axios.get(`${API}/operating-rules`),
      axios.get(`${API}/operating-exceptions`),
      axios.get(`${API}/weekly-offs`),
      axios.get(`${API}/availability`),
      axios.get(`${API}/leaves`),
      axios.get(`${API}/holidays`),
    ]);

    return {
      employees: employeeRes.data.data || [],
      brandProcesses: linksRes.data.data || [],
      rules: rulesRes.data.data || [],
      exceptions: exceptionsRes.data.data || [],
      weeklyOffs: weeklyRes.data.data || [],
      availability: availabilityRes.data.data || [],
      leaves: leavesRes.data.data || [],
      holidays: holidaysRes.data.data || [],
    };
  }, []);

  const applyData = useCallback((data) => {
    setEmployees(data.employees);
    setBrandProcesses(data.brandProcesses);
    setRules(data.rules);
    setExceptions(data.exceptions);
    setWeeklyOffs(data.weeklyOffs);
    setAvailability(data.availability);
    setLeaves(data.leaves);
    setHolidays(data.holidays);
  }, []);

  useEffect(() => {
    let ignore = false;
    loadData()
      .then((data) => {
        if (ignore) return;
        applyData(data);
        setPageError("");
      })
      .catch((error) => {
        if (!ignore) {
          console.error("Scheduling data load failed:", error);
          setPageError(errorMessage(error, "Unable to load scheduling data. Check the backend server."));
        }
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [applyData, loadData]);

  const refresh = async () => {
    setLoading(true);
    setPageError("");
    try {
      const data = await loadData();
      applyData(data);
    } catch (error) {
      setPageError(errorMessage(error, "Unable to refresh scheduling data."));
    } finally {
      setLoading(false);
    }
  };

  const runSave = async (request, successText, reset) => {
    setSaving(true);
    setPageError("");
    setNotice("");
    try {
      await request();
      if (reset) reset();
      const data = await loadData();
      applyData(data);
      setNotice(successText);
      setPage(1);
    } catch (error) {
      console.error("Scheduling update failed:", error);
      setPageError(errorMessage(error, "Unable to save this change."));
    } finally {
      setSaving(false);
    }
  };

  const handleRuleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      brandProcessId: ruleForm.brandProcessId,
      dayOfWeek: Number(ruleForm.dayOfWeek),
      isOperating: ruleForm.isOperating === "true",
      minimumStaff: Number(ruleForm.minimumStaff),
    };
    runSave(() => axios.post(`${API}/operating-rules`, payload), "Operating rule saved successfully.", () => {
      setRuleForm({ brandProcessId: "", dayOfWeek: "1", isOperating: "true", minimumStaff: "1" });
      setEditingRule(null);
    });
  };

  const startEditRule = (rule) => {
    setActiveTab("rules");
    setEditingRule(rule.id);
    setRuleForm({ brandProcessId: rule.brandProcessId, dayOfWeek: String(rule.dayOfWeek), isOperating: String(rule.isOperating), minimumStaff: String(rule.minimumStaff) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExceptionSubmit = (event) => {
    event.preventDefault();
    const payload = {
      brandProcessId: exceptionForm.brandProcessId,
      date: exceptionForm.date,
      isOperating: exceptionForm.isOperating === "true",
      ...(exceptionForm.minimumStaff !== "" ? { minimumStaff: Number(exceptionForm.minimumStaff) } : {}),
      reason: exceptionForm.reason.trim(),
    };
    runSave(() => axios.post(`${API}/operating-exceptions`, payload), "Date exception saved successfully.", () => {
      setExceptionForm({ brandProcessId: "", date: "", isOperating: "false", minimumStaff: "", reason: "" });
      setEditingException(null);
    });
  };

  const startEditException = (item) => {
    setActiveTab("exceptions");
    setEditingException(item.id);
    setExceptionForm({ brandProcessId: item.brandProcessId, date: dateInputValue(item.date), isOperating: String(item.isOperating), minimumStaff: item.minimumStaff == null ? "" : String(item.minimumStaff), reason: item.reason || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
const handleDeleteException = async (exception) => {
  const confirmed = window.confirm(
    `Delete this operating exception for ${exception.brandProcess?.brand?.name} - ${exception.brandProcess?.process?.name}?`
  );

  if (!confirmed) return;

  runSave(
    () =>
      axios.delete(`${API}/operating-exceptions/${exception.id}`),
    "Operating exception deleted successfully."
  );
};
  const handleWeeklySubmit = (event) => {
    event.preventDefault();
    runSave(() => axios.post(`${API}/weekly-offs`, { employeeId: weeklyForm.employeeId, dayOfWeek: Number(weeklyForm.dayOfWeek) }), "Employee weekly off saved successfully.", () => setWeeklyForm({ employeeId: "", dayOfWeek: "0" }));
  };

  const handleAvailabilitySubmit = (event) => {
    event.preventDefault();
    runSave(() => axios.post(`${API}/availability`, {
      employeeId: availabilityForm.employeeId,
      date: availabilityForm.date,
      isAvailable: availabilityForm.isAvailable === "true",
      reason: availabilityForm.reason.trim(),
    }), "Employee availability saved successfully.", () => {
      setAvailabilityForm({ employeeId: "", date: "", isAvailable: "false", reason: "" });
      setEditingAvailability(null);
    });
  };

  const startEditAvailability = (item) => {
    setActiveTab("availability");
    setEditingAvailability(item.id);
    setAvailabilityForm({ employeeId: item.employeeId, date: dateInputValue(item.date), isAvailable: String(item.isAvailable), reason: item.reason || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLeaveSubmit = (event) => {
    event.preventDefault();
    runSave(() => axios.post(`${API}/leaves`, {
      employeeId: leaveForm.employeeId,
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason.trim(),
    }), "Leave request submitted successfully.", () => setLeaveForm({ employeeId: "", type: "PLANNED", startDate: "", endDate: "", reason: "" }));
  };

  const updateLeave = (id, status) => {
    const action = status.toLowerCase();
    if (!window.confirm(`Are you sure you want to ${action} this leave request?`)) return;
    runSave(() => axios.patch(`${API}/leaves/${id}/status`, { status }), `Leave request ${action} successfully.`);
  };

  const handleHolidaySubmit = (event) => {
    event.preventDefault();
    runSave(() => axios.post(`${API}/holidays`, { name: holidayForm.name.trim(), date: holidayForm.date }), "Public holiday added successfully.", () => setHolidayForm({ name: "", date: "" }));
  };

  const deleteHoliday = (holiday) => {
    if (!window.confirm(`Delete public holiday "${holiday.name}"?`)) return;
    runSave(() => axios.delete(`${API}/holidays/${holiday.id}`), "Public holiday deleted successfully.");
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSearch("");
    setPage(1);
    setNotice("");
    setPageError("");
  };

  const filterRows = (items, getText) => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => getText(item).toLowerCase().includes(term));
  };

  const activeEmployeeName = (employee) => employee ? `${employee.firstName || ""} ${employee.lastName || ""}`.trim() : "Unknown employee";
  const brandProcessName = (link) => `${link?.brand?.name || "Unknown brand"} / ${link?.process?.name || "Unknown process"}`;

  const filteredRules = filterRows(rules, (r) => `${brandProcessName(r.brandProcess)} ${DAYS[r.dayOfWeek] || ""}`);
  const filteredExceptions = filterRows(exceptions, (r) => `${brandProcessName(r.brandProcess)} ${r.reason || ""} ${dateInputValue(r.date)}`);
  const filteredWeeklyOffs = filterRows(weeklyOffs, (r) => `${activeEmployeeName(r.employee)} ${r.employee?.employeeCode || ""} ${DAYS[r.dayOfWeek] || ""}`);
  const filteredAvailability = filterRows(availability, (r) => `${activeEmployeeName(r.employee)} ${r.employee?.employeeCode || ""} ${r.reason || ""} ${dateInputValue(r.date)}`);
  const filteredLeaves = filterRows(leaves, (r) => `${activeEmployeeName(r.employee)} ${r.employee?.employeeCode || ""} ${r.type} ${r.status} ${r.reason || ""}`);
  const filteredHolidays = filterRows(holidays, (r) => `${r.name} ${dateInputValue(r.date)}`);

  const statCards = [
    { label: "Operating rules", value: rules.length, icon: SlidersHorizontal, color: "bg-[#EDF3F8] text-[#28577C]" },
    { label: "Weekly offs", value: weeklyOffs.length, icon: Clock3, color: "bg-[#E7F4F2] text-[#168F8B]" },
    { label: "Pending leave requests", value: leaves.filter((item) => item.status === "PENDING").length, icon: CalendarDays, color: "bg-[#FFF7E8] text-[#A16207]" },
    { label: "Public holidays", value: holidays.length, icon: CalendarDays, color: "bg-[#EDF3F8] text-[#28577C]" },
  ];

  const renderSearch = () => (
    <label className="relative block w-full sm:max-w-xs">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8492A6]" />
      <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search records..." aria-label="Search records" className="w-full rounded-lg border border-[#D9E2EC] bg-white py-2.5 pl-9 pr-3 text-sm text-[#18334F] outline-none focus:border-[#168F8B]" />
    </label>
  );

  const renderRuleTab = () => (
    <div className="space-y-5">
      <Panel title={editingRule ? "Edit operating rule" : "Add operating rule"} description="Set which days a brand-process combination operates and the minimum number of employees required.">
        <form onSubmit={handleRuleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Brand / process"><select className={inputClass} value={ruleForm.brandProcessId} onChange={(e) => setRuleForm({ ...ruleForm, brandProcessId: e.target.value })} required><option value="">Select brand-process</option>{activeLinks.map((item) => <option key={item.id} value={item.id}>{brandProcessName(item)}</option>)}</select></Field>
          <Field label="Day of week"><select className={inputClass} value={ruleForm.dayOfWeek} onChange={(e) => setRuleForm({ ...ruleForm, dayOfWeek: e.target.value })}>{DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></Field>
          <Field label="Operating status"><select className={inputClass} value={ruleForm.isOperating} onChange={(e) => setRuleForm({ ...ruleForm, isOperating: e.target.value })}><option value="true">Open / Operating</option><option value="false">Closed / Not operating</option></select></Field>
          <Field label="Minimum staff"><input className={inputClass} type="number" min="0" step="1" value={ruleForm.minimumStaff} onChange={(e) => setRuleForm({ ...ruleForm, minimumStaff: e.target.value })} required /></Field>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-4"><SubmitButton loading={saving}>{editingRule ? "Update rule" : "Save operating rule"}</SubmitButton>{editingRule && <button type="button" className={secondaryButton} onClick={() => { setEditingRule(null); setRuleForm({ brandProcessId: "", dayOfWeek: "1", isOperating: "true", minimumStaff: "1" }); }}>Cancel edit</button>}</div>
          {activeLinks.length === 0 && <p className="text-xs text-[#B45309] md:col-span-2 xl:col-span-4">Create and activate a brand-process link before configuring its operating rules.</p>}
        </form>
      </Panel>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-[#18334F]">Configured operating rules</h3><p className="mt-1 text-sm text-[#718096]">{filteredRules.length} rules across brand-process combinations.</p></div>{renderSearch()}</div>
      <DataTable loading={loading} rows={filteredRules} page={page} setPage={setPage} emptyText="No operating rules configured yet." noun="rules" columns={[
        { key: "combination", label: "Brand / Process", render: (r) => <span className="font-semibold text-[#18334F]">{brandProcessName(r.brandProcess)}</span> },
        { key: "day", label: "Day", render: (r) => DAYS[r.dayOfWeek] || "—" },
        { key: "operating", label: "Operating", render: (r) => r.isOperating ? <StatusBadge tone="success">Operating</StatusBadge> : <StatusBadge>Closed</StatusBadge> },
        { key: "staff", label: "Minimum staff", render: (r) => <span className="font-semibold text-[#18334F]">{r.minimumStaff}</span> },
      {
  key: "actions",
  label: "Actions",
  render: (r) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => startEditRule(r)}
        disabled={saving}
        className="rounded-lg border border-[#D9E2EC] px-3 py-1.5 text-xs font-semibold text-[#28577C] hover:bg-[#EDF3F8]"
      >
        Edit
      </button>
    </div>
  ),
},
      ]} />
    </div>
  );

  const renderExceptionTab = () => (
    <div className="space-y-5">
      <Panel title={editingException ? "Edit date exception" : "Add date exception"} description="Override the normal weekly operating rule for a specific date. Saving the same brand-process and date updates the existing exception.">
        <form onSubmit={handleExceptionSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Brand / process"><select className={inputClass} value={exceptionForm.brandProcessId} onChange={(e) => setExceptionForm({ ...exceptionForm, brandProcessId: e.target.value })} required><option value="">Select brand-process</option>{activeLinks.map((item) => <option key={item.id} value={item.id}>{brandProcessName(item)}</option>)}</select></Field>
          <Field label="Date"><input className={inputClass} type="date" value={exceptionForm.date} onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })} required /></Field>
          <Field label="Operating status"><select className={inputClass} value={exceptionForm.isOperating} onChange={(e) => setExceptionForm({ ...exceptionForm, isOperating: e.target.value })}><option value="true">Open / Operating</option><option value="false">Closed / Not operating</option></select></Field>
          <Field label="Minimum staff (optional)"><input className={inputClass} type="number" min="0" step="1" value={exceptionForm.minimumStaff} onChange={(e) => setExceptionForm({ ...exceptionForm, minimumStaff: e.target.value })} placeholder="Use weekly rule if blank" /></Field>
          <Field label="Reason (optional)" className="md:col-span-2"><input className={inputClass} value={exceptionForm.reason} onChange={(e) => setExceptionForm({ ...exceptionForm, reason: e.target.value })} maxLength={250} placeholder="e.g. Special campaign operating day" /></Field>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-3"><SubmitButton loading={saving}>{editingException ? "Update exception" : "Save exception"}</SubmitButton>{editingException && <button type="button" className={secondaryButton} onClick={() => { setEditingException(null); setExceptionForm({ brandProcessId: "", date: "", isOperating: "false", minimumStaff: "", reason: "" }); }}>Cancel edit</button>}</div>
        </form>
      </Panel>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-[#18334F]">Date-specific exceptions</h3><p className="mt-1 text-sm text-[#718096]">Overrides applied to individual brand-process dates.</p></div>{renderSearch()}</div>
      <DataTable loading={loading} rows={filteredExceptions} page={page} setPage={setPage} emptyText="No date exceptions configured." noun="exceptions" columns={[
        { key: "combination", label: "Brand / Process", render: (r) => <span className="font-semibold text-[#18334F]">{brandProcessName(r.brandProcess)}</span> },
        { key: "date", label: "Date", render: (r) => formatDate(r.date) },
        { key: "operating", label: "Override", render: (r) => r.isOperating ? <StatusBadge tone="success">Operating</StatusBadge> : <StatusBadge>Closed</StatusBadge> },
        { key: "staff", label: "Minimum staff", render: (r) => r.minimumStaff ?? "Use weekly rule" },
        { key: "reason", label: "Reason", render: (r) => r.reason || "—" },
        { key: "actions", label: "Actions", render: (r) => (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => startEditException(r)} disabled={saving} className="rounded-lg border border-[#D9E2EC] px-3 py-1.5 text-xs font-semibold text-[#28577C] hover:bg-[#EDF3F8]">Edit</button>
            <button type="button" onClick={() => handleDeleteException(r)} disabled={saving} className="inline-flex items-center justify-center rounded-lg border border-[#F2D7D7] p-2 text-[#B45353] hover:bg-[#FFF1F1] disabled:opacity-50" title="Delete exception" aria-label="Delete exception"><Trash2 size={15} /></button>
          </div>
        ) },
      ]} />
    </div>
  );

  const renderWeeklyTab = () => (
    <div className="space-y-5">
      <Panel title="Assign employee weekly off" description="Select an active employee and the recurring day they are off. Day numbering follows Sunday = 0 through Saturday = 6.">
        <form onSubmit={handleWeeklySubmit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Employee"><select className={inputClass} value={weeklyForm.employeeId} onChange={(e) => setWeeklyForm({ ...weeklyForm, employeeId: e.target.value })} required><option value="">Select employee</option>{activeEmployees.map((item) => <option key={item.id} value={item.id}>{item.employeeCode} — {activeEmployeeName(item)}</option>)}</select></Field>
          <Field label="Weekly off day"><select className={inputClass} value={weeklyForm.dayOfWeek} onChange={(e) => setWeeklyForm({ ...weeklyForm, dayOfWeek: e.target.value })}>{DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></Field>
          <div className="flex items-end"><SubmitButton loading={saving}>Save weekly off</SubmitButton></div>
          {activeEmployees.length === 0 && <p className="text-xs text-[#B45309] sm:col-span-2 xl:col-span-3">There are no active employees available.</p>}
        </form>
      </Panel>
      <div className="rounded-lg border border-[#D8E5EF] bg-[#EDF3F8] px-4 py-3 text-sm text-[#28577C]">Weekly offs can be added or upserted through the current backend API. The API does not currently provide a delete or remove-weekly-off endpoint.</div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-[#18334F]">Employee weekly offs</h3><p className="mt-1 text-sm text-[#718096]">Recurring off days assigned to employees.</p></div>{renderSearch()}</div>
      <DataTable loading={loading} rows={filteredWeeklyOffs} page={page} setPage={setPage} emptyText="No weekly offs configured." noun="weekly offs" columns={[
        { key: "employee", label: "Employee", render: (r) => <div><p className="font-semibold text-[#18334F]">{activeEmployeeName(r.employee)}</p><p className="text-xs text-[#8492A6]">{r.employee?.employeeCode || ""}</p></div> },
        { key: "day", label: "Weekly off", render: (r) => <StatusBadge tone="info">{DAYS[r.dayOfWeek] || "—"}</StatusBadge> },
      ]} />
    </div>
  );

  const renderAvailabilityTab = () => (
    <div className="space-y-5">
      <Panel title={editingAvailability ? "Edit employee availability" : "Set employee availability"} description="Record an employee-specific availability exception for a particular date. A saved record can be updated by selecting Edit.">
        <form onSubmit={handleAvailabilitySubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Employee"><select className={inputClass} value={availabilityForm.employeeId} onChange={(e) => setAvailabilityForm({ ...availabilityForm, employeeId: e.target.value })} required><option value="">Select employee</option>{activeEmployees.map((item) => <option key={item.id} value={item.id}>{item.employeeCode} — {activeEmployeeName(item)}</option>)}</select></Field>
          <Field label="Date"><input className={inputClass} type="date" value={availabilityForm.date} onChange={(e) => setAvailabilityForm({ ...availabilityForm, date: e.target.value })} required /></Field>
          <Field label="Availability"><select className={inputClass} value={availabilityForm.isAvailable} onChange={(e) => setAvailabilityForm({ ...availabilityForm, isAvailable: e.target.value })}><option value="true">Available</option><option value="false">Unavailable</option></select></Field>
          <Field label="Reason (optional)"><input className={inputClass} value={availabilityForm.reason} onChange={(e) => setAvailabilityForm({ ...availabilityForm, reason: e.target.value })} maxLength={250} placeholder="Add a note" /></Field>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-4"><SubmitButton loading={saving}>{editingAvailability ? "Update availability" : "Save availability"}</SubmitButton>{editingAvailability && <button type="button" className={secondaryButton} onClick={() => { setEditingAvailability(null); setAvailabilityForm({ employeeId: "", date: "", isAvailable: "false", reason: "" }); }}>Cancel edit</button>}</div>
        </form>
      </Panel>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-[#18334F]">Employee availability records</h3><p className="mt-1 text-sm text-[#718096]">Date-specific availability and unavailability.</p></div>{renderSearch()}</div>
      <DataTable loading={loading} rows={filteredAvailability} page={page} setPage={setPage} emptyText="No employee availability records configured." noun="records" columns={[
        { key: "employee", label: "Employee", render: (r) => <div><p className="font-semibold text-[#18334F]">{activeEmployeeName(r.employee)}</p><p className="text-xs text-[#8492A6]">{r.employee?.employeeCode || ""}</p></div> },
        { key: "date", label: "Date", render: (r) => formatDate(r.date) },
        { key: "status", label: "Availability", render: (r) => r.isAvailable ? <StatusBadge tone="success">Available</StatusBadge> : <StatusBadge tone="danger">Unavailable</StatusBadge> },
        { key: "reason", label: "Reason", render: (r) => r.reason || "—" },
        { key: "actions", label: "Actions", render: (r) => <button type="button" onClick={() => startEditAvailability(r)} className="rounded-lg border border-[#D9E2EC] px-3 py-1.5 text-xs font-semibold text-[#28577C] hover:bg-[#EDF3F8]">Edit</button> },
      ]} />
    </div>
  );

  const renderLeaveTab = () => (
    <div className="space-y-5">
      <Panel title="Create leave request" description="Submit planned leave, sick leave or comp-off for an active employee. New requests start with Pending status.">
        <form onSubmit={handleLeaveSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Employee"><select className={inputClass} value={leaveForm.employeeId} onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })} required><option value="">Select employee</option>{activeEmployees.map((item) => <option key={item.id} value={item.id}>{item.employeeCode} — {activeEmployeeName(item)}</option>)}</select></Field>
          <Field label="Leave type"><select className={inputClass} value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}><option value="PLANNED">Planned</option><option value="SICK">Sick</option><option value="COMP_OFF">Comp-off</option></select></Field>
          <Field label="Start date"><input className={inputClass} type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required /></Field>
          <Field label="End date"><input className={inputClass} type="date" min={leaveForm.startDate || undefined} value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required /></Field>
          <Field label="Reason (optional)" className="md:col-span-2"><input className={inputClass} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} maxLength={500} placeholder="Reason for leave" /></Field>
          <div className="md:col-span-2 xl:col-span-3"><SubmitButton loading={saving}>Submit leave request</SubmitButton></div>
        </form>
      </Panel>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-[#18334F]">Leave requests</h3><p className="mt-1 text-sm text-[#718096]">Approve or reject pending requests.</p></div>{renderSearch()}</div>
      <DataTable loading={loading} rows={filteredLeaves} page={page} setPage={setPage} emptyText="No leave requests found." noun="requests" columns={[
        { key: "employee", label: "Employee", render: (r) => <div><p className="font-semibold text-[#18334F]">{activeEmployeeName(r.employee)}</p><p className="text-xs text-[#8492A6]">{r.employee?.employeeCode || ""} · {r.employee?.pod?.name || "No pod"}</p></div> },
        { key: "type", label: "Type", render: (r) => r.type === "COMP_OFF" ? "Comp-off" : r.type === "SICK" ? "Sick" : "Planned" },
        { key: "period", label: "Leave period", render: (r) => <span>{formatDate(r.startDate)} – {formatDate(r.endDate)}</span> },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{r.status}</StatusBadge> },
        { key: "reason", label: "Reason", render: (r) => r.reason || "—" },
        { key: "actions", label: "Actions", render: (r) => r.status === "PENDING" ? <div className="flex gap-1.5"><button type="button" onClick={() => updateLeave(r.id, "APPROVED")} disabled={saving} className="rounded-lg bg-[#EAF6F3] px-2.5 py-1.5 text-xs font-semibold text-[#176B67] hover:bg-[#D7EEE8]">Approve</button><button type="button" onClick={() => updateLeave(r.id, "REJECTED")} disabled={saving} className="rounded-lg bg-[#FFF1F1] px-2.5 py-1.5 text-xs font-semibold text-[#B45353] hover:bg-[#FDE2E2]">Reject</button></div> : <span className="text-xs text-[#9AA8B7]">Reviewed</span> },
      ]} />
    </div>
  );

  const renderHolidayTab = () => (
    <div className="space-y-5">
      <Panel title="Add public holiday" description="Company-wide holidays are applied when roster generation checks each brand-process holiday policy.">
        <form onSubmit={handleHolidaySubmit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Holiday name"><input className={inputClass} value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} required maxLength={120} placeholder="e.g. Republic Day" /></Field>
          <Field label="Holiday date"><input className={inputClass} type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} required /></Field>
          <div className="flex items-end"><SubmitButton loading={saving}>Add holiday</SubmitButton></div>
        </form>
      </Panel>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-[#18334F]">Company public holidays</h3><p className="mt-1 text-sm text-[#718096]">Remove an incorrect holiday; roster calendars use these dates.</p></div>{renderSearch()}</div>
      <DataTable loading={loading} rows={filteredHolidays} page={page} setPage={setPage} emptyText="No public holidays added." noun="holidays" columns={[
        { key: "name", label: "Holiday", render: (r) => <span className="font-semibold text-[#18334F]">{r.name}</span> },
        { key: "date", label: "Date", render: (r) => formatDate(r.date) },
        { key: "actions", label: "Actions", render: (r) => <button type="button" onClick={() => deleteHoliday(r)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-[#F2D7D7] px-3 py-1.5 text-xs font-semibold text-[#B45353] hover:bg-[#FFF1F1] disabled:opacity-50"><Trash2 size={14} /> Delete</button> },
      ]} />
    </div>
  );

  const pendingLeaves = leaves.filter((item) => item.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#168F8B]">Workforce configuration</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#18334F]">Scheduling & Availability</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#718096]">Manage process operating calendars, employee weekly offs, availability, leave requests and company holidays.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className={secondaryButton}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh data</button>
      </div>

      {pageError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{pageError}</span></div>}
      {notice && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-[#B9E1D8] bg-[#EAF6F3] px-4 py-3 text-sm text-[#176B67]"><span className="flex items-center gap-2"><CheckCircle2 size={17} />{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss message"><X size={15} /></button></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return <div key={card.label} className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-medium text-[#718096]">{card.label}</span><span className={`rounded-lg p-2.5 ${card.color}`}><Icon size={19} /></span></div><p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : card.value}</p><p className="mt-1 text-xs text-[#8492A6]">Live database count</p></div>;
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E1E7EF] bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-[#E1E7EF] bg-[#F9FBFD] p-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return <button key={tab.id} type="button" onClick={() => changeTab(tab.id)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-[#28577C] text-white shadow-sm" : "text-[#496176] hover:bg-[#EDF3F8]"}`}><Icon size={16} />{tab.label}{tab.id === "leaves" && pendingLeaves > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20 text-white" : "bg-[#FFF0D6] text-[#A16207]"}`}>{pendingLeaves}</span>}</button>;
          })}
        </div>
        <div className="p-5">
          {activeTab === "rules" && renderRuleTab()}
          {activeTab === "exceptions" && renderExceptionTab()}
          {activeTab === "weekly-offs" && renderWeeklyTab()}
          {activeTab === "availability" && renderAvailabilityTab()}
          {activeTab === "leaves" && renderLeaveTab()}
          {activeTab === "holidays" && renderHolidayTab()}
        </div>
      </div>

      <p className="text-xs leading-5 text-[#8492A6]">Scheduling rules and employee availability are stored independently: brand-process rules define required coverage, while weekly offs, availability and approved leave define individual employee constraints.</p>
    </div>
  );
}
