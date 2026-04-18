import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { Eye, EyeOff, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";

import Modal from "../components/common/Modal";

type Role = "admin" | "qa_coordinator" | "qa_manager" | "staff";

type AnnouncementItem = {
  a_id: number;
  posted_by: number;
  posted_by_name: string;
  poster_department: string;
  poster_role: string;
  a_title: string;
  a_content: string;
  posted_at: string;
  updated_at: string;
  is_active: boolean;
};

type FormState = {
  a_title: string;
  a_content: string;
};

const emptyForm: FormState = {
  a_title: "",
  a_content: "",
};

const getRoleFromPath = (pathname: string): Role => {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment === "admin" || segment === "qa_coordinator" || segment === "qa_manager" || segment === "staff") {
    return segment;
  }
  return "staff";
};

const formatDateTime = (value: string) => new Date(value).toLocaleString();

export default function AnnouncementPage() {
  const location = useLocation();
  const role = getRoleFromPath(location.pathname);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const canCreate = role === "qa_coordinator";
  const canManageVisibility = role === "qa_manager";
  const isReadOnly = role === "admin" || role === "staff";

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await axios.get<{ results?: AnnouncementItem[] }>("/api/announcement/");
      setAnnouncements(Array.isArray(response.data?.results) ? response.data.results : []);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(payload?.message || payload?.detail || "Failed to load announcements.");
      } else {
        setError("Failed to load announcements.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeoutId = window.setTimeout(() => setSuccessMessage(""), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const filteredAnnouncements = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return announcements;
    return announcements.filter((item) =>
      [item.a_title, item.a_content, item.posted_by_name, item.poster_department]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [announcements, searchTerm]);

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setForm(emptyForm);
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (announcement: AnnouncementItem) => {
    setEditingAnnouncement(announcement);
    setForm({
      a_title: announcement.a_title,
      a_content: announcement.a_content,
    });
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAnnouncement(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      if (editingAnnouncement) {
        await axios.patch(`/api/announcement/${editingAnnouncement.a_id}/`, form);
        setSuccessMessage("Announcement updated.");
      } else {
        await axios.post("/api/announcement/", form);
        setSuccessMessage("Announcement created.");
      }
      closeModal();
      await fetchAnnouncements();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { message?: string; detail?: string; a_title?: string[]; a_content?: string[] } | undefined;
        setError(payload?.message || payload?.detail || payload?.a_title?.[0] || payload?.a_content?.[0] || "Unable to save announcement.");
      } else {
        setError("Unable to save announcement.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoftDelete = async (announcement: AnnouncementItem) => {
    const confirmed = window.confirm(`Delete announcement "${announcement.a_title}"?\n\nThis will be a soft delete and can still be shown again by a QA Manager.`);
    if (!confirmed) return;

    try {
      setError("");
      await axios.delete(`/api/announcement/${announcement.a_id}/`);
      setSuccessMessage("Announcement deleted.");
      await fetchAnnouncements();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(payload?.message || payload?.detail || "Unable to delete announcement.");
      } else {
        setError("Unable to delete announcement.");
      }
    }
  };

  const handleToggleActive = async (announcement: AnnouncementItem) => {
    try {
      setError("");
      await axios.patch(`/api/announcement/${announcement.a_id}/`, {
        is_active: !announcement.is_active,
      });
      setSuccessMessage(announcement.is_active ? "Announcement hidden." : "Announcement shown.");
      await fetchAnnouncements();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(payload?.message || payload?.detail || "Unable to update announcement visibility.");
      } else {
        setError("Unable to update announcement visibility.");
      }
    }
  };

  const pageTitle =
    role === "qa_coordinator"
      ? "Announcement"
      : role === "qa_manager"
        ? "Announcement Overview"
        : "Announcements";

  const pageDescription =
    role === "qa_coordinator"
      ? "Create, edit, and soft-delete department announcements for your staff."
      : role === "qa_manager"
        ? "Review announcements across departments and hide or show them."
        : role === "admin"
          ? "Read-only view of all announcements across the system."
          : "See the latest active announcements from your coordinator.";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
          <p className="text-sm text-slate-500">{pageDescription}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search announcements"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:w-64"
          />
          {canCreate && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              <span>New Announcement</span>
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading announcements...
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No announcements yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              {canCreate ? "Create your first department announcement from here." : "There are no announcements to show right now."}
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <article
              key={announcement.a_id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                announcement.is_active ? "border-slate-200" : "border-amber-200 bg-amber-50/50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                {/* LEFT */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {announcement.a_title}
                  </h2>

                  <p className="mt-3 whitespace-pre-wrap break-all text-sm leading-6 text-slate-600">
                    {announcement.a_content}
                  </p>
                </div>

                {/* RIGHT */}
                {!isReadOnly && (
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {/* buttons */}
                  </div>
                )}
              </div>  

                {!isReadOnly && (
                  <div className="flex flex-wrap items-center gap-2">
                    {canCreate && announcement.is_active && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(announcement)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSoftDelete(announcement)}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                    {canManageVisibility && (
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(announcement)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        {announcement.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span>{announcement.is_active ? "Hide" : "Show"}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <span>Posted by {announcement.posted_by_name}</span>
                <span>{announcement.poster_department || "No department"}</span>
                <span>Posted {formatDateTime(announcement.posted_at)}</span>
                <span>Updated {formatDateTime(announcement.updated_at)}</span>
              </div>
            </article>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        maxWidthClassName="max-w-2xl"
      >
        <div className="rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900">
              {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Share an update that your department staff can see on their dashboard and announcement page.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="a_title" className="text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                id="a_title"
                value={form.a_title}
                onChange={(event) => setForm((prev) => ({ ...prev, a_title: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Announcement title"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="a_content" className="text-sm font-medium text-slate-700">
                Content
              </label>
              <textarea
                id="a_content"
                value={form.a_content}
                onChange={(event) => setForm((prev) => ({ ...prev, a_content: event.target.value }))}
                className="min-h-[180px] w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Write your announcement here"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-60"
              >
                {isSaving ? "Saving..." : editingAnnouncement ? "Save Changes" : "Create Announcement"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </section>
  );
}
