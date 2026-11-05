const quantityFormatter = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const moneyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatStoredQuantity(quantity: number | null | undefined) {
  return quantity == null ? "No contado" : quantityFormatter.format(quantity / 100);
}

export function storedQuantityToInput(quantity: number | null | undefined) {
  return quantity == null ? "" : String(quantity / 100);
}

export function parseStoredQuantity(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [integerPart, fractionPart = ""] = normalized.split(".");
  const quantity = Number(integerPart) * 100 + Number(fractionPart.padEnd(2, "0"));
  return Number.isSafeInteger(quantity) ? quantity : null;
}

export function parseMoneyToCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [integerPart, fractionPart = ""] = normalized.split(".");
  const cents = Number(integerPart) * 100 + Number(fractionPart.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatMoney(cents: number) {
  return moneyFormatter.format(cents / 100);
}

export function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value: string | null | undefined) {
  return value ? dateTimeFormatter.format(new Date(value)) : "Pendiente";
}

export function todayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
