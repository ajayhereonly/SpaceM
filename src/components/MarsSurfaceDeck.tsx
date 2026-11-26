import { Compass, FlaskConical, MapPin, ScanLine } from 'lucide-react';
import type { MissionState } from '../simulation/types';

interface MarsSurfaceDeckProps {
  mission: MissionState;
  onSelectSector: (sectorId: string) => void;
  onScanSector: (sectorId: string) => void;
  onCollectSample: (sectorId: string) => void;
  onQuickLandMars: () => void;
}

export function MarsSurfaceDeck({
  mission,
  onSelectSector,
  onScanSector,
  onCollectSample,
  onQuickLandMars,
}: MarsSurfaceDeckProps) {
  const activeSector =
    mission.marsSectors.find((s) => s.id === mission.activeSectorId) ??
    mission.marsSectors[0];
  const isLanded = mission.phase === 'MARS_SURFACE';
  const roverDeployed = mission.equipment.some(
    (e) => e.id === 'rover-ares' && e.status === 'DEPLOYED',
  );
  const drillDeployed = mission.equipment.some(
    (e) => e.id === 'core-drill' && e.status === 'DEPLOYED',
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left 5 Columns: Interactive Jezero Crater Topographic Map */}
      <section
        aria-label="Jezero Crater Surface Map"
        className="lg:col-span-5 bg-[#111722] border border-[#243044] rounded-xl p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Jezero Crater Exploration Grid
            </h2>
          </div>
          <span className="font-mono-tabular text-xs text-slate-400">
            {mission.marsSectors.filter((s) => s.scanned).length}/4 Scanned
          </span>
        </div>

        <div className="relative rounded-lg border border-[#243044] bg-[#1D120E] overflow-hidden h-56">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
            aria-hidden="true"
          >
            {/* Crater topographic elevation rings */}
            <ellipse cx="50" cy="52" rx="44" ry="40" fill="none" stroke="#5C2B19" strokeWidth="0.6" />
            <ellipse cx="50" cy="52" rx="34" ry="30" fill="none" stroke="#7A361F" strokeWidth="0.6" />
            <ellipse cx="50" cy="52" rx="22" ry="19" fill="none" stroke="#9A4527" strokeWidth="0.6" />
            <path
              d="M 8 34 Q 32 45 50 52 T 92 66"
              fill="none"
              stroke="#B45309"
              strokeOpacity="0.45"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
            {/* Coordinate crosshairs */}
            <line x1="50" y1="0" x2="50" y2="100" stroke="#7C2D12" strokeOpacity="0.35" strokeWidth="0.4" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#7C2D12" strokeOpacity="0.35" strokeWidth="0.4" />
          </svg>

          {/* Apollo 11-M Lander Home Pin */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono-tabular text-amber-300 bg-[#07090E]/90 border border-amber-500/60 px-1.5 py-0.5 rounded pointer-events-none"
            style={{ left: '50%', top: '52%' }}
          >
            A11-M BASE
          </div>

          {/* Clickable Mars Sectors */}
          {mission.marsSectors.map((sector) => {
            const selected = sector.id === activeSector.id;
            return (
              <button
                key={sector.id}
                type="button"
                onClick={() => onSelectSector(sector.id)}
                aria-label={`Select sector ${sector.name}`}
                style={{ left: `${sector.mapX}%`, top: `${sector.mapY}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-md border text-[10px] font-mono-tabular font-semibold transition-colors whitespace-nowrap flex items-center gap-1 ${
                  selected
                    ? 'bg-amber-500 text-slate-950 border-amber-200 z-10'
                    : sector.sampleCollected
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                      : sector.scanned
                        ? 'bg-cyan-950/90 text-cyan-200 border-cyan-500/60'
                        : 'bg-[#0B0F17]/90 text-slate-200 border-[#475569] hover:border-amber-400'
                }`}
              >
                <MapPin className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                <span>{sector.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
          <span>Rover: {roverDeployed ? 'ACTIVE' : 'STOWED'}</span>
          <span>Drill: {drillDeployed ? 'ACTIVE' : 'STOWED'}</span>
          <span>Science: {mission.telemetry.sciencePoints} pts</span>
        </div>
      </section>

      {/* Center 4 Columns: Active Sector Details & Exploration Controls */}
      <section
        aria-label="Selected Mars Sector Operations"
        className="lg:col-span-4 bg-[#111722] border border-[#243044] rounded-xl p-4 flex flex-col justify-between gap-3"
      >
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400 font-mono-tabular mb-1">
            <span>{activeSector.coordinates}</span>
            <span>{activeSector.elevationM} m</span>
          </div>
          <h3 className="font-display text-base font-semibold text-slate-100">
            {activeSector.name}
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            {activeSector.summary}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3 bg-[#0B0F17] border border-[#1E293B] rounded-lg p-2.5 text-xs">
            <div>
              <div className="text-[10px] text-slate-500">Surface Temp</div>
              <div className="font-mono-tabular text-slate-200 font-semibold">
                {activeSector.tempC} °C
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Atmospheric Dust</div>
              <div className="font-mono-tabular text-slate-200 font-semibold">
                {activeSector.dustIndex}
              </div>
            </div>
            <div className="col-span-2 pt-1 border-t border-[#1E293B]">
              <div className="text-[10px] text-slate-500">Spectral Mineral Signature</div>
              <div className="text-cyan-300 font-medium mt-0.5">
                {activeSector.mineralSignature}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {!isLanded ? (
            <div className="bg-[#0B0F17] border border-amber-500/40 rounded-lg p-3 flex flex-col gap-2">
              <p className="text-xs text-amber-200">
                Apollo 11-M is currently in {mission.phase.replace('_', ' ')} phase. Land on Mars to dispatch the crew and rover into {activeSector.name}.
              </p>
              <button
                type="button"
                onClick={onQuickLandMars}
                className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
              >
                Fast-Track Landing at Jezero Crater
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onScanSector(activeSector.id)}
                className="flex-1 py-2 px-3 rounded-lg border border-cyan-500/50 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <ScanLine className="w-3.5 h-3.5" aria-hidden="true" />
                {activeSector.scanned ? 'Re-Scan Sector' : 'Scan Sector'}
              </button>
              <button
                type="button"
                disabled={activeSector.sampleCollected}
                onClick={() => onCollectSample(activeSector.id)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeSector.sampleCollected
                    ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 cursor-default'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                {activeSector.sampleCollected ? 'Sample Logged' : 'Extract Core Sample'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Right 3 Columns: Collected Mars Sample Vault */}
      <section
        aria-label="Collected Mars Sample Vault"
        className="lg:col-span-3 bg-[#111722] border border-[#243044] rounded-xl p-4 flex flex-col gap-2.5"
      >
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
          <div className="flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Return Sample Vault
            </h2>
          </div>
          <span className="font-mono-tabular text-xs text-emerald-400">
            {mission.samples.length}/4
          </span>
        </div>

        <div
          data-testid="mars-sample-vault"
          className="flex-1 overflow-y-auto space-y-2 max-h-56 pr-1"
        >
          {mission.samples.length === 0 ? (
            <div className="bg-[#0B0F17] border border-[#1E293B] rounded-lg p-3 text-xs text-slate-400 leading-relaxed">
              No Martian core specimens stored yet. Land at Jezero Crater, scan a sector, and extract a core sample with Dr. Okafor.
            </div>
          ) : (
            mission.samples.map((sample) => (
              <div
                key={sample.id}
                className="bg-[#0B0F17] border border-emerald-500/35 rounded-lg p-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-1 text-[11px] text-emerald-400 font-mono-tabular">
                  <span>{sample.sampleType}</span>
                  <span>{sample.collectedAtMet}</span>
                </div>
                <div className="font-semibold text-slate-100 mt-0.5">{sample.sampleName}</div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">{sample.finding}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
