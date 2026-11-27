import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Link2,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const PAGE_SIZE = 8;
const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#18334F] outline-none transition placeholder:text-[#9AA8B7] focus:border-[#168F8B] focus:ring-3 focus:ring-[#168F8B]/10";

const TABS = [
  { id: "brands", label: "Brands", icon: Building2 },
  { id: "processes", label: "Processes", icon: ClipboardList },
  { id: "links", label: "Brand-process links", icon: Link2 },
];

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
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

function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalItems <= pageSize) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-[#E1E7EF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#718096]">
        Showing <span className="font-semibold text-[#496176]">{start}–{end}</span> of{" "}
        <span className="font-semibold text-[#496176]">{totalItems}</span> records
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

function CatalogModal({ type, record, brands, processes, onClose, onSaved }) {
  const isLink = type === "link";
  const [name, setName] = useState(record?.name || "");
  const [description, setDescription] = useState(record?.description || "");
  const [brandId, setBrandId] = useState(record?.brandId || "");
  const [processId, setProcessId] = useState(record?.processId || "");
  const [operatesOnPublicHolidays, setOperatesOnPublicHolidays] = useState(
    record?.operatesOnPublicHolidays || false
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const title = isLink
    ? "Link process to brand"
    : record
      ? `Edit ${type === "brand" ? "brand" : "process"}`
      : `Add ${type === "brand" ? "brand" : "process"}`;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    try {
      setSaving(true);
      if (isLink) {
        if (!brandId || !processId) {
          setFormError("Select both a brand and a process.");
          return;
        }
        await axios.post(`${API}/brand-processes`, {
          brandId,
          processId,
          operatesOnPublicHolidays,
        });
        await onSaved("Process linked to brand successfully.");
      } else {
        if (!name.trim()) {
          setFormError(`${type === "brand" ? "Brand" : "Process"} name is required.`);
          return;
        }
        const payload = { name: name.trim(), description: description.trim() };
        if (record) {
          await axios.patch(`${API}/${type === "brand" ? "brands" : "processes"}/${record.id}`, payload);
          await onSaved(`${type === "brand" ? "Brand" : "Process"} updated successfully.`);
        } else {
          await axios.post(`${API}/${type === "brand" ? "brands" : "processes"}`, payload);
          await onSaved(`${type === "brand" ? "Brand" : "Process"} created successfully.`);
        }
      }
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          isLink
            ? "Unable to link this process to the brand."
            : `Unable to ${record ? "update" : "create"} this ${type}.`
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
        aria-labelledby="catalog-modal-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#E1E7EF] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#168F8B]">
              Catalog management
            </p>
            <h2 id="catalog-modal-title" className="mt-1 text-xl font-bold text-[#18334F]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[#718096]">
              {isLink
                ? "Connect an active brand with an active operational process."
                : "Maintain the catalog information used by roster planning."}
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

          {isLink ? (
            <>
              <label className="block text-sm font-medium text-[#344B62]">
                Brand <span className="text-red-500">*</span>
                <span className="relative block">
                  <select className={`${INPUT_CLASS} appearance-none pr-9`} value={brandId} onChange={(event) => setBrandId(event.target.value)} required>
                    <option value="">Select a brand</option>
                    {brands.filter((item) => item.isActive).map((brand) => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]" />
                </span>
              </label>
              <label className="block text-sm font-medium text-[#344B62]">
                Process <span className="text-red-500">*</span>
                <span className="relative block">
                  <select className={`${INPUT_CLASS} appearance-none pr-9`} value={processId} onChange={(event) => setProcessId(event.target.value)} required>
                    <option value="">Select a process</option>
                    {processes.filter((item) => item.isActive).map((process) => (
                      <option key={process.id} value={process.id}>{process.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]" />
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                <input
                  type="checkbox"
                  checked={operatesOnPublicHolidays}
                  onChange={(event) => setOperatesOnPublicHolidays(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#168F8B]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#18334F]">Operates on public holidays</span>
                  <span className="mt-1 block text-xs leading-5 text-[#718096]">Enable this when this brand-process combination requires coverage on public holidays.</span>
                </span>
              </label>
              <p className="text-xs text-[#718096]">Duplicate brand-process links are prevented by the backend. Weekly operating days and minimum staffing are configured separately under scheduling rules.</p>
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-[#344B62]">
                {type === "brand" ? "Brand" : "Process"} name <span className="text-red-500">*</span>
                <input
                  className={INPUT_CLASS}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={type === "brand" ? "e.g. NovaCart" : "e.g. Customer Support"}
                  maxLength={100}
                  required
                  autoFocus
                />
              </label>
              <label className="block text-sm font-medium text-[#344B62]">
                Description
                <textarea
                  className={`${INPUT_CLASS} min-h-24 resize-y`}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add a short description (optional)"
                  maxLength={500}
                />
              </label>
            </>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#E1E7EF] pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-[#D9E2EC] px-4 py-2.5 text-sm font-semibold text-[#496176] transition hover:bg-[#F1F4F8] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || (isLink && (!brands.some((item) => item.isActive) || !processes.some((item) => item.isActive)))} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#168F8B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#117875] disabled:cursor-not-allowed disabled:opacity-60">
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              {saving ? "Saving..." : isLink ? "Link process" : record ? "Save changes" : `Add ${type}`}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function BrandsProcesses() {
  const [activeTab, setActiveTab] = useState("brands");
  const [brands, setBrands] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [brandProcesses, setBrandProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [updatingId, setUpdatingId] = useState("");
  const [linkHolidayBusyId, setLinkHolidayBusyId] = useState("");
  const tableRef = useRef(null);

  const loadCatalog = useCallback(async () => {
    const [brandsResponse, processesResponse, linksResponse] = await Promise.all([
      axios.get(`${API}/brands`),
      axios.get(`${API}/processes`),
      axios.get(`${API}/brand-processes`),
    ]);
    return {
      brands: brandsResponse.data.data || [],
      processes: processesResponse.data.data || [],
      brandProcesses: linksResponse.data.data || [],
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    loadCatalog()
      .then((data) => {
        if (ignore) return;
        setBrands(data.brands);
        setProcesses(data.processes);
        setBrandProcesses(data.brandProcesses);
        setPageError("");
      })
      .catch((error) => {
        if (ignore) return;
        console.error("Unable to load brand and process catalog:", error);
        setPageError(getErrorMessage(error, "Unable to load catalog data. Check that the backend server is running."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [loadCatalog]);

  const refreshCatalog = async () => {
    setLoading(true);
    setPageError("");
    try {
      const data = await loadCatalog();
      setBrands(data.brands);
      setProcesses(data.processes);
      setBrandProcesses(data.brandProcesses);
    } catch (error) {
      console.error("Unable to refresh catalog:", error);
      setPageError(getErrorMessage(error, "Unable to refresh catalog data."));
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = async (message) => {
    setModal(null);
    setNotice(message);
    await refreshCatalog();
  };

  const toggleEntityStatus = async (entity, type) => {
    const nextActive = !entity.isActive;
    const label = type === "brand" ? "brand" : "process";
    const relatedLinks = type === "brand"
      ? (entity.processes || [])
      : (entity.brandProcesses || []);
    const activeRelatedLinks = relatedLinks.filter((link) => link.isActive);
    const cascadeMessage = !nextActive && activeRelatedLinks.length
      ? ` ${activeRelatedLinks.length} active brand-process link(s) will also be deactivated so roster generation does not continue scheduling this ${label}.`
      : "";
    const confirmed = window.confirm(
      `${nextActive ? "Activate" : "Deactivate"} ${label} "${entity.name}"?${cascadeMessage}`
    );
    if (!confirmed) return;

    try {
      setUpdatingId(entity.id);
      setPageError("");
      // The roster generator selects active BrandProcess records. When a parent
      // brand or process is deactivated, deactivate its active links as well.
      if (!nextActive && activeRelatedLinks.length) {
        await Promise.all(activeRelatedLinks.map((link) =>
          axios.patch(`${API}/brand-processes/${link.id}`, { isActive: false })
        ));
      }
      await axios.patch(`${API}/${type === "brand" ? "brands" : "processes"}/${entity.id}`, { isActive: nextActive });
      setNotice(`${label[0].toUpperCase()}${label.slice(1)} ${nextActive ? "activated" : "deactivated"} successfully.${!nextActive && activeRelatedLinks.length ? ` ${activeRelatedLinks.length} linked combination(s) were also deactivated.` : ""}`);
      await refreshCatalog();
    } catch (error) {
      setPageError(getErrorMessage(error, `Unable to update ${label} status.`));
    } finally {
      setUpdatingId("");
    }
  };

  const toggleLinkField = async (link, field, value) => {
    const label = field === "isActive" ? "link status" : "public-holiday setting";
    try {
      setLinkHolidayBusyId(`${link.id}:${field}`);
      setPageError("");
      await axios.patch(`${API}/brand-processes/${link.id}`, { [field]: value });
      setNotice(`${label[0].toUpperCase()}${label.slice(1)} updated successfully.`);
      await refreshCatalog();
    } catch (error) {
      setPageError(getErrorMessage(error, `Unable to update ${label}.`));
    } finally {
      setLinkHolidayBusyId("");
    }
  };

  const currentRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = activeTab === "brands" ? brands : activeTab === "processes" ? processes : brandProcesses;

    return source.filter((item) => {
      const activeMatch = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? item.isActive : !item.isActive);
      if (!activeMatch) return false;
      if (!query) return true;
      if (activeTab === "brands") {
        return [item.name, item.description, ...(item.processes || []).map((entry) => entry.process?.name)]
          .filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      }
      if (activeTab === "processes") {
        return [item.name, item.description, ...(item.brandProcesses || []).map((entry) => entry.brand?.name)]
          .filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      }
      return [item.brand?.name, item.process?.name].filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activeTab, brands, processes, brandProcesses, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(currentRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = currentRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const changePage = (nextPage) => {
    setCurrentPage(nextPage);
    requestAnimationFrame(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const activeBrands = brands.filter((item) => item.isActive).length;
  const activeProcesses = processes.filter((item) => item.isActive).length;
  const activeLinks = brandProcesses.filter((item) => item.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#168F8B]">Catalog administration</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#18334F]">Brands &amp; processes</h1>
          <p className="mt-1 text-sm text-[#718096]">Manage client brands, operational processes and the services each brand requires.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refreshCatalog} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9E2EC] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#496176] shadow-sm transition hover:bg-[#F7F9FC] disabled:opacity-60">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setModal({ type: activeTab === "links" ? "link" : activeTab === "brands" ? "brand" : "process", record: null })}
            disabled={activeTab === "links" && (!activeBrands || !activeProcesses)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#168F8B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#117875] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={17} /> {activeTab === "links" ? "Link process" : `Add ${activeTab === "brands" ? "brand" : "process"}`}
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
          <AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{pageError}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-sm font-medium text-[#718096]">Active brands</span><span className="rounded-lg bg-[#EDF3F8] p-2.5 text-[#28577C]"><Building2 size={19} /></span></div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : activeBrands}</p>
          <p className="mt-1 text-xs text-[#8492A6]">of {brands.length} registered brands</p>
        </div>
        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-sm font-medium text-[#718096]">Active processes</span><span className="rounded-lg bg-[#EAF6F3] p-2.5 text-[#168F8B]"><ClipboardList size={19} /></span></div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : activeProcesses}</p>
          <p className="mt-1 text-xs text-[#8492A6]">of {processes.length} registered processes</p>
        </div>
        <div className="rounded-xl border border-[#E1E7EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-sm font-medium text-[#718096]">Active brand-process links</span><span className="rounded-lg bg-[#EDF3F8] p-2.5 text-[#28577C]"><Link2 size={19} /></span></div>
          <p className="mt-3 text-3xl font-bold text-[#18334F]">{loading ? "—" : activeLinks}</p>
          <p className="mt-1 text-xs text-[#8492A6]">of {brandProcesses.length} configured combinations</p>
        </div>
      </div>

      <section ref={tableRef} className="overflow-hidden rounded-xl border border-[#E1E7EF] bg-white shadow-sm scroll-mt-24">
        <div className="border-b border-[#E1E7EF] px-5 pt-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Catalog sections">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" role="tab" aria-selected={active} onClick={() => { setActiveTab(tab.id); setSearch(""); setStatusFilter("ALL"); setCurrentPage(1); }} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${active ? "border-[#168F8B] text-[#168F8B]" : "border-transparent text-[#718096] hover:text-[#28577C]"}`}>
                  <Icon size={16} /> {tab.label}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-[#EAF6F3] text-[#176B67]" : "bg-[#F1F4F8] text-[#718096]"}`}>
                    {tab.id === "brands" ? brands.length : tab.id === "processes" ? processes.length : brandProcesses.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-b border-[#E1E7EF] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-[#18334F]">{activeTab === "brands" ? "All brands" : activeTab === "processes" ? "All processes" : "Brand-process combinations"}</h2>
            <p className="mt-1 text-sm text-[#718096]">{loading ? "Loading catalog records..." : `Showing ${paginatedRows.length} of ${currentRows.length} records`}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[440px]">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8492A6]" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder={activeTab === "links" ? "Search brand or process..." : `Search ${activeTab}...`} aria-label="Search catalog" className="w-full rounded-lg border border-[#D9E2EC] bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-[#9AA8B7] focus:border-[#168F8B] focus:ring-3 focus:ring-[#168F8B]/10" />
            </label>
            <label className="relative block">
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }} aria-label="Filter by status" className="w-full appearance-none rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 pr-9 text-sm text-[#496176] outline-none focus:border-[#168F8B]">
                <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]" />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="bg-[#F7F9FC] text-xs uppercase tracking-wide text-[#718096]">
                {activeTab === "brands" ? (
                  <><th className="px-5 py-3.5 font-semibold">Brand</th><th className="px-5 py-3.5 font-semibold">Description</th><th className="px-5 py-3.5 font-semibold">Processes</th><th className="px-5 py-3.5 font-semibold">Status</th><th className="px-5 py-3.5 text-right font-semibold">Actions</th></>
                ) : activeTab === "processes" ? (
                  <><th className="px-5 py-3.5 font-semibold">Process</th><th className="px-5 py-3.5 font-semibold">Description</th><th className="px-5 py-3.5 font-semibold">Linked brands</th><th className="px-5 py-3.5 font-semibold">Status</th><th className="px-5 py-3.5 text-right font-semibold">Actions</th></>
                ) : (
                  <><th className="px-5 py-3.5 font-semibold">Brand</th><th className="px-5 py-3.5 font-semibold">Process</th><th className="px-5 py-3.5 font-semibold">Assignments</th><th className="px-5 py-3.5 font-semibold">Public holidays</th><th className="px-5 py-3.5 font-semibold">Status</th></>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5]">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-[#8492A6]"><span className="inline-flex items-center gap-2"><LoaderCircle size={17} className="animate-spin" /> Loading catalog...</span></td></tr>
              ) : paginatedRows.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-14 text-center"><ClipboardList size={28} className="mx-auto text-[#A8B5C3]" /><p className="mt-2 text-sm font-semibold text-[#496176]">No records found</p><p className="mt-1 text-xs text-[#8492A6]">Try changing your search or filters.</p></td></tr>
              ) : activeTab === "brands" ? paginatedRows.map((brand) => (
                <tr key={brand.id} className="transition hover:bg-[#FAFBFD]">
                  <td className="px-5 py-4"><p className="text-sm font-semibold text-[#18334F]">{brand.name}</p><p className="mt-1 text-xs text-[#8492A6]">Brand catalog</p></td>
                  <td className="max-w-xs px-5 py-4 text-sm text-[#496176]">{brand.description || "—"}</td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{(brand.processes || []).length ? brand.processes.map((entry) => <span key={entry.id} className="rounded-md bg-[#EDF3F8] px-2 py-1 text-xs font-medium text-[#28577C]">{entry.process?.name || "Process"}</span>) : <span className="text-sm text-[#8492A6]">No processes linked</span>}</div></td>
                  <td className="px-5 py-4"><StatusBadge active={brand.isActive} /></td>
                  <td className="px-5 py-4"><div className="flex items-center justify-end gap-1.5"><button type="button" onClick={() => setModal({ type: "brand", record: brand })} title="Edit brand" aria-label={`Edit ${brand.name}`} className="rounded-lg border border-[#D9E2EC] p-2 text-[#496176] transition hover:border-[#B8C9D8] hover:bg-[#EDF3F8] hover:text-[#28577C]"><Pencil size={15} /></button><button type="button" disabled={updatingId === brand.id} onClick={() => toggleEntityStatus(brand, "brand")} title={brand.isActive ? "Deactivate brand" : "Activate brand"} className="rounded-lg border border-[#D9E2EC] p-2 text-[#496176] transition hover:bg-[#F1F4F8] disabled:opacity-50">{updatingId === brand.id ? <LoaderCircle size={15} className="animate-spin" /> : brand.isActive ? <ToggleRight size={17} className="text-[#168F8B]" /> : <ToggleLeft size={17} />}</button></div></td>
                </tr>
              )) : activeTab === "processes" ? paginatedRows.map((process) => (
                <tr key={process.id} className="transition hover:bg-[#FAFBFD]">
                  <td className="px-5 py-4"><p className="text-sm font-semibold text-[#18334F]">{process.name}</p><p className="mt-1 text-xs text-[#8492A6]">Operational process</p></td>
                  <td className="max-w-xs px-5 py-4 text-sm text-[#496176]">{process.description || "—"}</td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{(process.brandProcesses || []).length ? process.brandProcesses.map((entry) => <span key={entry.id} className="rounded-md bg-[#EDF3F8] px-2 py-1 text-xs font-medium text-[#28577C]">{entry.brand?.name || "Brand"}</span>) : <span className="text-sm text-[#8492A6]">Not linked</span>}</div></td>
                  <td className="px-5 py-4"><StatusBadge active={process.isActive} /></td>
                  <td className="px-5 py-4"><div className="flex items-center justify-end gap-1.5"><button type="button" onClick={() => setModal({ type: "process", record: process })} title="Edit process" aria-label={`Edit ${process.name}`} className="rounded-lg border border-[#D9E2EC] p-2 text-[#496176] transition hover:border-[#B8C9D8] hover:bg-[#EDF3F8] hover:text-[#28577C]"><Pencil size={15} /></button><button type="button" disabled={updatingId === process.id} onClick={() => toggleEntityStatus(process, "process")} title={process.isActive ? "Deactivate process" : "Activate process"} className="rounded-lg border border-[#D9E2EC] p-2 text-[#496176] transition hover:bg-[#F1F4F8] disabled:opacity-50">{updatingId === process.id ? <LoaderCircle size={15} className="animate-spin" /> : process.isActive ? <ToggleRight size={17} className="text-[#168F8B]" /> : <ToggleLeft size={17} />}</button></div></td>
                </tr>
              )) : paginatedRows.map((link) => (
                <tr key={link.id} className="transition hover:bg-[#FAFBFD]">
                  <td className="px-5 py-4 text-sm font-semibold text-[#18334F]">{link.brand?.name || "—"}</td>
                  <td className="px-5 py-4 text-sm text-[#496176]">{link.process?.name || "—"}</td>
                  <td className="px-5 py-4 text-sm text-[#496176]">{link._count?.assignments ?? 0}</td>
                  <td className="px-5 py-4"><label className="inline-flex items-center gap-2 text-xs font-medium text-[#496176]"><input type="checkbox" checked={Boolean(link.operatesOnPublicHolidays)} disabled={linkHolidayBusyId === `${link.id}:operatesOnPublicHolidays`} onChange={(event) => toggleLinkField(link, "operatesOnPublicHolidays", event.target.checked)} className="h-4 w-4 accent-[#168F8B]" />{link.operatesOnPublicHolidays ? "Operates" : "Off"}</label></td>
                  <td className="px-5 py-4"><div className="flex items-center gap-2"><StatusBadge active={link.isActive} /><button type="button" disabled={linkHolidayBusyId === `${link.id}:isActive`} onClick={() => toggleLinkField(link, "isActive", !link.isActive)} className="rounded-lg border border-[#D9E2EC] p-1.5 text-[#496176] transition hover:bg-[#F1F4F8] disabled:opacity-50" title={link.isActive ? "Deactivate link" : "Activate link"}>{linkHolidayBusyId === `${link.id}:isActive` ? <LoaderCircle size={15} className="animate-spin" /> : link.isActive ? <ToggleRight size={17} className="text-[#168F8B]" /> : <ToggleLeft size={17} />}</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} totalPages={totalPages} totalItems={currentRows.length} pageSize={PAGE_SIZE} onPageChange={changePage} />
      </section>

      {activeTab === "links" && (
        <div className="rounded-xl border border-[#D8E5EF] bg-[#F3F7FA] px-4 py-3 text-xs leading-5 text-[#496176]">
          <strong className="text-[#18334F]">Scheduling note:</strong> this catalog page manages whether a process is linked to a brand and whether it operates on public holidays. Configure weekly operating days and minimum daily staffing in the Scheduling Rules module.
        </div>
      )}

      {modal && (
        <CatalogModal
          key={`${modal.type}-${modal.record?.id || "new"}`}
          type={modal.type}
          record={modal.record}
          brands={brands}
          processes={processes}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
