import useOrbitScore from "@/hooks/useOrbitScore";
import useConditionIndex from "@/hooks/useConditionIndex";

export default function AircraftScoreBox({ aircraft, serviceStatuses = [] }) {
  const orbitScore = useOrbitScore(aircraft, serviceStatuses);
  const conditionIndex = useConditionIndex(serviceStatuses);
  
  const isRed = conditionIndex < 40;
  const isAmber = conditionIndex >= 40 && conditionIndex < 70;
  const colors = isRed 
    ? "bg-red-100 text-red-700 border-red-200"
    : isAmber
    ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-green-100 text-green-700 border-green-200";

  return (
    <div className={`flex-shrink-0 rounded-lg border ${colors} p-2 min-w-fit text-center`}>
      <p className="text-xs font-semibold text-muted-foreground mb-1">Condition</p>
      <p className="text-lg font-black mb-2">{conditionIndex}</p>
      <div className="text-xs space-y-0.5">
        <p><span className="font-semibold">H:</span> {(aircraft.hours_since_orbit || 0).toFixed(1)}</p>
        <p><span className="font-semibold">C:</span> {aircraft.cycles_since_orbit || 0}</p>
        <p><span className="font-semibold">D:</span> {aircraft.days_since_orbit || 0}</p>
      </div>
    </div>
  );
}