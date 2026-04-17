import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all related data for this user
    const aircraftList = await base44.entities.Aircraft.filter({ created_by: user.email });
    const flightsList = await base44.entities.Flight.filter({ created_by: user.email });
    const maintenanceList = await base44.entities.MaintenanceEvent.filter({ created_by: user.email });
    const customersList = await base44.entities.Customer.filter({ created_by: user.email });

    // Delete in bulk
    for (const aircraft of aircraftList) {
      await base44.entities.Aircraft.delete(aircraft.id);
    }
    for (const flight of flightsList) {
      await base44.entities.Flight.delete(flight.id);
    }
    for (const maintenance of maintenanceList) {
      await base44.entities.MaintenanceEvent.delete(maintenance.id);
    }
    for (const customer of customersList) {
      await base44.entities.Customer.delete(customer.id);
    }

    // Note: User entity deletion is handled by Base44 platform
    // The user account will be cleaned up after logout

    return Response.json({ success: true, message: 'Account deletion initiated' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});