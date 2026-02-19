import { FolderOpen } from "lucide-react";

type Category = {
  id: number;
  name: string;
  description: string;
};

type QAManagerCategoriesTableProps = {
  categories: Category[];
};

export default function QAManagerCategoriesTable({ categories }: QAManagerCategoriesTableProps) {
  return (
    <div className="qa-category-table overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="qa-category-table-head bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="qa-category-table-body divide-y divide-slate-100 bg-white">
          {categories.length === 0 ? (
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
            categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3 text-sm text-slate-700">{category.id}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{category.name}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{category.description}</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  <button type="button" className="font-medium text-slate-700 hover:text-slate-900">
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
