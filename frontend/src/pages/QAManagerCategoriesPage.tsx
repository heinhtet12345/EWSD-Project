import React, { useMemo, useState } from "react";
import { BreadCrumb } from "primereact/breadcrumb";
import type { MenuItem } from "primereact/menuitem";
import { useNavigate } from "react-router-dom";
import { ChevronRight, House } from "lucide-react";

import ViewCategoryTable from "../components/tables/ViewCategoryTable";
import { AddCategoriesFrom } from "../forms/AddCategoriesForm";

type Category = {
  id: number;
  name: string;
  description: string;
};

const categories: Category[] = [];

function QAManagerCategoriesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

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
  }, [searchTerm]);

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

      {!isAddingCategory && (
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
      )}

      {isAddingCategory ? (
        <AddCategoriesFrom
          onClose={() => setIsAddingCategory(false)}
          onCancel={() => setIsAddingCategory(false)}
          onSubmit={() => setIsAddingCategory(false)}
        />
      ) : (
        <ViewCategoryTable categories={filteredCategories} />
      )}
    </section>
  );
}

export default QAManagerCategoriesPage;
