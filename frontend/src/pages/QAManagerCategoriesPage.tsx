import React, { useEffect, useMemo, useState } from "react";
import { BreadCrumb } from "primereact/breadcrumb";
import type { MenuItem } from "primereact/menuitem";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, House } from "lucide-react";
import axios from "axios";

import ViewCategoryTable from "../components/tables/ViewCategoryTable";
import Modal from "../components/common/Modal";
import { AddCategoriesFrom } from "../forms/AddCategoriesForm";
import { EditCategoryForm } from "../forms/EditCategoryForm";

type Category = {
  id: number;
  name: string;
  description: string;
};

type CategoryApiItem = {
  id: number;
  category_id?: number;
  category_name?: string;
  category_desc?: string;
  name?: string;
  description?: string;
};

const CATEGORY_CREATE_PATH = "/api/categories/add/";
const CATEGORY_VIEW_PATH = "/api/categories/view/";
const CATEGORY_UPDATE_PATH = "/api/categories/update";
const CATEGORY_DELETE_PATH = "/api/categories/delete";

const getAuthConfig = () => {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as { token?: string };
    if (!parsed?.token) {
      return undefined;
    }

    return {
      headers: {
        Authorization: `Bearer ${parsed.token}`,
      },
    };
  } catch {
    return undefined;
  }
};

const sortCategoriesById = (items: Category[]) =>
  [...items].sort((a, b) => a.id - b.id);

function QAManagerCategoriesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardPath = location.pathname.startsWith("/admin") ? "/admin" : "/qa_manager";
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) => category.name.toLowerCase().includes(normalizedSearch));
  }, [categories, searchTerm]);

  const effectivePageSize = pageSize === -1 ? Math.max(filteredCategories.length, 1) : pageSize;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredCategories.length / pageSize));
  const skipSize = 5;
  const nearbyPages = Array.from({ length: 4 }, (_, index) => currentPage - 4 + index).filter(
    (page) => page >= 1 && page < currentPage,
  );

  const paginatedCategories = useMemo(() => {
    if (pageSize === -1) {
      return filteredCategories;
    }

    const startIndex = (currentPage - 1) * pageSize;
    return filteredCategories.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredCategories, pageSize]);

  const startIndex = filteredCategories.length === 0 ? 0 : (currentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, filteredCategories.length);

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await axios.get(CATEGORY_VIEW_PATH, getAuthConfig());
        if (!isMounted) {
          return;
        }
        const data = Array.isArray(response.data) ? response.data : response.data?.results;
        if (Array.isArray(data)) {
          const normalized = sortCategoriesById(
            data.map((item: CategoryApiItem) => ({
              id: item.id ?? item.category_id ?? Date.now(),
              name: item.category_name ?? item.name ?? "",
              description: item.category_desc ?? item.description ?? "",
            })),
          );
          setCategories(normalized);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        if (axios.isAxiosError(error)) {
          setLoadError(error.response?.statusText || "Unable to load categories.");
        } else {
          setLoadError("Unable to load categories.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    if (!loadError) return;
    const timeoutId = window.setTimeout(() => setLoadError(""), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [loadError]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeoutId = window.setTimeout(() => setActionMessage(""), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [actionMessage]);

  const handleAddCategory = async (category: { name: string; description: string }) => {
    const trimmedName = category.name.trim();
    const trimmedDescription = category.description.trim();

    if (!trimmedName || !trimmedDescription) {
      setFormError("Name and description are required.");
      return;
    }

    setFormError("");
    setIsSaving(true);

    try {
      const response = await axios.post(
        CATEGORY_CREATE_PATH,
        {
          name: trimmedName,
          description: trimmedDescription,
        },
        getAuthConfig(),
      );

      const responseId = response.data?.id ?? response.data?.category_id ?? Date.now();
      setCategories((prev) =>
        sortCategoriesById([
          ...prev,
          { id: responseId, name: trimmedName, description: trimmedDescription },
        ]),
      );
      setIsAddingCategory(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string })?.message ||
          error.response?.statusText ||
          "Unable to add category.";
        setFormError(message);
      } else {
        setFormError("Unable to add category.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCategory = async (category: { name: string; description: string }) => {
    if (!editingCategory) return;

    const trimmedName = category.name.trim();
    const trimmedDescription = category.description.trim();

    if (!trimmedName || !trimmedDescription) {
      setFormError("Name and description are required.");
      return;
    }

    setFormError("");
    setIsSaving(true);

    try {
      await axios.patch(
        `${CATEGORY_UPDATE_PATH}/${editingCategory.id}/`,
        {
          name: trimmedName,
          description: trimmedDescription,
        },
        getAuthConfig(),
      );

      setCategories((prev) =>
        sortCategoriesById(
          prev.map((item) =>
            item.id === editingCategory.id
              ? { ...item, name: trimmedName, description: trimmedDescription }
              : item,
          ),
        ),
      );
      setEditingCategory(null);
      setActionMessage("Category updated successfully.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string })?.message ||
          error.response?.statusText ||
          "Unable to update category.";
        setFormError(message);
      } else {
        setFormError("Unable to update category.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const category = categories.find((item) => item.id === id);
    const confirmed = window.confirm(
      `Delete category "${category?.name || `#${id}`}"?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setLoadError("");
      setActionMessage("");
      await axios.delete(`${CATEGORY_DELETE_PATH}/${id}/`, getAuthConfig());
      setCategories((prev) => prev.filter((category) => category.id !== id));
      setActionMessage("Category deleted successfully.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setLoadError(
          (error.response?.data as { message?: string })?.message ||
            error.response?.statusText ||
            "Unable to delete category.",
        );
      } else {
        setLoadError("Unable to delete category.");
      }
    }
  };


  return (
    <section className="space-y-2">
      

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full items-center sm:w-auto">
            <input
              type="search"
              placeholder="Search categories"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:w-64"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddingCategory(true)}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Add Category
          </button>
        </div>

        {loadError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}
        {actionMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddingCategory || Boolean(editingCategory)}
        onClose={() => {
          setIsAddingCategory(false);
          setEditingCategory(null);
        }}
        maxWidthClassName="max-w-xl"
      >
        {(isAddingCategory || editingCategory) && (
          <div className="space-y-3">
            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formError}
              </div>
            )}
            {editingCategory && (
              <EditCategoryForm
                initialCategory={{
                  name: editingCategory.name,
                  description: editingCategory.description,
                }}
                onClose={() => {
                  setIsAddingCategory(false);
                  setEditingCategory(null);
                }}
                onCancel={() => {
                  setIsAddingCategory(false);
                  setEditingCategory(null);
                }}
                onSubmit={handleEditCategory}
              />
            )}
            {isAddingCategory && !editingCategory && (
              <AddCategoriesFrom
                onClose={() => {
                  setIsAddingCategory(false);
                  setEditingCategory(null);
                }}
                onCancel={() => {
                  setIsAddingCategory(false);
                  setEditingCategory(null);
                }}
                onSubmit={handleAddCategory}
              />
            )}
            {isSaving && (
              <p className="text-sm text-slate-500">Saving category...</p>
            )}
          </div>
        )}
      </Modal>

      <div className="w-full max-w-7xl space-y-2">
        {isLoading && <p className="text-sm text-slate-500 text-center">Loading categories...</p>}
        {!isLoading && (
          <ViewCategoryTable
            categories={paginatedCategories}
            onDelete={handleDeleteCategory}
            onEdit={(category) => {
              setFormError("");
              setEditingCategory(category);
              setIsAddingCategory(false);
            }}
          />
        )}
      </div>

      {!isLoading && filteredCategories.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:items-center sm:text-left">
          <p className="text-sm text-slate-600">
            Showing {startIndex + 1} to {endIndex} of {filteredCategories.length} categories
          </p>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={-1}>All</option>
            </select>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - skipSize))}
              disabled={currentPage === 1}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Skip back ${skipSize} pages`}
              title={`Skip back ${skipSize} pages`}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {nearbyPages.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {page}
              </button>
            ))}
            <span className="text-sm text-slate-600">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + skipSize))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Skip forward ${skipSize} pages`}
              title={`Skip forward ${skipSize} pages`}
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default QAManagerCategoriesPage;
