import { FolderOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

type Category = {
  id: number;
  name: string;
  description: string;
};

type QAManagerCategoriesTableProps = {
  categories: Category[];
  onDelete?: (id: number) => void;
};

export default function QAManagerCategoriesTable({ categories, onDelete }: QAManagerCategoriesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(categories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCategories = categories.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="qa-category-table overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {currentCategories.length === 0 ? (
        <div className="px-4 py-10">
          <div className="qa-category-empty-state flex flex-col items-center justify-center gap-1 text-center opacity-50">
            <FolderOpen className="h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">No categories available</p>
            <p className="text-sm text-slate-500">Categories will appear here once added</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3 p-3 sm:hidden">
            {currentCategories.map((category) => (
              <article key={category.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category #{category.id}</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">{category.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete?.(category.id)}
                    className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description</p>
                  <p className="mt-1 text-sm text-slate-700">{category.description || "-"}</p>
                </div>
              </article>
            ))}
          </div>

          <table className="hidden w-full table-fixed divide-y divide-slate-200 sm:table">
        <thead className="qa-category-table-head bg-slate-50">
          <tr>
            <th className="hidden w-[12%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:table-cell sm:text-xs">
              ID
            </th>
            <th className="w-[48%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:w-[24%] sm:text-xs">
              Name
            </th>
            <th className="hidden w-[28%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 md:table-cell sm:text-xs">
              Description
            </th>
            <th className="w-[52%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:w-[16%] sm:text-xs">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="qa-category-table-body divide-y divide-slate-100 bg-white">
          {currentCategories.map((category) => (
            <tr key={category.id}>
              <td className="hidden px-4 py-3 text-xs text-slate-700 sm:table-cell sm:text-sm">{category.id}</td>
              <td className="px-4 py-3 text-xs text-slate-700 sm:text-sm">
                <div className="truncate">{category.name}</div>
              </td>
              <td className="hidden px-4 py-3 text-xs text-slate-700 md:table-cell sm:text-sm">
                <div className="truncate">{category.description}</div>
              </td>
              <td className="px-4 py-3 text-xs text-slate-700 sm:text-sm">
                <button
                  type="button"
                  onClick={() => onDelete?.(category.id)}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700 sm:text-xs"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                <span className="font-medium">{Math.min(endIndex, categories.length)}</span> of{" "}
                <span className="font-medium">{categories.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                      page === currentPage
                        ? "z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        : "text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
