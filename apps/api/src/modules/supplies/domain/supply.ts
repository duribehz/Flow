export interface Supply {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unitCost: number;
  active: boolean;
  category: {
    id: string;
    name: string;
  };
  unit: {
    id: string;
    name: string;
    symbol: string;
  };
  suppliers: Array<{
    id: string;
    name: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
