export const SERVICE_STATUS_LABELS = {
  Green: "On Schedule",
  Amber: "Due Soon",
  Red: "Due Now / Overdue",
  "No Interval": "Not Monitored",
};

export function getServiceStatusLabel(status) {
  return SERVICE_STATUS_LABELS[status] || status || "On Schedule";
}
