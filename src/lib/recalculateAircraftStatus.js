import { base44 } from "@/api/base44Client";

function getPayload(aircraftId) {
  return aircraftId ? { aircraft_id: aircraftId } : {};
}

export async function recalculateAircraftStatus(aircraftId, options = {}) {
  const { skipServiceTriggers = false } = options;
  const payload = getPayload(aircraftId);

  if (!skipServiceTriggers) {
    await base44.functions.invoke("calculateServiceTriggers", payload);
  }
  await base44.functions.invoke("recalcOrbit", payload);
}

export async function refetchAircraftQueries(queryClient, aircraftId, options = {}) {
  const {
    includeFlights = false,
    includeMaintenance = false,
    includeAircraftList = false,
    includeAllServiceStatuses = false,
    includeFleetFlights = false,
    includeFleetServiceStatus = false,
  } = options;

  if (includeFlights && aircraftId) {
    await queryClient.refetchQueries({ queryKey: ["flights", aircraftId] });
  }
  if (includeMaintenance && aircraftId) {
    await queryClient.refetchQueries({ queryKey: ["maintenance", aircraftId] });
  }
  if (aircraftId) {
    await queryClient.refetchQueries({ queryKey: ["aircraft", aircraftId] });
    await queryClient.refetchQueries({ queryKey: ["serviceStatus", aircraftId] });
  }
  if (includeAircraftList) {
    await queryClient.refetchQueries({ queryKey: ["aircraft"] });
  }
  if (includeAllServiceStatuses) {
    await queryClient.refetchQueries({ queryKey: ["allServiceStatuses"] });
  }
  if (includeFleetFlights) {
    await queryClient.refetchQueries({ queryKey: ["flights"] });
    await queryClient.refetchQueries({ queryKey: ["flights-all"] });
  }
  if (includeFleetServiceStatus) {
    await queryClient.refetchQueries({ queryKey: ["serviceStatus"] });
  }
}
