import { useState } from 'react';
import { CheckCircle2, PackageCheck, Wrench } from 'lucide-react';
import type { EquipmentCategory, MissionState } from '../simulation/types';

interface EquipmentBayProps {
  mission: MissionState;
  onRunDiagnostic: (equipmentId: string) => void;
  onDeployEquipment: (equipmentId: string) => void;
  onSwitchToMarsCamera: () => void;
}

const CATEGORIES: Array<'All' | EquipmentCategory> = [
  'All',
  'Mobility',
  'Science',
  'Habitat',
  'Comms',
];

export function EquipmentBay({
  mission,
  onRunDiagnostic,
  onDeployEquipment,
  onSwitchToMarsCamera,
}: EquipmentBayProps) {
  const [filter, setFilter] = useState<'All' | EquipmentCategory>('All');

  const filtered =
    filter === 'All'
      ? mission.equipment
      : mission.equipment.filter((item) => item.category === filter);

  const deployedCount = mission.equipment.filter((e) => e.status === 'DEPLOYED').length;
  const isLanded = mission.phase === 'MARS_SURFACE';

  return (
    <section aria-label="Apollo 11-M Exploration Equipment Bay" className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111722] border border-[#243044] rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <PackageCheck className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Mars Exploration Equipment Bay
            </h2>
            <p className="text-xs text-slate-400">
              {deployedCount} of {mission.equipment.length} deployed ·{' '}
              {isLanded
                ? 'Mars surface bay doors open — deployed units render in 3D Jezero Crater'
                : 'Pre-check hardware in flight; surface gear deploys after Mars touchdown'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#243044] rounded-lg">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filter === cat
                    ? 'bg-[#1D283B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {isLanded && deployedCount > 0 && (
            <button
              type="button"
              onClick={onSwitchToMarsCamera}
              className="px-3 py-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-xs font-semibold whitespace-nowrap"
            >
              View on Mars 3D
            </button>
          )}
        </div>
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {filtered.map((item) => {
          const canDeploy = !item.requiresMarsSurface || isLanded;
          const isDeployed = item.status === 'DEPLOYED';

          return (
            <article
              key={item.id}
              className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 ${
                isDeployed
                  ? 'bg-[#111E24] border-emerald-500/50'
                  : 'bg-[#111722] border-[#243044]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 mb-1">
                  <span className="font-mono-tabular">
                    {item.code} · {item.category}
                  </span>
                  <span
                    className={`font-mono-tabular font-semibold ${
                      isDeployed
                        ? 'text-emerald-400'
                        : item.status === 'CHECKED'
                          ? 'text-cyan-300'
                          : 'text-slate-400'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <h3 className="font-display text-sm font-semibold text-slate-100 leading-snug">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.summary}</p>

                <div className="mt-2.5 pt-2 border-t border-[#1E293B] space-y-1 text-[11px]">
                  <div className="flex justify-between font-mono-tabular text-slate-300">
                    <span className="text-slate-500">Mass / Power</span>
                    <span>
                      {item.massKg} kg · {item.powerKw.toFixed(1)} kW
                    </span>
                  </div>
                  <div className="text-cyan-300">{item.marsBenefit}</div>
                </div>
              </div>

              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => onRunDiagnostic(item.id)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#243044] bg-[#0B0F17] hover:bg-[#192234] text-slate-300 text-xs font-medium flex items-center gap-1 whitespace-nowrap transition-colors"
                >
                  <Wrench className="w-3 h-3" aria-hidden="true" />
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => onDeployEquipment(item.id)}
                  disabled={isDeployed}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center justify-center gap-1 ${
                    isDeployed
                      ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 cursor-default'
                      : canDeploy
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-[#161E2E] border border-[#243044] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isDeployed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Deployed
                    </>
                  ) : canDeploy ? (
                    `Deploy ${item.code}`
                  ) : (
                    'Needs Mars Landing'
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
