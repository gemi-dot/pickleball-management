import React from "react";

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  loading?: boolean;
  actionColumnWidth?: string;
}

export function DataTable<T extends { id?: number | string }>({
  data,
  columns,
  onEdit,
  onDelete,
  loading,
  actionColumnWidth = "150px",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-flex h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="mt-2 text-sm text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted">No data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse">
        <thead className="bg-card-hover">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-6 py-3 text-left text-sm font-semibold text-foreground border-b border-line"
              >
                {column.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th
                className="px-6 py-3 text-left text-sm font-semibold text-foreground border-b border-line"
                style={{ width: actionColumnWidth }}
              >
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              className="border-b border-line hover:bg-card-hover transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className="px-6 py-4 text-sm text-foreground"
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : String(row[column.key] ?? "-")}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="px-3 py-1 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="px-3 py-1 text-xs font-medium rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
