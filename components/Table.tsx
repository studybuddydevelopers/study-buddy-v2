"use client";

interface TableColumn {
  key: string;
  label: string;
}

interface TableRow {
  [key: string]: React.ReactNode;
}

interface TableProps {
  columns: TableColumn[];
  data: TableRow[];
}

export default function Table({ columns, data }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full border-collapse text-[0.95rem]">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left font-semibold text-gray-900 p-4 border-b border-gray-200"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="hover:bg-gray-50 transition-colors duration-150"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="p-4 text-gray-700 border-b border-gray-200"
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Helper component for “status” cells (optional, replaces .status class) */
export function TableStatus({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center justify-center bg-gray-100 text-gray-900 font-semibold text-sm px-3 py-1 rounded-xl min-w-[70px] text-center">
      {children}
    </span>
  );
}
