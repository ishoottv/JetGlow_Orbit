function formatInterval(value, suffix) {
  if (value == null || !Number.isFinite(Number(value)) || Number(value) <= 0) {
    return null;
  }

  const numeric = Number(value);
  const rounded = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
  return `${rounded}${suffix}`;
}

export function getServiceDriver(service) {
  const source = service?.due_by || service?.trigger_source;
  if (source === "days" || source === "hours" || source === "cycles") {
    return source;
  }

  if (service?.tracking_type === "days" || service?.tracking_type === "hours" || service?.tracking_type === "cycles") {
    return service.tracking_type;
  }

  return "days";
}

export function getEffectiveSchedule(service) {
  const driver = getServiceDriver(service);

  if (driver === "hours") {
    return {
      driver,
      label: "Flight Hours",
      interval: formatInterval(service?.applicable_hour_interval ?? service?.hour_interval, "h"),
    };
  }

  if (driver === "cycles") {
    return {
      driver,
      label: "Cycles",
      interval: formatInterval(service?.applicable_cycle_interval ?? service?.cycle_interval, "c"),
    };
  }

  return {
    driver: "days",
    label: "Calendar Days",
    interval: formatInterval(service?.applicable_day_interval ?? service?.day_interval, "d"),
  };
}

export function getScheduleSummary(service) {
  const schedule = getEffectiveSchedule(service);
  return schedule.interval ? `Every ${schedule.interval}` : "No interval";
}
