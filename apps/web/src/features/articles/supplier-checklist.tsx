import type { Supplier } from "@/api/generated/models/supplier";

type SupplierChecklistProps = {
  suppliers: Supplier[];
  selectedIds: string[];
  onChange: (supplierIds: string[]) => void;
};

export function SupplierChecklist({ suppliers, selectedIds, onChange }: SupplierChecklistProps) {
  function toggleSupplier(supplierId: string) {
    onChange(
      selectedIds.includes(supplierId)
        ? selectedIds.filter((id) => id !== supplierId)
        : [...selectedIds, supplierId],
    );
  }

  return (
    <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-2">
      {suppliers.length > 0 ? (
        suppliers.map((supplier) => (
          <label
            key={supplier.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(supplier.id)}
              onChange={() => toggleSupplier(supplier.id)}
              className="size-4 rounded border-input accent-foreground"
            />
            <span className="min-w-0 flex-1 truncate">{supplier.name}</span>
          </label>
        ))
      ) : (
        <p className="px-2 py-3 text-sm text-muted-foreground">
          No hay proveedores registrados. Agrégalos desde la sección Proveedores.
        </p>
      )}
    </div>
  );
}
