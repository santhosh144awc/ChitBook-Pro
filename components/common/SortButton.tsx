"use client";

interface SortButtonProps<T extends string> {
  field: T;
  currentField: T;
  direction: "asc" | "desc";
  onSort: (field: T) => void;
  children: React.ReactNode;
}

export default function SortButton<T extends string>({
  field,
  currentField,
  direction,
  onSort,
  children,
}: SortButtonProps<T>) {
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-primary-600"
    >
      {children}
      {currentField === field && (
        <span className="text-xs">
          {direction === "asc" ? "↑" : "↓"}
        </span>
      )}
    </button>
  );
}

