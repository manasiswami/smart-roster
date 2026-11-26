import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserRoundX,
  Users,
  X,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const PAGE_SIZE = 8;
const EMPTY_FORM = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  podId: "",
  status: "ACTIVE",
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#18334F] outline-none transition placeholder:text-[#9AA8B7] focus:border-[#168F8B] focus:ring-3 focus:ring-[#168F8B]/10";

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function EmployeeModal({ employee, pods, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    employee
      ? {
          employeeCode: employee.employeeCode || "",
          firstName: employee.firstName || "",
          lastName: employee.lastName || "",
          email: employee.email || "",
          phone: employee.phone || "",
          podId: employee.podId || employee.pod?.id || "",
          status: employee.status || "ACTIVE",
        }
      : { ...EMPTY_FORM, podId: pods[0]?.id || "" }
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.podId) {
      setFormError("Please select an operational pod.");
      return;
    }

    const payload = {
      employeeCode: form.employeeCode.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      podId: form.podId,
    };

    if (employee) payload.status = form.status;

    try {
      setSaving(true);
      if (employee) {
        await axios.patch(`${API}/employees/${employee.id}`, payload);
      } else {
        await axios.post(`${API}/employees`, payload);
      }
      await onSaved(employee ? "Employee details updated." : "Employee added successfully.");
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          employee ? "Unable to update this employee." : "Unable to add this employee."
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
        aria-labelledby="employee-modal-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#E1E7EF] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#168F8B]">
              Team management
            </p>
            <h2 id="employee-modal-title" className="mt-1 text-xl font-bold text-[#18334F]">
              {employee ? "Edit employee" : "Add new employee"}
            </h2>
            <p className="mt-1 text-sm text-[#718096]">
              {employee
                ? "Update employee details and operational status."
                : "Add an employee and assign them to an operational pod."}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#344B62]">
              Employee code <span className="text-red-500">*</span>
              <input
                className={inputClass}
                name="employeeCode"
                value={form.employeeCode}
                onChange={updateField}
                placeholder="e.g. DS031"
                required
                maxLength={30}
                autoComplete="off"
              />
            </label>
            <label className="text-sm font-medium text-[#344B62]">
              First name <span className="text-red-500">*</span>
              <input
                className={inputClass}
                name="firstName"
                value={form.firstName}
                onChange={updateField}
                placeholder="Enter first name"
                required
                maxLength={80}
                autoComplete="given-name"
              />
            </label>
            <label className="text-sm font-medium text-[#344B62]">
              Last name <span className="text-red-500">*</span>
              <input
                className={inputClass}
                name="lastName"
                value={form.lastName}
                onChange={updateField}
                placeholder="Enter last name"
                required
                maxLength={80}
                autoComplete="family-name"
              />
            </label>
            <label className="text-sm font-medium text-[#344B62]">
              Email address <span className="text-red-500">*</span>
              <input
                className={inputClass}
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="name@company.com"
                required
                maxLength={150}
                autoComplete="email"
              />
            </label>
            <label className="text-sm font-medium text-[#344B62]">
              Phone number
              <input
                className={inputClass}
                type="tel"
                name="phone"
                value={form.phone}
                onChange={updateField}
                placeholder="Optional contact number"
                maxLength={25}
                autoComplete="tel"
              />
            </label>
            <label className="text-sm font-medium text-[#344B62]">
              Operational pod <span className="text-red-500">*</span>
              <span className="relative block">
                <select
                  className={`${inputClass} appearance-none pr-9`}
                  name="podId"
                  value={form.podId}
                  onChange={updateField}
                  required
                >
                  <option value="">Select a pod</option>
                  {pods.map((pod) => (
                    <option key={pod.id} value={pod.id}>
                      {pod.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]"
                />
              </span>
            </label>
            {employee && (
              <label className="text-sm font-medium text-[#344B62] sm:col-span-2">
                Employee status
                <span className="relative block sm:max-w-xs">
                  <select
                    className={`${inputClass} appearance-none pr-9`}
                    name="status"
                    value={form.status}
                    onChange={updateField}
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
          </div>

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
              disabled={saving || pods.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#168F8B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#117875] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              {saving ? "Saving..." : employee ? "Save changes" : "Add employee"}
            </button>
          </div>
          {pods.length === 0 && (
            <p className="text-right text-xs text-[#B45309]">
              Create an operational pod before adding an employee.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [podFilter, setPodFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalEmployee, setModalEmployee] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState("");

  const loadEmployees = useCallback(async () => {
    const [employeeResponse, podResponse] = await Promise.all([
      axios.get(`${API}/employees`),
      axios.get(`${API}/pods`),
    ]);

    return {
      employees: employeeResponse.data.data || [],
      pods: podResponse.data.data || [],
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    loadEmployees()
      .then(({ employees: nextEmployees, pods: nextPods }) => {
        if (ignore) return;
        setEmployees(nextEmployees);
        setPods(nextPods);
        setPageError("");
      })
      .catch((error) => {
        if (ignore) return;
        console.error("Unable to load employee management data:", error);
        setPageError(
          getErrorMessage(
            error,
            "Unable to load employees. Check that the backend server is running."
          )
        );
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [loadEmployees]);

  const refreshEmployees = async () => {
    setLoading(true);
    setPageError("");
    try {
      const { employees: nextEmployees, pods: nextPods } = await loadEmployees();
      setEmployees(nextEmployees);
      setPods(nextPods);
    } catch (error) {
      console.error("Unable to load employee management data:", error);
      setPageError(
        getErrorMessage(
          error,
          "Unable to load employees. Check that the backend server is running."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const activeCount = employees.filter((employee) => employee.status === "ACTIVE").length;
  const inactiveCount = employees.length - activeCount;

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          employee.employeeCode,
          employee.firstName,
          employee.lastName,
          employee.email,
          employee.phone,
          employee.pod?.name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === "ALL" || employee.status === statusFilter;
      const matchesPod = podFilter === "ALL" || employee.podId === podFilter;
      return matchesSearch && matchesStatus && matchesPod;
    });
  }, [employees, search, statusFilter, podFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (visiblePage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredEmployees, visiblePage]);

  const firstVisibleEmployee = filteredEmployees.length === 0
    ? 0
    : (visiblePage - 1) * PAGE_SIZE + 1;
  const lastVisibleEmployee = Math.min(visiblePage * PAGE_SIZE, filteredEmployees.length);

  const handlePageChange = (nextPage) => {
    setCurrentPage(nextPage);
    document.getElementById("employee-table")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [];
    const start = Math.max(1, visiblePage - 1);
    const end = Math.min(totalPages, visiblePage + 1);

    if (start > 1) pages.push(1);
    if (start > 2) pages.push("start-ellipsis");
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (end < totalPages - 1) pages.push("end-ellipsis");
    if (end < totalPages) pages.push(totalPages);

    return pages;
  }, [visiblePage, totalPages]);

  const handleSaved = async (message) => {
    setModalOpen(false);
    setModalEmployee(null);
    setNotice(message);
    await refreshEmployees();
  };

  const openCreateModal = () => {
    setModalEmployee(null);
    setModalOpen(true);
  };

  const openEditModal = (employee) => {
    setModalEmployee(employee);
    setModalOpen(true);
  };

  const handleDeactivate = async (employee) => {
    const confirmed = window.confirm(
      `Deactivate ${employee.firstName} ${employee.lastName} (${employee.employeeCode})? Their historical roster and assignment records will be preserved.`
    );
    if (!confirmed) return;

    try {
      setDeactivatingId(employee.id);
      setPageError("");
      await axios.delete(`${API}/employees/${employee.id}`);
      setNotice(`${employee.firstName} ${employee.lastName} has been deactivated.`);
      await refreshEmployees();
    } catch (error) {
      setPageError(getErrorMessage(error, "Unable to deactivate this employee."));
    } finally {
      setDeactivatingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#168F8B]">
            Workforce administration
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#18334F]">
            Employee management
          </h1>
          <p className="mt-1 text-sm text-[#718096]">
            Maintain employee details and their operational pod assignments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshEmployees}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9E2EC] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#496176] shadow-sm transition hover:bg-[#F7F9FC] disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={pods.length === 0 && !loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#168F8B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#117875] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={17} />
            Add employee
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
            <span className="text-sm font-medium text-[#718096]">Total employees</span>
            <span className="rounded-lg bg-[#EDF3F8] p-2.5 text-[#28577C]"><Users size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : employees.length}</p>
          <p className="mt-1 text-xs text-[#8492A6]">Registered in the system</p>
        </div>
        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#718096]">Active employees</span>
            <span className="rounded-lg bg-[#EAF6F3] p-2.5 text-[#168F8B]"><CheckCircle2 size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : activeCount}</p>
          <p className="mt-1 text-xs text-[#8492A6]">Available for operational assignment</p>
        </div>
        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#718096]">Inactive employees</span>
            <span className="rounded-lg bg-[#F1F4F8] p-2.5 text-[#718096]"><UserRoundX size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : inactiveCount}</p>
          <p className="mt-1 text-xs text-[#8492A6]">Historical records retained</p>
        </div>
      </div>

      <section id="employee-table" className="scroll-mt-4 overflow-hidden rounded-xl border border-[#E1E7EF] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#E1E7EF] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-[#18334F]">All employees</h2>
            <p className="mt-1 text-sm text-[#718096]">
              {loading ? "Loading employee records..." : `Showing ${filteredEmployees.length} of ${employees.length} employees`}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[620px]">
            <label className="relative block sm:col-span-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8492A6]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search employees..."
                aria-label="Search employees"
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
                aria-label="Filter by status"
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
                value={podFilter}
                onChange={(event) => {
                  setPodFilter(event.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by pod"
                className="w-full appearance-none rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 pr-9 text-sm text-[#496176] outline-none focus:border-[#168F8B]"
              >
                <option value="ALL">All pods</option>
                {pods.map((pod) => <option key={pod.id} value={pod.id}>{pod.name}</option>)}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]" />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="bg-[#F7F9FC] text-xs uppercase tracking-wide text-[#718096]">
                <th className="px-5 py-3.5 font-semibold">Employee</th>
                <th className="px-5 py-3.5 font-semibold">Employee code</th>
                <th className="px-5 py-3.5 font-semibold">Operational pod</th>
                <th className="px-5 py-3.5 font-semibold">Assignments</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5]">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-14 text-center text-sm text-[#8492A6]">
                  <span className="inline-flex items-center gap-2"><LoaderCircle size={17} className="animate-spin" /> Loading employees...</span>
                </td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-14 text-center">
                  <Users size={28} className="mx-auto text-[#A8B5C3]" />
                  <p className="mt-2 text-sm font-semibold text-[#496176]">No employees found</p>
                  <p className="mt-1 text-xs text-[#8492A6]">Try changing your search or filters.</p>
                </td></tr>
              ) : paginatedEmployees.map((employee) => (
                <tr key={employee.id} className="transition hover:bg-[#FAFBFD]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF1F7] text-sm font-bold text-[#28577C]">
                        {`${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`.toUpperCase() || "—"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#18334F]">{employee.firstName} {employee.lastName}</p>
                        <p className="truncate text-xs text-[#8492A6]">{employee.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-[#496176]">{employee.employeeCode}</td>
                  <td className="px-5 py-4 text-sm text-[#496176]">{employee.pod?.name || "Not assigned"}</td>
                  <td className="px-5 py-4 text-sm text-[#496176]">{employee._count?.assignments ?? 0}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${employee.status === "ACTIVE" ? "bg-[#EAF6F3] text-[#176B67]" : "bg-[#F1F4F8] text-[#64748B]"}`}>
                      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${employee.status === "ACTIVE" ? "bg-[#168F8B]" : "bg-[#94A3B8]"}`} />
                      {employee.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(employee)}
                        title="Edit employee"
                        aria-label={`Edit ${employee.firstName} ${employee.lastName}`}
                        className="rounded-lg border border-[#D9E2EC] p-2 text-[#496176] transition hover:border-[#B8C9D8] hover:bg-[#EDF3F8] hover:text-[#28577C]"
                      ><Pencil size={15} /></button>
                      {employee.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(employee)}
                          disabled={deactivatingId === employee.id}
                          title="Deactivate employee"
                          aria-label={`Deactivate ${employee.firstName} ${employee.lastName}`}
                          className="rounded-lg border border-[#F2D7D7] p-2 text-[#B45353] transition hover:bg-[#FFF1F1] disabled:opacity-50"
                        >
                          {deactivatingId === employee.id ? <LoaderCircle size={15} className="animate-spin" /> : <UserRoundX size={15} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E1E7EF] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#718096]" aria-live="polite">
            Showing <span className="font-semibold text-[#18334F]">{firstVisibleEmployee}-{lastVisibleEmployee}</span> of{" "}
            <span className="font-semibold text-[#18334F]">{filteredEmployees.length}</span> employees
          </p>

          <nav className="flex flex-wrap items-center justify-end gap-1.5" aria-label="Employee table pagination">
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, visiblePage - 1))}
              disabled={visiblePage === 1 || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm font-medium text-[#496176] transition hover:bg-[#F1F4F8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            {pageNumbers.map((page) => (
              typeof page === "number" ? (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  aria-current={visiblePage === page ? "page" : undefined}
                  aria-label={`Go to page ${page}`}
                  className={`min-w-9 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    visiblePage === page
                      ? "border-[#28577C] bg-[#28577C] text-white shadow-sm"
                      : "border-[#D9E2EC] bg-white text-[#496176] hover:bg-[#EDF3F8]"
                  }`}
                >
                  {page}
                </button>
              ) : (
                <span key={page} className="px-1.5 text-sm text-[#8492A6]" aria-hidden="true">
                  …
                </span>
              )
            ))}

            <button
              type="button"
              onClick={() => handlePageChange(Math.min(totalPages, visiblePage + 1))}
              disabled={visiblePage === totalPages || loading || filteredEmployees.length === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm font-medium text-[#496176] transition hover:bg-[#F1F4F8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </nav>
        </div>
      </section>

      {modalOpen && (
        <EmployeeModal
          employee={modalEmployee}
          pods={pods}
          onClose={() => { setModalOpen(false); setModalEmployee(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
