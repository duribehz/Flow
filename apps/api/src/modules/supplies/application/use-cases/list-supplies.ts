import type { ListSuppliesOutput } from "../dto/list-supplies.dto.js";
import type { SupplyRepository } from "../ports/supply.repository.js";

export class ListSupplies {
  constructor(private readonly supplies: SupplyRepository) {}

  execute(): Promise<ListSuppliesOutput> {
    return this.supplies.list();
  }
}
