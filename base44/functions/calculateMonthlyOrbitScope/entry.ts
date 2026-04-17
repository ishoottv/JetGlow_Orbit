import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { aircraft_id, force_recalculate } = await req.json();

    if (!aircraft_id) {
      return Response.json({ error: "aircraft_id is required" }, { status: 400 });
    }

    // Fetch aircraft and assignment
    const ac = await base44.asServiceRole.entities.Aircraft.get(aircraft_id);
    if (!ac) return Response.json({ error: "Aircraft not found" }, { status: 404 });

    const assignments = await base44.asServiceRole.entities.AircraftOrbitAssignment.filter({ aircraft_id });
    if (!assignments || assignments.length === 0) {
      return Response.json({ error: "No ORBIT assignment found" }, { status: 404 });
    }

    const assignment = assignments[0];
    const plan = await base44.asServiceRole.entities.OrbitPlan.get(assignment.orbit_plan_id);
    if (!plan) return Response.json({ error: "ORBIT Plan not found" }, { status: 404 });

    // Get billing period bounds
    const now = new Date();
    const periodStart = new Date(assignment.current_period_start || assignment.billing_start_date);
    let periodEnd = new Date(assignment.current_period_end || assignment.billing_start_date);

    // Calculate current period based on billing frequency
    if (!assignment.current_period_start) {
      const freq = assignment.billing_frequency || plan.billing_frequency || "monthly";
      if (freq === "monthly") periodEnd.setMonth(periodEnd.getMonth() + 1);
      else if (freq === "quarterly") periodEnd.setMonth(periodEnd.getMonth() + 3);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Check if we need recalculation
    const existing = await base44.asServiceRole.entities.MonthlyOrbitScope.filter({
      aircraft_id,
      is_current: true,
    });

    if (existing && existing.length > 0 && !force_recalculate) {
      return Response.json({
        success: true,
        cached: true,
        scope: existing[0],
      });
    }

    // Get flights in period
    const flights = await base44.asServiceRole.entities.Flight.filter({
      aircraft_id,
      flight_date: {
        $gte: periodStart.toISOString().split("T")[0],
        $lte: periodEnd.toISOString().split("T")[0],
      },
    });

    const hoursThisPeriod = flights.reduce((sum, f) => sum + (f.block_hours || 0), 0);
    const cyclesThisPeriod = flights.reduce((sum, f) => sum + (f.flight_cycle || 1), 0);

    // Get service trigger rules
    const rules = await base44.asServiceRole.entities.ServiceTriggerRule.filter({
      applies_to_category: [ac.aircraft_category, "All"],
      is_active: true,
    });

    // Get service status for aircraft
    const serviceStatuses = await base44.asServiceRole.entities.AircraftServiceStatus.filter({
      aircraft_id,
    });

    // Build scope
    const monthlyIncluded = [];
    const rotationalDue = [];
    const correctionIncluded = [];
    const exceptionFlagged = [];

    for (const rule of rules) {
     if (!rule.is_active) continue;

     const status = serviceStatuses.find(s => s.service_code === rule.service_code);
     if (!status) continue;

     const score = status.service_trigger_score || 0;
     const workClass = rule.work_class || "rotational_included";

     if (workClass === "base_included") {
       // Always include
       monthlyIncluded.push(rule.service_code);
     } else if (workClass === "rotational_included") {
       // Include if due (score >= due_soon_percent)
       if (score >= (rule.due_soon_percent || 80)) {
         rotationalDue.push(rule.service_code);
       }
     } else if (workClass === "correction_controlled") {
       // Include only if due AND room in visit budget
       if (score >= (rule.due_soon_percent || 80)) {
         const maxCorrectionAllowed = plan.max_correction_services_per_visit || 2;
         if (correctionIncluded.length < maxCorrectionAllowed) {
           correctionIncluded.push(rule.service_code);
         }
       }
     } else if (workClass === "full_correction") {
       // Never auto-include, flag as exception
       if (score >= (rule.due_soon_percent || 80)) {
         exceptionFlagged.push(rule.service_code);
       }
     }
    }

    // Determine utilization status
    const includeHours = assignment.custom_included_hours_per_month || plan.included_hours_per_month;
    const includeCycles = assignment.custom_included_cycles_per_month || plan.included_cycles_per_month;

    let utilizationStatus = "within_plan";
    let recommendedAction = "continue_current_orbit";

    const hoursPercent = (hoursThisPeriod / includeHours) * 100;
    const cyclesPercent = (cyclesThisPeriod / includeCycles) * 100;

    if (hoursPercent > 100 || cyclesPercent > 100) {
      utilizationStatus = "exceeding_plan";
      recommendedAction = "recommend_plan_upgrade";
    } else if (hoursPercent > 80 || cyclesPercent > 80) {
      utilizationStatus = "approaching_limit";
      recommendedAction = "schedule_orbit_visit";
    }

    // If exceptions flagged, adjust recommendation
    if (exceptionFlagged.length > 0) {
      recommendedAction = "recommend_add_on_quote";
    }

    // Create or update MonthlyOrbitScope
    let scope;
    if (existing && existing.length > 0) {
     // Update existing
     scope = await base44.asServiceRole.entities.MonthlyOrbitScope.update(existing[0].id, {
       monthly_included_services: monthlyIncluded,
       rotational_services_due: rotationalDue,
       exception_services_flagged: exceptionFlagged,
       utilization_status: utilizationStatus,
       recommended_plan_action: recommendedAction,
       hours_projected_this_period: hoursThisPeriod,
       cycles_projected_this_period: cyclesThisPeriod,
       calculation_timestamp: new Date().toISOString(),
     });
    } else {
     // Create new
     scope = await base44.asServiceRole.entities.MonthlyOrbitScope.create({
       aircraft_id,
       period_start: periodStart.toISOString().split("T")[0],
       period_end: periodEnd.toISOString().split("T")[0],
       monthly_included_services: monthlyIncluded,
       rotational_services_due: rotationalDue,
       exception_services_flagged: exceptionFlagged,
       utilization_status: utilizationStatus,
       recommended_plan_action: recommendedAction,
       hours_projected_this_period: hoursThisPeriod,
       cycles_projected_this_period: cyclesThisPeriod,
       calculation_timestamp: new Date().toISOString(),
       is_current: true,
     });
    }

    // Create recommendations for exceptions and full_correction services
    if (exceptionFlagged.length > 0) {
      for (const serviceCode of exceptionFlagged) {
        const rule = rules.find(r => r.service_code === serviceCode);
        if (!rule) continue;

        // Check if recommendation already exists
        const existing = await base44.asServiceRole.entities.Recommendation.filter({
          aircraft_id,
          source_service_code: serviceCode,
          recommendation_status: { $ne: "resolved" },
        });

        const recType = rule.work_class === "full_correction" ? 
          (rule.upgrade_recommendation_type || "reset_recommendation") : 
          (rule.upgrade_recommendation_type || "add_on_quote");
        
        const message = rule.work_class === "full_correction" ?
          `Service ${serviceCode} (${rule.service_name}) requires full correction outside ORBIT scope. Recommend ${recType}.` :
          `Service ${serviceCode} (${rule.service_name}) exceeds ORBIT scope. Recommend ${recType}.`;

        if (existing && existing.length > 0) {
          await base44.asServiceRole.entities.Recommendation.update(existing[0].id, {
            recommendation_status: "active",
          });
        } else {
          await base44.asServiceRole.entities.Recommendation.create({
            aircraft_id,
            recommendation_type: recType,
            source_service_code: serviceCode,
            title: rule.work_class === "full_correction" ? 
              `${rule.service_name} - Full Correction Required` :
              `${rule.service_name} - Exception Service`,
            message,
            recommendation_status: "active",
            priority: "high",
          });
        }
      }
    }

    return Response.json({
      success: true,
      cached: false,
      scope,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});