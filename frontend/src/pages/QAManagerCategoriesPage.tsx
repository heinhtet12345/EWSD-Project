import React, { useEffect, useMemo, useState } from "react";
import { BreadCrumb } from "primereact/breadcrumb";
import type { MenuItem } from "primereact/menuitem";
import { useNavigate } from "react-router-dom";
import { ChevronRight, House } from "lucide-react";
import axios from "axios";

import ViewCategoryTable from "../components/tables/ViewCategoryTable";
import Modal from "../components/common/Modal";
import { AddCategoriesFrom } from "../forms/AddCategoriesForm";

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

function QAManagerCategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const breadcrumbItems = useMemo<MenuItem[]>(() => {
    if (isAddingCategory) {
      return [
        {
          label: "Categories",
          command: () => setIsAddingCategory(false),
          template: (item: MenuItem) => (
            <button
              type="button"
              onClick={() => item.command?.({ originalEvent: undefined as never, item })}
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </button>
          ),
        },
        {
          label: "Add Category",
          template: (item: MenuItem) => (
            <span className="px-2 py-1 text-sm font-semibold text-slate-900">{item.label}</span>
          ),
        },
      ];
    }

    return [
      {
        label: "Categories",
        template: (item: MenuItem) => (
          <span className="px-2 py-1 text-sm font-semibold text-slate-900">{item.label}</span>
        ),
      },
    ];
  }, [isAddingCategory]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) => category.name.toLowerCase().includes(normalizedSearch));
  }, [categories, searchTerm]);

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
          const normalized = data.map((item: CategoryApiItem) => ({
            id: item.id ?? item.category_id ?? Date.now(),
            name: item.category_name ?? item.name ?? "",
            description: item.category_desc ?? item.description ?? "",
          }));
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
      setCategories((prev) => [
        { id: responseId, name: trimmedName, description: trimmedDescription },
        ...prev,
      ]);
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

  const handleDeleteCategory = async (id: number) => {
    try {
      await axios.delete(`${CATEGORY_DELETE_PATH}/${id}/`, getAuthConfig());
      setCategories((prev) => prev.filter((category) => category.id !== id));
      setLoadError("");
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

  const breadcrumbHome = useMemo(
    () => ({
      label: "Dashboard",
      command: () => navigate("/qa_manager"),
      template: (item: MenuItem) => (
        <button
          type="button"
          onClick={() => item.command?.({ originalEvent: undefined as never, item })}
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <House className="h-4 w-4" />
          <span>{item.label}</span>
        </button>
      ),
    }),
    [navigate],
  );

  const breadcrumbSeparator = <ChevronRight className="h-4 w-4 text-slate-400" />;

  return (
    <section className="space-y-5">
      <BreadCrumb
        model={breadcrumbItems}
        home={breadcrumbHome}
        separatorIcon={breadcrumbSeparator}
        className="qa-categories-breadcrumb rounded-xl border border-slate-200 bg-white px-1 py-1 shadow-sm"
      />

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
      </div>

      <Modal
        isOpen={isAddingCategory}
        onClose={() => setIsAddingCategory(false)}
        maxWidthClassName="max-w-3xl"
      >
        {isAddingCategory && (
          <div className="space-y-3">
            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formError}
              </div>
            )}
            <AddCategoriesFrom
              onClose={() => setIsAddingCategory(false)}
              onCancel={() => setIsAddingCategory(false)}
              onSubmit={handleAddCategory}
            />
            {isSaving && (
              <p className="text-sm text-slate-500">Saving category...</p>
            )}
          </div>
        )}
      </Modal>

      <div className="w-full max-w-7xl space-y-2">
        {isLoading && <p className="text-sm text-slate-500 text-center">Loading categories...</p>}
        {!isLoading && (
          <ViewCategoryTable categories={filteredCategories} onDelete={handleDeleteCategory} />
        )}
      </div>
    </section>
  );
}

export default QAManagerCategoriesPage;
