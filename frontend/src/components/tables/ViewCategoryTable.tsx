import { FolderOpen, Pencil, Trash2 } from "lucide-react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

type Category = {
  id: number;
  name: string;
  description: string;
};

type QAManagerCategoriesTableProps = {
  categories: Category[];
  onDelete?: (id: number) => void;
  onEdit?: (category: Category) => void;
};

export default function QAManagerCategoriesTable({ categories, onDelete, onEdit }: QAManagerCategoriesTableProps) {
  const renderActionButtons = (category: Category) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onEdit?.(category)}
        aria-label={`Edit category ${category.name}`}
        title="Edit category"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white transition hover:bg-amber-600"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onDelete?.(category.id)}
        aria-label={`Delete category ${category.name}`}
        title="Delete category"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-white transition hover:bg-slate-800"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const renderDeleteButton = (category: Category) => (
    renderActionButtons(category)
  );

  return (
    <div className="qa-category-table overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {categories.length === 0 ? (
        <div className="px-4 py-10">
          <div className="qa-category-empty-state flex flex-col items-center justify-center gap-1 text-center opacity-50">
            <FolderOpen className="h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">No categories available</p>
            <p className="text-sm text-slate-500">Categories will appear here once added</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3 p-2 sm:hidden">
            {categories.map((category) => (
              <article key={category.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category #{category.id}</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">{category.name}</h3>
                  </div>
                  <div className="shrink-0">{renderDeleteButton(category)}</div>
                </div>
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description</p>
                  <p className="mt-1 text-sm text-slate-700">{category.description || "-"}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="admin-activity-datatable hidden sm:block">
            <DataTable
              value={categories}
              dataKey="id"
              responsiveLayout="scroll"
              emptyMessage="No categories available."
              rowHover
              stripedRows
              showGridlines
              tableStyle={{ width: "100%", tableLayout: "fixed" }}
            >
              <Column field="id" header="ID" sortable style={{ width: "12%" }} />
              <Column
                field="name"
                header="Name"
                body={(category: Category) => (
                  <span className="font-medium text-slate-900">{category.name}</span>
                )}
                sortable
                style={{ width: "26%" }}
              />
              <Column
                field="description"
                header="Description"
                body={(category: Category) => (
                  <span className="block truncate text-sm text-slate-700" title={category.description || "-"}>
                    {category.description || "-"}
                  </span>
                )}
                style={{ width: "44%" }}
              />
              <Column header="Action" body={renderDeleteButton} style={{ width: "18%" }} />
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}
