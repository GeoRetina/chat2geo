import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import * as path from "path";

dayjs.extend(utc);
dayjs.extend(relativeTime);

export function extractYear(dateString: string): number {
  const date = new Date(dateString);
  return date.getUTCFullYear();
}

export const dateToString = (date: Date | null): string => {
  const year = date?.getFullYear();
  const month = date ? String(date.getMonth() + 1).padStart(2, "0") : "";
  const day = date ? String(date.getDate()).padStart(2, "0") : "";
  return `${year}-${month}-${day}`;
};

export const formatDbDate = (isoString: string): string => {
  const date = dayjs.utc(isoString); // Parse the timestamp in UTC
  if (!date.isValid()) {
    return "N/A";
  }
  return date.fromNow(); // e.g., "5 minutes ago"
};
export function cleanString(str: string): string {
  return str.replace(/\x00/g, "");
}

export function removeExtension(filename: string): string {
  const parsed = path.parse(filename);
  return parsed.name;
}
