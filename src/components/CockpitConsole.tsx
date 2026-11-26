import {
  CheckCircle2,
  Compass,
  Cpu,
  Flame,
  Orbit,
  Radio,
  Rocket,
  Sliders,
} from 'lucide-react';
import {
  COCKPIT_SWITCHES,
  DSKY_PRESETS,
  type CrewTopicId,
} from '../simulation/missionData';
import {
  getMissingLaunchSwitches,
  isReadyForLaunch,
} from '../simulation/missionEngine';
import type {
  CameraMode,
  GravityMode,
  MissionState,
  SwitchId,
} from '../simulation/types';

interface CockpitConsoleProps {
  mission: MissionState;
  onToggleSwitch: (id: SwitchId) => void;
  onAutoPrep: () => void;
  onLaunch: () => void;
  onStageSep: () => void;
  onTmiBurn: () => void;
  onMarsDescent: () => void;
  onMarsTouchdown: () => void;
  onSetGravity: (mode: GravityMode) => void;
  onSetThrottle: (pct: number) => void;
  onPressDsky: (key: string) => void;
  onDskyPreset: (verb: string, noun: string) => void;
  onCrewTalk: (topic: CrewTopicId) => void;
  onSelectCamera: (mode: CameraMode) => void;
  onOpenMarsTab: () => void;
}

const DSKY_KEYS = [
  'VERB', 'NOUN', '7', '8', '9',
  'CLR', 'ENTR', '4', '5', '6',
  '0', '1', '2', '3',
];

