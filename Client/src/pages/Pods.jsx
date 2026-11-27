import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  UserRound,
  X,
} from "lucide-react";

const API = import.meta.env.SERVER_URL || "http://localhost:5000/api";
const PAGE_SIZE = 8;
const inputClass =
  "mt-1.5 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#18334F] outline-none transition placeholder:text-[#9AA8B7] focus:border-[#168F8B] focus:ring-3 focus:ring-[#168F8B]/10";

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function PodModal({ pod, employees, onClose, onSaved }) {
  const [name, setName] = useState(pod?.name || "");
  const [leadId, setLeadId] = useState(pod?.lead?.id || "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const podEmployees = useMemo(
    () => pod
      ? employees.filter((employee) => employee.podId === pod.id)
      : [],
    [employees, pod]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Pod name is required.");
      return;
    }

    try {
      setSaving(true);
      if (pod) {
        await axios.patch(`${API}/pods/${pod.id}`, {
          name: trimmedName,
          leadId: leadId || null,
        });
        await onSaved("Pod details updated successfully.");
      } else {
        await axios.post(`${API}/pods`, { name: trimmedName });
        await onSaved("Pod created successfully.");
      }
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          pod ? "Unable to update this pod." : "Unable to create this pod."
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
        aria-labelledby="pod-modal-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#E1E7EF] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#168F8B]">
              Team structure
            </p>
            <h2 id="pod-modal-title" className="mt-1 text-xl font-bold text-[#18334F]">
              {pod ? "Edit operational pod" : "Create operational pod"}
            </h2>
            <p className="mt-1 text-sm text-[#718096]">
              {pod
                ? "Update the pod name and choose a lead from its assigned employees."
                : "Create a pod before assigning employees to it."}
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

          <label className="block text-sm font-medium text-[#344B62]">
            Pod name <span className="text-red-500">*</span>
            <input
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Customer Support Pod"
              maxLength={80}
              required
              autoFocus
            />
          </label>

          {pod && (
            <label className="block text-sm font-medium text-[#344B62]">
              Pod lead
              <span className="relative block">
                <select
                  className={`${inputClass} appearance-none pr-9`}
                  value={leadId}
                  onChange={(event) => setLeadId(event.target.value)}
                >
                  <option value="">No pod lead assigned</option>
                  {podEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} ({employee.employeeCode})
                      {employee.status === "INACTIVE" ? " — Inactive" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]"
                />
              </span>
              <span className="mt-1.5 block text-xs font-normal text-[#8492A6]">
                Only employees currently assigned to this pod are available as pod leads.
              </span>
              {podEmployees.length === 0 && (
                <span className="mt-2 block rounded-lg bg-[#F7F9FC] px-3 py-2 text-xs font-normal text-[#718096]">
                  Assign an employee to this pod from Employee Management before selecting a lead.
                </span>
              )}
            </label>
          )}

          {!pod && (
            <div className="rounded-lg border border-[#D8E5EF] bg-[#F3F7FA] px-3 py-3 text-xs leading-5 text-[#496176]">
              After creating the pod, assign employees to it from Employee Management. You can then edit this pod to set its lead.
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
              disabled={saving || !name.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#168F8B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#117875] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              {saving ? "Saving..." : pod ? "Save changes" : "Create pod"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Pods() {
  const [pods, setPods] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalPod, setModalPod] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const tableRef = useRef(null);

  const loadPods = useCallback(async () => {
    const [podsResponse, employeesResponse] = await Promise.all([
      axios.get(`${API}/pods`),
      axios.get(`${API}/employees`),
    ]);

    return {
      pods: podsResponse.data.data || [],
      employees: employeesResponse.data.data || [],
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    loadPods()
      .then(({ pods: nextPods, employees: nextEmployees }) => {
        if (ignore) return;
        setPods(nextPods);
        setEmployees(nextEmployees);
        setPageError("");
      })
      .catch((error) => {
        if (ignore) return;
        console.error("Unable to load pod management data:", error);
        setPageError(getErrorMessage(error, "Unable to load pods. Check that the backend server is running."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [loadPods]);

  const refreshPods = async () => {
    setLoading(true);
    setPageError("");
    try {
      const { pods: nextPods, employees: nextEmployees } = await loadPods();
      setPods(nextPods);
      setEmployees(nextEmployees);
    } catch (error) {
      console.error("Unable to refresh pod data:", error);
      setPageError(getErrorMessage(error, "Unable to refresh pods."));
    } finally {
      setLoading(false);
    }
  };

  const filteredPods = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pods;

    return pods.filter((pod) => {
      const leadName = pod.lead
        ? `${pod.lead.firstName} ${pod.lead.lastName} ${pod.lead.employeeCode}`
        : "";
      return `${pod.name} ${leadName}`.toLowerCase().includes(query);
    });
  }, [pods, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPods.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const firstIndex = filteredPods.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE;
  const visiblePods = filteredPods.slice(firstIndex, firstIndex + PAGE_SIZE);
  const firstVisible = filteredPods.length === 0 ? 0 : firstIndex + 1;
  const lastVisible = Math.min(firstIndex + PAGE_SIZE, filteredPods.length);
  const totalMembers = pods.reduce((total, pod) => total + (pod._count?.employees || 0), 0);
  const podsWithLead = pods.filter((pod) => pod.leadId || pod.lead?.id).length;
  const podsWithoutLead = pods.length - podsWithLead;

  const pageNumbers = useMemo(() => {
    const pages = [];
    for (let page = 1; page <= totalPages; page += 1) {
      if (page === 1 || page === totalPages || Math.abs(page - safePage) <= 1) {
        pages.push(page);
      } else if (pages[pages.length - 1] !== "…") {
        pages.push("…");
      }
    }
    return pages;
  }, [safePage, totalPages]);

  const handlePageChange = (nextPage) => {
    setCurrentPage(nextPage);
    requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleSaved = async (message) => {
    setModalOpen(false);
    setModalPod(null);
    setNotice(message);
    setLoading(true);
    try {
      const { pods: nextPods, employees: nextEmployees } = await loadPods();
      setPods(nextPods);
      setEmployees(nextEmployees);
      setCurrentPage(1);
      setPageError("");
    } catch (error) {
      setPageError(getErrorMessage(error, "Saved, but the pod list could not be refreshed."));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalPod(null);
    setModalOpen(true);
  };

  const openEditModal = (pod) => {
    setModalPod(pod);
    setModalOpen(true);
  };

  const handleDelete = async (pod) => {
    const memberCount = pod._count?.employees || 0;
    if (memberCount > 0) return;

    const confirmed = window.confirm(`Delete ${pod.name}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(pod.id);
      setPageError("");
      await axios.delete(`${API}/pods/${pod.id}`);
      setNotice(`${pod.name} was deleted successfully.`);
      await refreshPods();
    } catch (error) {
      setPageError(getErrorMessage(error, "Unable to delete this pod."));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#168F8B]">
            Workforce structure
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#18334F]">
            Pod management
          </h1>
          <p className="mt-1 text-sm text-[#718096]">
            Organize employees into operational pods and manage pod leadership.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshPods}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9E2EC] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#496176] shadow-sm transition hover:bg-[#F7F9FC] disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#168F8B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#117875]"
          >
            <Plus size={17} />
            Add pod
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#B9E1D8] bg-[#EAF6F3] px-4 py-3 text-sm text-[#176B67]">
          <span className="flex items-center gap-2"><CheckCircle2 size={17} /> {notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification" className="rounded p-1 hover:bg-[#D7EEE8]"><X size={15} /></button>
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
            <span className="text-sm font-medium text-[#718096]">Total pods</span>
            <span className="rounded-lg bg-[#EDF3F8] p-2.5 text-[#28577C]"><Layers size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : pods.length}</p>
          <p className="mt-1 text-xs text-[#8492A6]">Operational groups</p>
        </div>
        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#718096]">Employees in pods</span>
            <span className="rounded-lg bg-[#EAF6F3] p-2.5 text-[#168F8B]"><Users size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : totalMembers}</p>
          <p className="mt-1 text-xs text-[#8492A6]">Total pod memberships</p>
        </div>
        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#718096]">Pods with a lead</span>
            <span className="rounded-lg bg-[#EDF3F8] p-2.5 text-[#28577C]"><UserRound size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : podsWithLead}</p>
          <p className="mt-1 text-xs text-[#8492A6]">{loading ? "" : `${podsWithoutLead} pod${podsWithoutLead === 1 ? "" : "s"} without a lead`}</p>
        </div>
      </div>

      <section ref={tableRef} className="scroll-mt-24 overflow-hidden rounded-xl border border-[#E1E7EF] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#E1E7EF] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-[#18334F]">All operational pods</h2>
            <p className="mt-1 text-sm text-[#718096]">
              {loading ? "Loading pod records..." : `Showing ${filteredPods.length} of ${pods.length} pods`}
            </p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8492A6]" />
            <input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search pods or pod leads..."
              aria-label="Search pods or pod leads"
              className="w-full rounded-lg border border-[#D9E2EC] bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-[#9AA8B7] focus:border-[#168F8B] focus:ring-3 focus:ring-[#168F8B]/10"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-[#F7F9FC] text-xs uppercase tracking-wide text-[#718096]">
                <th className="px-5 py-3.5 font-semibold">Operational pod</th>
                <th className="px-5 py-3.5 font-semibold">Pod lead</th>
                <th className="px-5 py-3.5 font-semibold">Employees</th>
                <th className="px-5 py-3.5 font-semibold">Leadership status</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5]">
              {loading ? (
                <tr><td colSpan="5" className="px-5 py-14 text-center text-sm text-[#8492A6]"><span className="inline-flex items-center gap-2"><LoaderCircle size={17} className="animate-spin" /> Loading pods...</span></td></tr>
              ) : filteredPods.length === 0 ? (
                <tr><td colSpan="5" className="px-5 py-14 text-center">
                  <Layers size={28} className="mx-auto text-[#A8B5C3]" />
                  <p className="mt-2 text-sm font-semibold text-[#496176]">No pods found</p>
                  <p className="mt-1 text-xs text-[#8492A6]">Try another search or create a new pod.</p>
                </td></tr>
              ) : visiblePods.map((pod) => {
                const memberCount = pod._count?.employees || 0;
                const leadName = pod.lead ? `${pod.lead.firstName} ${pod.lead.lastName}` : "Not assigned";
                return (
                  <tr key={pod.id} className="transition hover:bg-[#FAFBFD]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF3F8] text-[#28577C]"><Layers size={18} /></div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#18334F]">{pod.name}</p>
                          <p className="mt-0.5 text-xs text-[#8492A6]">Operational team</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {pod.lead ? (
                        <div>
                          <p className="text-sm font-semibold text-[#344B62]">{leadName}</p>
                          <p className="mt-0.5 text-xs text-[#8492A6]">{pod.lead.employeeCode}</p>
                        </div>
                      ) : <span className="text-sm text-[#8492A6]">Not assigned</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDF3F8] px-2.5 py-1 text-xs font-semibold text-[#28577C]"><Users size={13} /> {memberCount}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${pod.lead ? "bg-[#EAF6F3] text-[#176B67]" : "bg-[#FFF7E8] text-[#A16207]"}`}>
                        <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${pod.lead ? "bg-[#168F8B]" : "bg-[#D97706]"}`} />
                        {pod.lead ? "Lead assigned" : "Lead needed"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => openEditModal(pod)} title="Edit pod" aria-label={`Edit ${pod.name}`} className="rounded-lg border border-[#D9E2EC] p-2 text-[#496176] transition hover:border-[#B8C9D8] hover:bg-[#EDF3F8] hover:text-[#28577C]"><Pencil size={15} /></button>
                        <button type="button" onClick={() => handleDelete(pod)} disabled={memberCount > 0 || deletingId === pod.id} title={memberCount > 0 ? "Move employees before deleting this pod" : "Delete pod"} aria-label={`Delete ${pod.name}`} className="rounded-lg border border-[#F2D7D7] p-2 text-[#B45353] transition hover:bg-[#FFF1F1] disabled:cursor-not-allowed disabled:opacity-35">
                          {deletingId === pod.id ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E1E7EF] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#718096]" aria-live="polite">
            Showing <span className="font-semibold text-[#18334F]">{firstVisible}-{lastVisible}</span> of <span className="font-semibold text-[#18334F]">{filteredPods.length}</span> pods
          </p>
          <nav className="flex flex-wrap items-center justify-end gap-1.5" aria-label="Pod table pagination">
            <button type="button" onClick={() => handlePageChange(Math.max(1, safePage - 1))} disabled={safePage === 1 || loading} className="inline-flex items-center gap-1 rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm font-medium text-[#496176] transition hover:bg-[#F1F4F8] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /> Previous</button>
            {pageNumbers.map((page, index) => typeof page === "number" ? (
              <button key={page} type="button" onClick={() => handlePageChange(page)} aria-current={safePage === page ? "page" : undefined} aria-label={`Go to page ${page}`} className={`min-w-9 rounded-lg border px-3 py-2 text-sm font-semibold transition ${safePage === page ? "border-[#28577C] bg-[#28577C] text-white shadow-sm" : "border-[#D9E2EC] bg-white text-[#496176] hover:bg-[#EDF3F8]"}`}>{page}</button>
            ) : <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-[#8492A6]" aria-hidden="true">…</span>)}
            <button type="button" onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages || loading || filteredPods.length === 0} className="inline-flex items-center gap-1 rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm font-medium text-[#496176] transition hover:bg-[#F1F4F8] disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={16} /></button>
          </nav>
        </div>
      </section>

      {modalOpen && (
        <PodModal
          pod={modalPod}
          employees={employees}
          onClose={() => { setModalOpen(false); setModalPod(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
