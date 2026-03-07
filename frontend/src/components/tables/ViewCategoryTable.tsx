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
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="qa-category-table-head bg-slate-50">
          <tr>
            <th className="w-16 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              ID
            </th>
            <th className="w-64 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Description
            </th>
            <th className="w-24 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="qa-category-table-body divide-y divide-slate-100 bg-white">
          {currentCategories.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10">
                <div className="qa-category-empty-state flex flex-col items-center justify-center gap-1 text-center opacity-50">
                  <FolderOpen className="h-8 w-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">No categories available</p>
                  <p className="text-sm text-slate-500">Categories will appear here once added</p>
                </div>
              </td>
            </tr>
          ) : (
            currentCategories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3 text-sm text-slate-700">{category.id}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{category.name}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{category.description}</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  <button
                    type="button"
                    onClick={() => onDelete?.(category.id)}
                    className="font-medium text-rose-600 hover:text-rose-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
