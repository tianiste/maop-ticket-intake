// Display helpers. Unknown values are shown as "ni podatka", never as 0.

export const UNKNOWN = "ni podatka";

const number = new Intl.NumberFormat("sl-SI", { maximumFractionDigits: 1 });

export function formatNumber(value: number | null): string {
  return value === null ? UNKNOWN : number.format(value);
}

export function formatShare(part: number, known: number): string {
  if (known === 0) return UNKNOWN;
  return `${number.format((part / known) * 100)} % (${part} od ${known})`;
}

export function formatHours(hours: number | null): string {
  if (hours === null) return UNKNOWN;
  if (hours < 1 / 60) return "manj kot 1 min";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${number.format(hours)} h`;
  return `${number.format(hours / 24)} dni`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("sl-SI", { dateStyle: "short", timeStyle: "short" });
}

export function verdictText(valid: boolean | null): string {
  if (valid === true) return "popoln";
  if (valid === false) return "nepopoln";
  return "ni preverjen";
}
