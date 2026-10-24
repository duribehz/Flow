export type ShiftNameValue = "morning" | "afternoon" | "night";

export const shiftNameLabels: Record<ShiftNameValue, string> = {
  morning: "Mañana",
  afternoon: "Tarde",
  night: "Noche",
};

export const shiftNameOptions: Array<{ value: ShiftNameValue; label: string }> = [
  { value: "morning", label: shiftNameLabels.morning },
  { value: "afternoon", label: shiftNameLabels.afternoon },
  { value: "night", label: shiftNameLabels.night },
];

type IncidentValue = "none" | "shortage" | "surplus" | "damaged";

const incidentLabels: Record<IncidentValue, string> = {
  none: "Sin incidencia",
  shortage: "Faltante",
  surplus: "Sobrante",
  damaged: "Dañado",
};

export const incidentOptions: Array<{ value: IncidentValue; label: string }> = [
  { value: "none", label: incidentLabels.none },
  { value: "shortage", label: incidentLabels.shortage },
  { value: "surplus", label: incidentLabels.surplus },
  { value: "damaged", label: incidentLabels.damaged },
];

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

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}
