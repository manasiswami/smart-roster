import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserRoundCheck,
  UserRoundX,
  X,
} from "lucide-react";

const API = import.meta.env.SERVER_URL || "http://localhost:5000/api";
const PAGE_SIZE = 8;
const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#18334F] outline-none transition placeholder:text-[#9AA8B7] focus:border-[#168F8B] focus:ring-3 focus:ring-[#168F8B]/10";

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function todayInputValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "No end date";
  const datePart = toDateInput(value);
  const date = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-[#EAF6F3] text-[#176B67]"
          : "bg-[#F1F4F8] text-[#64748B]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-[#168F8B]" : "bg-[#94A3B8]"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) {
  if (totalItems <= pageSize) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-[#E1E7EF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#718096]">
        Showing <span className="font-semibold text-[#496176]">{start}–{end}</span> of{" "}
        <span className="font-semibold text-[#496176]">{totalItems}</span> assignments
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 rounded-lg border border-[#D9E2EC] px-3 py-2 text-xs font-semibold text-[#496176] transition hover:bg-[#F1F4F8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Previous
        </button>
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={currentPage === page ? "page" : undefined}
            className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
              currentPage === page
                ? "bg-[#28577C] text-white"
                : "border border-[#D9E2EC] text-[#496176] hover:bg-[#F1F4F8]"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-[#D9E2EC] px-3 py-2 text-xs font-semibold text-[#496176] transition hover:bg-[#F1F4F8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function AssignmentModal({
  assignment,
  employees,
  brandProcesses,
  onClose,
  onSaved,
}) {
  const [employeeId, setEmployeeId] = useState(assignment?.employeeId || "");
  const [brandProcessId, setBrandProcessId] = useState(
    assignment?.brandProcessId || ""
  );
  const [startDate, setStartDate] = useState(
    toDateInput(assignment?.startDate) || todayInputValue()
  );
  const [endDate, setEndDate] = useState(toDateInput(assignment?.endDate));
  const [status, setStatus] = useState(assignment?.status || "ACTIVE");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!startDate) {
      setFormError("Please select an assignment start date.");
      return;
    }
    if (endDate && endDate < startDate) {
      setFormError("End date cannot be before start date.");
      return;
    }
    if (!assignment && (!employeeId || !brandProcessId)) {
      setFormError("Please select an employee and a brand-process combination.");
      return;
    }

    try {
      setSaving(true);
      if (assignment) {
        await axios.patch(`${API}/assignments/${assignment.id}`, {
          status,
          startDate,
          endDate: endDate || null,
        });
        await onSaved("Assignment updated successfully.");
      } else {
        await axios.post(`${API}/assignments`, {
          employeeId,
          brandProcessId,
          startDate,
          endDate: endDate || null,
        });
        await onSaved("Employee assignment created successfully.");
      }
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          assignment
            ? "Unable to update this assignment."
            : "Unable to create this assignment."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#102A43]/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-modal-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#E1E7EF] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#168F8B]">
              Workforce allocation
            </p>
            <h2
              id="assignment-modal-title"
              className="mt-1 text-xl font-bold text-[#18334F]"
            >
              {assignment ? "Edit assignment" : "Create employee assignment"}
            </h2>
            <p className="mt-1 text-sm text-[#718096]">
              {assignment
                ? "Update the assignment period or operational status."
                : "Select an active employee and an active brand-process combination."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-[#718096] transition hover:bg-[#F1F4F8] hover:text-[#18334F] disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {assignment ? (
            <div className="grid gap-3 rounded-xl border border-[#E1E7EF] bg-[#F7F9FC] p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[#718096]">Employee</p>
                <p className="mt-1 text-sm font-semibold text-[#18334F]">
                  {assignment.employee?.firstName} {assignment.employee?.lastName}
                </p>
                <p className="text-xs text-[#718096]">
                  {assignment.employee?.employeeCode}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#718096]">Brand / Process</p>
                <p className="mt-1 text-sm font-semibold text-[#18334F]">
                  {assignment.brandProcess?.brand?.name || "—"}
                </p>
                <p className="text-xs text-[#718096]">
                  {assignment.brandProcess?.process?.name || "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[#344B62]">
                Employee <span className="text-red-500">*</span>
                <span className="relative block">
                  <select
                    className={`${INPUT_CLASS} appearance-none pr-9`}
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value)}
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.employeeCode} — {employee.firstName} {employee.lastName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]"
                  />
                </span>
              </label>
              <label className="block text-sm font-medium text-[#344B62]">
                Brand / Process <span className="text-red-500">*</span>
                <span className="relative block">
                  <select
                    className={`${INPUT_CLASS} appearance-none pr-9`}
                    value={brandProcessId}
                    onChange={(event) => setBrandProcessId(event.target.value)}
                    required
                  >
                    <option value="">Select brand-process</option>
                    {brandProcesses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.brand?.name} — {item.process?.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]"
                  />
                </span>
              </label>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[#344B62]">
              Start date <span className="text-red-500">*</span>
              <input
                className={INPUT_CLASS}
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-[#344B62]">
              End date <span className="text-xs font-normal text-[#8492A6]">(optional)</span>
              <input
                className={INPUT_CLASS}
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>

          {assignment && (
            <label className="block text-sm font-medium text-[#344B62]">
              Assignment status
              <span className="relative block sm:max-w-xs">
                <select
                  className={`${INPUT_CLASS} appearance-none pr-9`}
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]"
                />
              </span>
            </label>
          )}

          {!assignment && (employees.length === 0 || brandProcesses.length === 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              {employees.length === 0
                ? "No active employees are available. Add or activate an employee first."
                : "No active brand-process combinations are available. Create and activate a brand-process link first."}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#E1E7EF] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-[#D9E2EC] px-4 py-2.5 text-sm font-semibold text-[#496176] transition hover:bg-[#F1F4F8] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                (!assignment && (employees.length === 0 || brandProcesses.length === 0))
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#168F8B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#117875] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              {saving
                ? "Saving..."
                : assignment
                  ? "Save changes"
                  : "Create assignment"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [brandProcesses, setBrandProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalAssignment, setModalAssignment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState("");
  const tableRef = useRef(null);

  const loadAssignments = useCallback(async () => {
    const [assignmentResponse, employeeResponse, brandProcessResponse] =
      await Promise.all([
        axios.get(`${API}/assignments`),
        axios.get(`${API}/employees`),
        axios.get(`${API}/brand-processes`),
      ]);

    return {
      assignments: assignmentResponse.data.data || [],
      employees: employeeResponse.data.data || [],
      brandProcesses: brandProcessResponse.data.data || [],
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    loadAssignments()
      .then((result) => {
        if (ignore) return;
        setAssignments(result.assignments);
        setEmployees(result.employees.filter((employee) => employee.status === "ACTIVE"));
        setBrandProcesses(
          result.brandProcesses.filter(
            (item) => item.isActive && item.brand?.isActive && item.process?.isActive
          )
        );
        setPageError("");
      })
      .catch((error) => {
        if (ignore) return;
        console.error("Unable to load assignments:", error);
        setPageError(
          getErrorMessage(error, "Unable to load assignment data. Check the backend server.")
        );
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [loadAssignments]);

  const refreshAssignments = async () => {
    setLoading(true);
    setPageError("");
    try {
      const result = await loadAssignments();
      setAssignments(result.assignments);
      setEmployees(result.employees.filter((employee) => employee.status === "ACTIVE"));
      setBrandProcesses(
        result.brandProcesses.filter(
          (item) => item.isActive && item.brand?.isActive && item.process?.isActive
        )
      );
    } catch (error) {
      console.error("Unable to refresh assignments:", error);
      setPageError(
        getErrorMessage(error, "Unable to refresh assignment data. Check the backend server.")
      );
    } finally {
      setLoading(false);
    }
  };

  const activeCount = assignments.filter((item) => item.status === "ACTIVE").length;
  const assignedEmployeeCount = new Set(
    assignments.filter((item) => item.status === "ACTIVE").map((item) => item.employeeId)
  ).size;

  const brands = useMemo(() => {
    const map = new Map();
    assignments.forEach((item) => {
      if (item.brandProcess?.brand?.id) {
        map.set(item.brandProcess.brand.id, item.brandProcess.brand.name);
      }
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assignments.filter((item) => {
      const employee = item.employee || {};
      const brand = item.brandProcess?.brand || {};
      const process = item.brandProcess?.process || {};
      const matchesSearch =
        !query ||
        [
          employee.employeeCode,
          employee.firstName,
          employee.lastName,
          employee.email,
          employee.pod?.name,
          brand.name,
          process.name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesBrand = brandFilter === "ALL" || brand.id === brandFilter;
      return matchesSearch && matchesStatus && matchesBrand;
    });
  }, [assignments, search, statusFilter, brandFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageAssignments = filteredAssignments.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const changePage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
    requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSaved = async (message) => {
    setModalOpen(false);
    setModalAssignment(null);
    setNotice(message);
    await refreshAssignments();
  };

  const openCreateModal = () => {
    setModalAssignment(null);
    setModalOpen(true);
  };

  const openEditModal = (assignment) => {
    setModalAssignment(assignment);
    setModalOpen(true);
  };

  const handleDeactivate = async (assignment) => {
    const employeeName = `${assignment.employee?.firstName || "Employee"} ${assignment.employee?.lastName || ""}`.trim();
    const brandName = assignment.brandProcess?.brand?.name || "brand";
    const processName = assignment.brandProcess?.process?.name || "process";
    const confirmed = window.confirm(
      `Deactivate ${employeeName}'s ${brandName} / ${processName} assignment? Historical records will be preserved.`
    );
    if (!confirmed) return;

    try {
      setDeactivatingId(assignment.id);
      setPageError("");
      await axios.delete(`${API}/assignments/${assignment.id}`);
      setNotice("Assignment deactivated successfully.");
      await refreshAssignments();
    } catch (error) {
      setPageError(getErrorMessage(error, "Unable to deactivate this assignment."));
    } finally {
      setDeactivatingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#168F8B]">
            Workforce allocation
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#18334F]">
            Employee assignments
          </h1>
          <p className="mt-1 text-sm text-[#718096]">
            Allocate employees to the brands and processes they support.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshAssignments}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9E2EC] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#496176] shadow-sm transition hover:bg-[#F7F9FC] disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={loading || employees.length === 0 || brandProcesses.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#168F8B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#117875] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={17} />
            Add assignment
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#B9E1D8] bg-[#EAF6F3] px-4 py-3 text-sm text-[#176B67]">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={17} /> {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
            className="rounded p-1 hover:bg-[#D7EEE8]"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {pageError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#718096]">Total assignments</span>
            <span className="rounded-lg bg-[#EDF3F8] p-2.5 text-[#28577C]"><ClipboardList size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : assignments.length}</p>
          <p className="mt-1 text-xs text-[#8492A6]">All assignment records</p>
        </div>
        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#718096]">Active assignments</span>
            <span className="rounded-lg bg-[#EAF6F3] p-2.5 text-[#168F8B]"><UserRoundCheck size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : activeCount}</p>
          <p className="mt-1 text-xs text-[#8492A6]">Currently active allocations</p>
        </div>
        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#718096]">Employees assigned</span>
            <span className="rounded-lg bg-[#F1F4F8] p-2.5 text-[#64748B]"><UserRoundX size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : assignedEmployeeCount}</p>
          <p className="mt-1 text-xs text-[#8492A6]">Unique employees with active assignments</p>
        </div>
      </div>

      <section
        ref={tableRef}
        className="scroll-mt-24 overflow-hidden rounded-xl border border-[#E1E7EF] bg-white shadow-sm"
      >
        <div className="flex flex-col gap-4 border-b border-[#E1E7EF] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-[#18334F]">All assignments</h2>
            <p className="mt-1 text-sm text-[#718096]">
              {loading
                ? "Loading assignment records..."
                : `Showing ${filteredAssignments.length} of ${assignments.length} assignments`}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[660px]">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8492A6]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search assignments..."
                aria-label="Search assignments"
                className="w-full rounded-lg border border-[#D9E2EC] bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-[#9AA8B7] focus:border-[#168F8B] focus:ring-3 focus:ring-[#168F8B]/10"
              />
            </label>
            <label className="relative block">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by assignment status"
                className="w-full appearance-none rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 pr-9 text-sm text-[#496176] outline-none focus:border-[#168F8B]"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]" />
            </label>
            <label className="relative block">
              <select
                value={brandFilter}
                onChange={(event) => {
                  setBrandFilter(event.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by brand"
                className="w-full appearance-none rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 pr-9 text-sm text-[#496176] outline-none focus:border-[#168F8B]"
              >
                <option value="ALL">All brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]" />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="bg-[#F7F9FC] text-xs uppercase tracking-wide text-[#718096]">
                <th className="px-5 py-3.5 font-semibold">Employee</th>
                <th className="px-5 py-3.5 font-semibold">Pod</th>
                <th className="px-5 py-3.5 font-semibold">Brand</th>
                <th className="px-5 py-3.5 font-semibold">Process</th>
                <th className="px-5 py-3.5 font-semibold">Start date</th>
                <th className="px-5 py-3.5 font-semibold">End date</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-14 text-center text-sm text-[#8492A6]">
                    <span className="inline-flex items-center gap-2"><LoaderCircle size={17} className="animate-spin" /> Loading assignments...</span>
                  </td>
                </tr>
              ) : pageAssignments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-14 text-center">
                    <ClipboardList size={28} className="mx-auto text-[#A8B5C3]" />
                    <p className="mt-2 text-sm font-semibold text-[#496176]">No assignments found</p>
                    <p className="mt-1 text-xs text-[#8492A6]">Try changing your search or filters, or create an assignment.</p>
                  </td>
                </tr>
              ) : (
                pageAssignments.map((assignment) => (
                  <tr key={assignment.id} className="transition hover:bg-[#FAFBFD]">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-[#18334F]">
                          {assignment.employee?.firstName} {assignment.employee?.lastName}
                        </p>
                        <p className="mt-0.5 text-xs text-[#8492A6]">
                          {assignment.employee?.employeeCode} · {assignment.employee?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#496176]">
                      {assignment.employee?.pod?.name || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-[#496176]">
                      {assignment.brandProcess?.brand?.name || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#496176]">
                      {assignment.brandProcess?.process?.name || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#496176]">{formatDate(assignment.startDate)}</td>
                    <td className="px-5 py-4 text-sm text-[#496176]">{formatDate(assignment.endDate)}</td>
                    <td className="px-5 py-4"><StatusBadge active={assignment.status === "ACTIVE"} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(assignment)}
                          title="Edit assignment"
                          aria-label="Edit assignment"
                          className="rounded-lg border border-[#D9E2EC] p-2 text-[#496176] transition hover:border-[#B8C9D8] hover:bg-[#EDF3F8] hover:text-[#28577C]"
                        >
                          <Pencil size={15} />
                        </button>
                        {assignment.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(assignment)}
                            disabled={deactivatingId === assignment.id}
                            title="Deactivate assignment"
                            aria-label="Deactivate assignment"
                            className="rounded-lg border border-[#F2D7D7] p-2 text-[#B45353] transition hover:bg-[#FFF1F1] disabled:opacity-50"
                          >
                            {deactivatingId === assignment.id
                              ? <LoaderCircle size={15} className="animate-spin" />
                              : <UserRoundX size={15} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredAssignments.length}
          pageSize={PAGE_SIZE}
          onPageChange={changePage}
        />
      </section>

      {modalOpen && (
        <AssignmentModal
          assignment={modalAssignment}
          employees={employees}
          brandProcesses={brandProcesses}
          onClose={() => { setModalOpen(false); setModalAssignment(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
