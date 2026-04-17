import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { maintenance_event_id } = await req.json();
    if (!maintenance_event_id) {
      return Response.json({ error: 'maintenance_event_id is required' }, { status: 400 });
    }

    // Get the event first to verify it exists
    const event = await base44.asServiceRole.entities.MaintenanceEvent.get(maintenance_event_id);
    if (!event) {
      return Response.json({ error: 'Maintenance event not found' }, { status: 404 });
    }

    // Delete all service logs for this event
    const logs = await base44.asServiceRole.entities.ServiceLog.filter({ maintenance_event_id });
    await Promise.all(logs.map(log => base44.asServiceRole.entities.ServiceLog.delete(log.id)));

    // Delete the maintenance event itself
    await base44.asServiceRole.entities.MaintenanceEvent.delete(maintenance_event_id);

    return Response.json({ success: true, deleted_logs: logs.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});