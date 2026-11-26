import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cockpitAudio } from './audio/cockpitAudio';
import { CockpitConsole } from './components/CockpitConsole';
import { CrewDeck } from './components/CrewDeck';
import { EquipmentBay } from './components/EquipmentBay';
import { MarsSurfaceDeck } from './components/MarsSurfaceDeck';
import { SpaceViewport3D } from './components/SpaceViewport3D';
import type { CrewTopicId } from './simulation/missionData';
import {
  autoPrepChecklist,
  collectMarsSample,
  createInitialMissionState,
  deployEquipment,
  executeDskyCommand,
  fastTrackMarsLanding,
  formatMet,
  pressDskyKey,
  runEquipmentDiagnostic,
  scanMarsSector,
  selectCrewMember,
  selectMarsSector,
  setActiveTab,
  setAntigravityMode,
  setCameraMode,
  setThrottle,
  stepSimulation,
  toggleAudio,
  toggleCrewSuitControl,
  toggleSwitch,
  triggerCrewConversation,
  triggerLaunch,
  triggerMarsDescent,
  triggerStageSeparation,
  triggerTmiBurn,
} from './simulation/missionEngine';
import type {
  CameraMode,
  ConsoleTab,
  CrewId,
  CrewSuitState,
  GravityMode,
  MissionPhase,
  MissionState,
  SwitchId,
} from './simulation/types';

const PHASE_LABELS: Record<MissionPhase, string> = {
  PRE_LAUNCH: 'Pad 39A · Pre-Launch',
  COUNTDOWN: 'Pad 39A · Ignition Countdown',
  ASCENT: 'Earth Ascent · Saturn-XI',
  TRANSIT: 'Deep Space Transit · Earth to Mars',
  DESCENT: 'Mars Entry & Powered Descent',
  MARS_SURFACE: 'Mars Surface · Jezero Crater',
};

const NAV_TABS: Array<{ id: ConsoleTab; label: string }> = [
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'crew', label: 'Crew & Suits' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'mars', label: 'Mars Surface' },
];

const CAMERA_OPTIONS: Array<{ id: CameraMode; label: string }> = [
  { id: 'exterior', label: 'Exterior Cam' },
  { id: 'window', label: 'Cockpit Window' },
  { id: 'cabin', label: 'Zero-G Cabin' },
  { id: 'mars', label: 'Mars Cam' },
];