export function CockpitConsole({
  mission,
  onToggleSwitch,
  onAutoPrep,
  onLaunch,
  onStageSep,
  onTmiBurn,
  onMarsDescent,
  onMarsTouchdown,
  onSetGravity,
  onSetThrottle,
  onPressDsky,
  onDskyPreset,
  onCrewTalk,
  onSelectCamera,
  onOpenMarsTab,
}: CockpitConsoleProps) {
  const readyForLaunch = isReadyForLaunch(mission);
  const missingLaunch = getMissingLaunchSwitches(mission);
  const recentComms = mission.comms.slice(-5).reverse();

  // Compute spacecraft dot position on Earth-to-Mars curved Hohmann transfer arc
  const p = mission.telemetry.transitProgressPct / 100;
  const shipX = 28 + p * 224;
  const shipY = 58 - Math.sin(p * Math.PI) * 34;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 h-full">
      {/* COLUMN 1: Apollo AGC-XI Main Computer (DSKY) + Flight Systems Switchboard */}
      <section
        aria-label="Apollo AGC-XI Computer and Switchboard"
        className="lg:col-span-4 bg-[#111722] border border-[#243044] rounded-xl p-3.5 flex flex-col gap-2.5"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#1E293B] pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Cpu className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-slate-100 truncate">
              Apollo AGC-XI Main Computer
            </h2>
          </div>
          <span className="font-mono-tabular text-xs text-amber-400 shrink-0">
            PROG {mission.dsky.prog}
          </span>
        </div>

        {/* DSKY Readout + Compact Keypad */}
        <div className="grid grid-cols-12 gap-3">
          {/* Segmented LED Readout */}
          <div
            className={`col-span-5 rounded-lg p-2.5 border font-mono-tabular flex flex-col justify-between ${
              mission.dsky.lampTestActive
                ? 'bg-amber-950/50 border-amber-400 text-amber-200'
                : 'bg-[#070B12] border-[#243044] text-emerald-400'
            }`}
          >
            <div className="grid grid-cols-2 gap-1 text-[11px] border-b border-[#1E293B] pb-1.5">
              <div>
                <div className="text-[9px] text-slate-400">VERB</div>
                <div className="text-base font-bold leading-tight text-amber-400">
                  {mission.dsky.verb}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400">NOUN</div>
                <div className="text-base font-bold leading-tight text-amber-400">
                  {mission.dsky.noun}
                </div>
              </div>
            </div>
            <div className="mt-1.5 space-y-0.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">ALT</span>
                <span>{mission.dsky.reg1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VEL</span>
                <span>{mission.dsky.reg2}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GRV</span>
                <span>{mission.dsky.reg3}</span>
              </div>
            </div>
          </div>

          {/* Clickable DSKY Keypad */}
          <div className="col-span-7 flex flex-col gap-1.5">
            <div className="grid grid-cols-5 gap-1">
              {DSKY_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => onPressDsky(k)}
                  className={`py-1.5 px-1 text-[11px] font-mono-tabular font-semibold rounded border transition-colors whitespace-nowrap ${
                    k === 'ENTR'
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30'
                      : k === 'VERB' || k === 'NOUN'
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/25'
                        : 'bg-[#161E2E] border-[#26344B] text-slate-200 hover:bg-[#1E293B]'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1 mt-0.5">
              {DSKY_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onDskyPreset(preset.verb, preset.noun)}
                  className="text-left px-2 py-1 text-[11px] bg-[#0B0F17] hover:bg-[#161E2E] border border-[#243044] rounded text-slate-300 truncate transition-colors"
                  title={preset.label}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[11px] font-mono-tabular text-cyan-300 bg-[#070B12] border border-[#1E293B] rounded px-2.5 py-1.5 truncate">
          {mission.dsky.statusText}
        </p>

        {/* Cockpit Systems Switchboard (10 physical switches) */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-300">
              Flight Systems Switchboard
            </span>
            <span className="text-[11px] font-mono-tabular text-slate-400">
              Load {mission.telemetry.powerLoadKw.toFixed(1)} / {mission.telemetry.reactorOutputKw.toFixed(0)} kW
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {COCKPIT_SWITCHES.map((sw) => {
              const active = mission.switches[sw.id];
              return (
                <button
                  key={sw.id}
                  type="button"
                  role="switch"
                  aria-checked={active}
                  aria-label={`${sw.label} switch`}
                  onClick={() => onToggleSwitch(sw.id)}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-left transition-colors ${
                    active
                      ? 'bg-[#162233] border-emerald-500/50 text-slate-100'
                      : 'bg-[#0B0F17] border-[#243044] text-slate-400 hover:border-slate-500'
                  }`}
                  title={sw.description}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate leading-tight">
                      {sw.label}
                    </div>
                    <div className="text-[10px] font-mono-tabular text-slate-400">
                      {sw.shortCode}
                      {sw.requiredForLaunch ? ' · Req' : ''}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono-tabular font-semibold shrink-0 ${
                      active ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {active ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* COLUMN 2: Launch / Flight Sequence + Antigravity Core Generator */}
      <section
        aria-label="Flight Controls and Antigravity Core"
        className="lg:col-span-4 bg-[#111722] border border-[#243044] rounded-xl p-3.5 flex flex-col gap-2.5"
      >
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Propulsion & Flight Director
            </h2>
          </div>
          <span className="font-mono-tabular text-xs text-slate-300">
            Fuel {mission.telemetry.fuelPct.toFixed(0)}%
          </span>
        </div>

        {/* Contextual Primary Mission Controls */}
        <div className="bg-[#0B0F17] border border-[#243044] rounded-lg p-3 flex flex-col gap-2.5">
          {mission.phase === 'PRE_LAUNCH' && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Pad 39A Launch Readiness</span>
                <span
                  className={`font-mono-tabular font-semibold ${
                    readyForLaunch ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {readyForLaunch ? 'ALL BUSES GO' : `${missingLaunch.length} SWITCHES PENDING`}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onAutoPrep}
                  className="flex-1 py-2 px-3 rounded-lg border border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Auto-Prep Checklist
                </button>
                <button
                  type="button"
                  onClick={onLaunch}
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                  Launch Ignition
                </button>
              </div>
            </>
          )}

          {mission.phase === 'COUNTDOWN' && (
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-xs font-semibold text-amber-400">
                  Terminal Countdown Active
                </div>
                <div className="text-[11px] text-slate-400">
                  Saturn-XI main engines ramping to 100% thrust
                </div>
              </div>
              <div className="font-mono-tabular text-2xl font-bold text-amber-400">
                T-{Math.ceil(mission.telemetry.countdownSeconds)}s
              </div>
            </div>
          )}

          {mission.phase === 'ASCENT' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Earth Orbital Ascent</span>
                <span className="font-mono-tabular text-amber-400">
                  {mission.telemetry.altitudeKm.toFixed(1)} km · {mission.telemetry.velocityKms.toFixed(2)} km/s
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onStageSep}
                  disabled={mission.telemetry.stage1Separated}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                    mission.telemetry.stage1Separated
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 cursor-default'
                      : 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950'
                  }`}
                >
                  {mission.telemetry.stage1Separated ? 'Stage 1 Separated' : 'Separate Stage 1'}
                </button>
                <button
                  type="button"
                  onClick={onTmiBurn}
                  className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap"
                >
                  Engage Trans-Mars Burn
                </button>
              </div>
            </div>
          )}

          {mission.phase === 'TRANSIT' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Deep Space Transit to Mars</span>
                <span className="font-mono-tabular text-cyan-300">
                  {mission.telemetry.transitProgressPct.toFixed(0)}% En Route
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#161E2E] rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${mission.telemetry.transitProgressPct}%` }}
                />
              </div>
              <div className="flex gap-2 mt-0.5">
                <button
                  type="button"
                  onClick={onMarsDescent}
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap"
                >
                  Begin Mars Descent
                </button>
                <button
                  type="button"
                  onClick={onMarsTouchdown}
                  className="flex-1 py-2 px-3 rounded-lg border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Land at Jezero Crater
                </button>
              </div>
            </div>
          )}

          {mission.phase === 'DESCENT' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-medium">
                  Martian Atmospheric Entry & Retro-Braking
                </span>
                <span className="font-mono-tabular text-amber-400">
                  Alt {mission.telemetry.altitudeKm.toFixed(1)} km
                </span>
              </div>
              <button
                type="button"
                onClick={onMarsTouchdown}
                className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
              >
                Execute Powered Touchdown
              </button>
            </div>
          )}

          {mission.phase === 'MARS_SURFACE' && (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Landed at Jezero Crater, Mars</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Science Yield: {mission.telemetry.sciencePoints} pts · Deploy equipment & explore sectors
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenMarsTab}
                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0"
              >
                Explore Mars
              </button>
            </div>
          )}

          {/* Main Engine Throttle Slider */}
          <div className="pt-2 border-t border-[#1E293B]">
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="main-throttle-slider" className="text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                Plasma Main Throttle
              </label>
              <span className="font-mono-tabular text-amber-400 font-semibold">
                {mission.telemetry.throttlePct}%
              </span>
            </div>
            <input
              id="main-throttle-slider"
              type="range"
              min={0}
              max={100}
              value={mission.telemetry.throttlePct}
              onChange={(e) => onSetThrottle(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* ANTIGRAVITY FIELD GENERATOR */}
        <div className="bg-[#0B0F17] border border-[#243044] rounded-lg p-3 flex-1 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Orbit className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
              <h3 className="font-display text-xs font-semibold text-slate-100">
                Antigravity Core Generator
              </h3>
            </div>
            <span className="font-mono-tabular text-sm font-bold text-cyan-300">
              {mission.telemetry.gravityG.toFixed(2)} G
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {mission.telemetry.gravityG < 0.1
              ? 'Zero-G active: unsecured cabin tools, tablets, and unlocked crew float freely.'
              : mission.telemetry.gravityG < 0.7
                ? 'Mars 0.38 G acclimation field active: crew conditioning for Jezero EVA.'
                : 'Earth 1.00 G deck gravity active: standard hull traction across cabin.'}
          </p>

          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Antigravity field level">
            {(
              [
                { mode: 'ZERO_G', label: '0.00 G', sub: 'Zero-G' },
                { mode: 'MARS_G', label: '0.38 G', sub: 'Mars' },
                { mode: 'EARTH_G', label: '1.00 G', sub: 'Earth' },
              ] as const
            ).map((opt) => {
              const selected = mission.gravityMode === opt.mode && mission.switches.antigravCore;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => onSetGravity(opt.mode)}
                  className={`py-2 px-2 rounded-lg border text-center transition-colors ${
                    selected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-[#111722] border-[#243044] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-mono-tabular text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-400">{opt.sub}</div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onSelectCamera('cabin')}
            className="w-full py-1.5 px-3 rounded-md border border-[#243044] bg-[#111722] hover:bg-[#192234] text-slate-200 text-xs font-medium transition-colors"
          >
            Inspect 3D Antigravity Cabin View
          </button>
        </div>
      </section>

      {/* COLUMN 3: Earth-to-Mars Orbital Trajectory & Live Crew Comms */}
      <section
        aria-label="Orbital Trajectory and Live Crew Comms"
        className="lg:col-span-4 bg-[#111722] border border-[#243044] rounded-xl p-3.5 flex flex-col gap-2.5"
      >
        {/* Earth -> Mars Transfer Arc SVG */}
        <div>
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 mb-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Earth to Mars Trajectory
              </h2>
            </div>
            <span className="font-mono-tabular text-xs text-slate-300">
              {mission.telemetry.distanceToMarsKm === 0
                ? 'AT MARS'
                : `${(mission.telemetry.distanceToMarsKm / 1_000_000).toFixed(1)}M km`}
            </span>
          </div>

          <div className="bg-[#070B12] border border-[#243044] rounded-lg p-2">
            <svg viewBox="0 0 280 78" className="w-full h-16" role="img" aria-label="Earth to Mars orbital trajectory map">
              {/* Transfer curve */}
              <path
                d="M 28 58 Q 140 -6 252 58"
                fill="none"
                stroke="#1E293B"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              {/* Completed arc */}
              <path
                d={`M 28 58 Q ${28 + p * 112} ${58 - p * 38} ${shipX} ${shipY}`}
                fill="none"
                stroke="#06B6D4"
                strokeWidth="2.2"
              />
              {/* Earth */}
              <circle cx="28" cy="58" r="9" fill="#0284C7" stroke="#7DD3FC" strokeWidth="1.5" />
              <text x="28" y="75" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">
                EARTH
              </text>
              {/* Mars */}
              <circle cx="252" cy="58" r="8" fill="#C2410C" stroke="#FDBA74" strokeWidth="1.5" />
              <text x="252" y="75" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">
                MARS
              </text>
              {/* Apollo 11-M Marker */}
              <circle cx={shipX} cy={shipY} r="4.5" fill="#F59E0B" stroke="#FFFBEB" strokeWidth="1.2" />
            </svg>
          </div>
        </div>

        {/* Live Crew-to-Crew Radio Comms */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <h3 className="font-display text-xs font-semibold text-slate-100">
                Live Crew Intercom
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onCrewTalk('systems-check')}
              className="px-2.5 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-[11px] font-medium transition-colors whitespace-nowrap"
            >
              Trigger Crew Cross-Talk
            </button>
          </div>

          <div
            data-testid="cockpit-comms-log"
            className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-48"
          >
            {recentComms.map((msg) => (
              <div
                key={msg.id}
                className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 mb-0.5">
                  <span className="font-semibold text-slate-200 truncate">
                    {msg.speakerName}
                    {msg.targetName ? ` → ${msg.targetName}` : ''}
                  </span>
                  <span className="font-mono-tabular shrink-0">{msg.timestampMet}</span>
                </div>
                <p className="text-slate-300 leading-snug">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
