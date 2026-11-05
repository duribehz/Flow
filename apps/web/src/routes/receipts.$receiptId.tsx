import { createFileRoute } from "@tanstack/react-router";

import { ReceiptDetailPage } from "@/features/logistics/receipt-detail-page";

export const Route = createFileRoute("/receipts/$receiptId")({
  component: ReceiptDetailPage,
});