export default function App() {
  const [mission, setMission] = useState<MissionState>(() => createInitialMissionState());
  const [viewportExpanded, setViewportExpanded] = useState(false);

  // Sync audio toggle to procedural synthesizer
  useEffect(() => {
    cockpitAudio.setEnabled(mission.audioEnabled);
  }, [mission.audioEnabled]);

  // Fixed 4 Hz simulation tick (decoupled from 60Hz Three.js canvas render loop!)
  useEffect(() => {
    const id = window.setInterval(() => {
      setMission((prev) => stepSimulation(prev, 0.25));
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  // Keyboard shortcut H to toggle full-screen 3D viewport inspection
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setViewportExpanded((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleToggleSwitch = useCallback((id: SwitchId) => {
    setMission((prev) => {
      const next = toggleSwitch(prev, id);
      cockpitAudio.playSwitchClick(next.switches[id]);
      return next;
    });
  }, []);

  const handleAutoPrep = useCallback(() => {
    cockpitAudio.playDeployChime();
    setMission((prev) => autoPrepChecklist(prev));
  }, []);

  const handleLaunch = useCallback(() => {
    cockpitAudio.playLaunchRumble();
    setMission((prev) => triggerLaunch(prev));
  }, []);

  const handleStageSep = useCallback(() => {
    cockpitAudio.playLaunchRumble();
    setMission((prev) => triggerStageSeparation(prev));
  }, []);

  const handleTmiBurn = useCallback(() => {
    cockpitAudio.playLaunchRumble();
    setMission((prev) => triggerTmiBurn(prev));
  }, []);

  const handleMarsDescent = useCallback(() => {
    cockpitAudio.playLaunchRumble();
    setMission((prev) => triggerMarsDescent(prev));
  }, []);

  const handleMarsTouchdown = useCallback(() => {
    cockpitAudio.playDeployChime();
    setMission((prev) => fastTrackMarsLanding(prev));
  }, []);

  const handleSetGravity = useCallback((mode: GravityMode) => {
    setMission((prev) => {
      const next = setAntigravityMode(prev, mode);
      cockpitAudio.playAntigravityShift(next.telemetry.gravityG);
      return next;
    });
  }, []);

  const handleSetThrottle = useCallback((pct: number) => {
    setMission((prev) => setThrottle(prev, pct));
  }, []);

  const handlePressDsky = useCallback((key: string) => {
    cockpitAudio.playDskyKey();
    setMission((prev) => pressDskyKey(prev, key));
  }, []);

  const handleDskyPreset = useCallback((verb: string, noun: string) => {
    cockpitAudio.playDskyKey();
    setMission((prev) => executeDskyCommand(prev, verb, noun));
  }, []);

  const handleToggleSuit = useCallback(
    (
      crewId: CrewId,
      control: keyof Pick<
        CrewSuitState,
        'helmetSealed' | 'goldVisorDown' | 'magBootsLocked' | 'evaActive'
      >,
    ) => {
      cockpitAudio.playSwitchClick(true);
      setMission((prev) => toggleCrewSuitControl(prev, crewId, control));
    },
    [],
  );

  const handleCrewTalk = useCallback((topic: CrewTopicId, focusCrewId?: CrewId) => {
    cockpitAudio.playCommsChirp();
    setMission((prev) => triggerCrewConversation(prev, topic, focusCrewId));
  }, []);

  const handleRunDiagnostic = useCallback((equipmentId: string) => {
    cockpitAudio.playDskyKey();
    setMission((prev) => runEquipmentDiagnostic(prev, equipmentId));
  }, []);

  const handleDeployEquipment = useCallback((equipmentId: string) => {
    cockpitAudio.playDeployChime();
    setMission((prev) => deployEquipment(prev, equipmentId));
  }, []);

  const handleSelectSector = useCallback((sectorId: string) => {
    setMission((prev) => selectMarsSector(prev, sectorId));
  }, []);

  const handleScanSector = useCallback((sectorId: string) => {
    cockpitAudio.playCommsChirp();
    setMission((prev) => scanMarsSector(prev, sectorId));
  }, []);

  const handleCollectSample = useCallback((sectorId: string) => {
    cockpitAudio.playDeployChime();
    setMission((prev) => collectMarsSample(prev, sectorId));
  }, []);

  const handlePrimaryHeaderAction = useCallback(() => {
    if (mission.phase === 'PRE_LAUNCH') {
      handleLaunch();
    } else if (mission.phase === 'ASCENT') {
      handleTmiBurn();
    } else if (mission.phase === 'TRANSIT') {
      handleMarsDescent();
    } else if (mission.phase === 'DESCENT') {
      handleMarsTouchdown();
    } else {
      cockpitAudio.playSwitchClick(false);
      setMission(createInitialMissionState());
    }
  }, [
    mission.phase,
    handleLaunch,
    handleTmiBurn,
    handleMarsDescent,
    handleMarsTouchdown,
  ]);

  const primaryActionLabel =
    mission.phase === 'PRE_LAUNCH'
      ? 'Launch Mission'
      : mission.phase === 'COUNTDOWN'
        ? `Ignition T-${Math.ceil(mission.telemetry.countdownSeconds)}s`
        : mission.phase === 'ASCENT'
          ? 'Trans-Mars Burn'
          : mission.phase === 'TRANSIT'
            ? 'Mars Descent'
            : mission.phase === 'DESCENT'
              ? 'Touchdown Mars'
              : 'Reset Mission';

  return (
    <div
      className="min-h-screen flex flex-col bg-[#07090E] text-slate-100"
      data-mission-phase={mission.phase}
    >
      {/* Top Bar: Clean 3-Zone Contract */}
      <header className="h-14 px-4 lg:px-6 border-b border-[#1E293B] bg-[#0B0F17] flex items-center justify-between gap-8 shrink-0">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setMission((prev) => setActiveTab(prev, 'cockpit'));
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          Apollo 11-M
        </a>

        {/* Zone 2: 4 Clean Single-Line Navigation Links */}
        <nav
          aria-label="Spacecraft stations"
          className="flex items-center gap-4 sm:gap-6 overflow-x-auto"
        >
          {NAV_TABS.map((tab) => {
            const active = mission.activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setViewportExpanded(false);
                  setMission((prev) => setActiveTab(prev, tab.id));
                }}
                className={`py-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Mission CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrimaryHeaderAction}
            disabled={mission.phase === 'COUNTDOWN'}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-600/60 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
          >
            {primaryActionLabel}
          </button>
        </div>
      </header>

      {/* Main Content: Live 3D Space Viewport + Main Computer Console */}
      <main className="flex-1 flex flex-col">
        {/* Live 3D Apollo 11-M & Mars Viewport */}
        <div
          className={`relative w-full border-b border-[#1E293B] bg-[#050811] transition-all duration-300 ${
            viewportExpanded ? 'h-[calc(100vh-56px)]' : 'h-[310px] lg:h-[335px]'
          }`}
        >
          {/* Isolated WebGL Canvas Mount */}
          <SpaceViewport3D mission={mission} />

          {/* Top-Left Crisp Telemetry Strip (solid dark surface — zero backdrop-blur over WebGL) */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 rounded-lg bg-[#07090E]/92 border border-[#243044] text-xs pointer-events-none">
            <div>
              <span className="text-slate-400 mr-1.5">Phase</span>
              <span className="font-display font-semibold text-amber-300">
                {PHASE_LABELS[mission.phase]}
              </span>
            </div>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <div className="font-mono-tabular">
              <span className="text-slate-400 mr-1">MET</span>
              <span className="text-slate-100">{formatMet(mission.telemetry.metSeconds)}</span>
            </div>
            <span aria-hidden="true" className="text-slate-600 hidden sm:inline">
              ·
            </span>
            <div className="font-mono-tabular hidden sm:block">
              <span className="text-slate-400 mr-1">ALT</span>
              <span className="text-slate-100">{mission.telemetry.altitudeKm.toFixed(1)} km</span>
            </div>
            <span aria-hidden="true" className="text-slate-600 hidden md:inline">
              ·
            </span>
            <div className="font-mono-tabular hidden md:block">
              <span className="text-slate-400 mr-1">VEL</span>
              <span className="text-slate-100">{mission.telemetry.velocityKms.toFixed(2)} km/s</span>
            </div>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <div className="font-mono-tabular">
              <span className="text-slate-400 mr-1">GRAV</span>
              <span className="text-cyan-300 font-semibold">
                {mission.telemetry.gravityG.toFixed(2)} G
              </span>
            </div>
          </div>

          {/* Bottom-Center Unified Viewport Dock (Camera Switcher + Audio + Expand) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#07090E]/94 border border-[#243044] max-w-[95vw] overflow-x-auto">
            <div className="flex items-center gap-1" role="group" aria-label="3D camera views">
              {CAMERA_OPTIONS.map((cam) => {
                const selected = mission.cameraMode === cam.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => setMission((prev) => setCameraMode(prev, cam.id))}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:bg-[#161E2E]'
                    }`}
                  >
                    {cam.label}
                  </button>
                );
              })}
            </div>

            <span className="w-px h-4 bg-[#243044] mx-1 shrink-0" aria-hidden="true" />

            <button
              type="button"
              onClick={() => setMission((prev) => toggleAudio(prev))}
              aria-label={mission.audioEnabled ? 'Mute cockpit audio' : 'Unmute cockpit audio'}
              className="p-1.5 rounded-md text-slate-300 hover:bg-[#161E2E] transition-colors shrink-0"
              title={mission.audioEnabled ? 'Audio On' : 'Audio Muted'}
            >
              {mission.audioEnabled ? (
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setViewportExpanded((v) => !v)}
              aria-label={viewportExpanded ? 'Show cockpit console' : 'Expand 3D viewport'}
              className="px-2 py-1 rounded-md text-xs text-slate-300 hover:bg-[#161E2E] flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              {viewportExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Console</span>
                  <ChevronUp className="w-3 h-3" aria-hidden="true" />
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Cinema</span>
                  <ChevronDown className="w-3 h-3" aria-hidden="true" />
                </>
              )}
            </button>

            {mission.phase !== 'PRE_LAUNCH' && (
              <button
                type="button"
                onClick={() => setMission(createInitialMissionState())}
                aria-label="Reset mission to Pad 39A"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-[#161E2E] transition-colors shrink-0"
                title="Reset Mission to Earth Pad 39A"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Lower Main Cockpit Computer Deck */}
        {!viewportExpanded && (
          <div className="flex-1 p-4 lg:p-5 max-w-[1440px] w-full mx-auto">
            {mission.activeTab === 'cockpit' && (
              <CockpitConsole
                mission={mission}
                onToggleSwitch={handleToggleSwitch}
                onAutoPrep={handleAutoPrep}
                onLaunch={handleLaunch}
                onStageSep={handleStageSep}
                onTmiBurn={handleTmiBurn}
                onMarsDescent={handleMarsDescent}
                onMarsTouchdown={handleMarsTouchdown}
                onSetGravity={handleSetGravity}
                onSetThrottle={handleSetThrottle}
                onPressDsky={handlePressDsky}
                onDskyPreset={handleDskyPreset}
                onCrewTalk={(topic) => handleCrewTalk(topic)}
                onSelectCamera={(mode) => setMission((prev) => setCameraMode(prev, mode))}
                onOpenMarsTab={() => setMission((prev) => setActiveTab(prev, 'mars'))}
              />
            )}

            {mission.activeTab === 'crew' && (
              <CrewDeck
                mission={mission}
                onSelectCrew={(id) => setMission((prev) => selectCrewMember(prev, id))}
                onToggleSuitControl={handleToggleSuit}
                onTriggerConversation={handleCrewTalk}
              />
            )}

            {mission.activeTab === 'equipment' && (
              <EquipmentBay
                mission={mission}
                onRunDiagnostic={handleRunDiagnostic}
                onDeployEquipment={handleDeployEquipment}
                onSwitchToMarsCamera={() => setMission((prev) => setCameraMode(prev, 'mars'))}
              />
            )}

            {mission.activeTab === 'mars' && (
              <MarsSurfaceDeck
                mission={mission}
                onSelectSector={handleSelectSector}
                onScanSector={handleScanSector}
                onCollectSample={handleCollectSample}
                onQuickLandMars={handleMarsTouchdown}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
