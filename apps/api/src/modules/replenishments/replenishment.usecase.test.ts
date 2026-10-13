import { describe, expect, test } from "bun:test";

import { AppError } from "@/shared/errors/app-error.js";
import { ReplenishmentUseCase } from "./replenishment.usecase.js";
import type {
  ReplenishmentDetail,
  ReplenishmentsRepository,
  SubmittedReplenishment,
} from "./replenishments.repo.js";

const submittedReplenishment: SubmittedReplenishment = {
  id: "10000000-0000-4000-8000-000000000001",
  requestNumber: "REQ-001",
  branch: {
    id: "20000000-0000-4000-8000-000000000001",
    name: "Centro",
  },
  status: "submitted",
  requestedBy: {
    id: "30000000-0000-4000-8000-000000000001",
    userName: "requester",
  },
  submittedAt: new Date("2026-10-13T12:00:00.000Z"),
  createdAt: new Date("2026-10-13T11:00:00.000Z"),
};

const replenishmentDetail: ReplenishmentDetail = {
  ...submittedReplenishment,
  inventoryClosureId: "40000000-0000-4000-8000-000000000001",
  reviewedBy: null,
  reviewedAt: null,
  notes: null,
  updatedAt: new Date("2026-10-13T12:00:00.000Z"),
  items: [],
};

function createRepo(detail: ReplenishmentDetail | undefined) {
  return {
    async getSubmittedReplenishments() {
      return [submittedReplenishment];
    },
    async getReplenishmentById() {
      return detail;
    },
  } satisfies ReplenishmentsRepository;
}

describe("ReplenishmentUseCase", () => {
  test("returns submitted replenishments", async () => {
    const useCase = new ReplenishmentUseCase(createRepo(replenishmentDetail));

    await expect(useCase.getSubmittedReplenishments()).resolves.toEqual([submittedReplenishment]);
  });

  test("returns a replenishment detail", async () => {
    const useCase = new ReplenishmentUseCase(createRepo(replenishmentDetail));

    await expect(useCase.getReplenishmentById(replenishmentDetail.id)).resolves.toEqual(
      replenishmentDetail,
    );
  });

  test("throws a 404 error when the replenishment does not exist", async () => {
    const useCase = new ReplenishmentUseCase(createRepo(undefined));

    try {
      await useCase.getReplenishmentById("10000000-0000-4000-8000-000000000099");
      throw new Error("Expected getReplenishmentById to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({
        status: 404,
        code: "REPLENISHMENT_NOT_FOUND",
      });
    }
  });
});

export { replenishmentDetail, submittedReplenishment };
