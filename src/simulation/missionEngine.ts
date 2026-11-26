import {
  COCKPIT_SWITCHES,
  INITIAL_CREW,
  INITIAL_EQUIPMENT,
  INITIAL_MARS_SECTORS,
  INITIAL_SWITCH_STATE,
  TOTAL_MARS_DISTANCE_KM,
  type CrewTopicId,
} from './missionData';
import type {
  CameraMode,
  CommsMessage,
  ConsoleTab,
  CrewId,
  CrewSuitState,
  GravityMode,
  MissionPhase,
  MissionState,
  SwitchId,
} from './types';

let msgCounter = 100;

export function formatMet(metSeconds: number): string {
  const safe = Math.max(0, Math.floor(metSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `T+${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function gravityValueForMode(mode: GravityMode, coreEnabled: boolean, phase: MissionPhase): number {
  if (phase === 'PRE_LAUNCH' || phase === 'COUNTDOWN') {
    return 1.0;
  }
  if (!coreEnabled) {
    return phase === 'MARS_SURFACE' ? 0.38 : 0.0;
  }
  if (mode === 'ZERO_G') return 0.0;
  if (mode === 'MARS_G') return 0.38;
  return 1.0;
}

export function calculatePowerLoadKw(
  switches: Record<SwitchId, boolean>,
  gravityMode: GravityMode,
  deployedEquipmentCount: number,
): number {
  let load = 8.4; // Base avionics & lighting bus
  for (const sw of COCKPIT_SWITCHES) {
    if (switches[sw.id]) {
      if (sw.id === 'antigravCore') {
        const mult = gravityMode === 'ZERO_G' ? 0.25 : gravityMode === 'MARS_G' ? 0.65 : 1.0;
        load += sw.powerDrawKw * mult;
      } else {
        load += sw.powerDrawKw;
      }
    }
  }
  load += deployedEquipmentCount * 1.4;
  return Number(load.toFixed(1));
}

function makeMessage(
  metSeconds: number,
  speakerId: CommsMessage['speakerId'],
  speakerName: string,
  callsign: string,
  text: string,
  category: CommsMessage['category'],
  targetName?: string,
): CommsMessage {
  msgCounter += 1;
  return {
    id: `msg-${msgCounter}`,
    timestampMet: formatMet(metSeconds),
    speakerId,
    speakerName,
    callsign,
    targetName,
    text,
    category,
  };
}

function appendComms(existing: CommsMessage[], added: CommsMessage[]): CommsMessage[] {
  const next = [...existing, ...added];
  return next.slice(-40);
}

export function createInitialMissionState(): MissionState {
  const switches = { ...INITIAL_SWITCH_STATE };
  const powerLoadKw = calculatePowerLoadKw(switches, 'EARTH_G', 0);

  return {
    phase: 'PRE_LAUNCH',
    gravityMode: 'EARTH_G',
    switches,
    telemetry: {
      metSeconds: 0,
      countdownSeconds: 6,
      altitudeKm: 0,
      velocityKms: 0,
      distanceToMarsKm: TOTAL_MARS_DISTANCE_KM,
      transitProgressPct: 0,
      fuelPct: 100,
      oxidizerPct: 100,
      reactorOutputKw: 85.0,
      powerLoadKw,
      cabinO2Pct: 99.4,
      cabinPressureKpa: 101.3,
      hullTempC: 22.0,
      gravityG: 1.0,
      throttlePct: 0,
      stage1Separated: false,
      tmiBurnComplete: false,
      sciencePoints: 0,
    },
    dsky: {
      prog: '01',
      verb: '06',
      noun: '62',
      reg1: '+00000',
      reg2: '+00000',
      reg3: '+00100',
      inputBuffer: '',
      inputTarget: null,
      statusText: 'PAD 39A STANDBY · COMPLETE LAUNCH CHECKLIST',
      lampTestActive: false,
    },
    crew: INITIAL_CREW.map((c) => ({ ...c, suit: { ...c.suit } })),
    comms: [
      makeMessage(
        0,
        'vance',
        'Cmdr. Elena Vance',
        'EAGLE-1',
        'Apollo 11-M is powered on Pad 39A. Marcus, verify AGC-XI alignment while Lukas runs the antigravity standby test.',
        'crew',
        'Maj. Marcus Chen',
      ),
      makeMessage(
        0,
        'chen',
        'Maj. Marcus Chen',
        'COLUMBIA-2',
        'Copy Commander. AGC-XI bus is crisp. Once we close Fuel Pressurization, Star Tracker, and Suit Integrity switches, we are green for liftoff.',
        'crew',
        'Cmdr. Elena Vance',
      ),
      makeMessage(
        0,
        'lindqvist',
        'Eng. Lukas Lindqvist',
        'GRAV-4',
        'Gravitic ring is spooled and holding steady. Ready to dial in 0.00 G or Mars 0.38 G the second we clear Earth atmosphere, Amara.',
        'gravity',
        'Dr. Amara Okafor',
      ),
      makeMessage(
        0,
        'okafor',
        'Dr. Amara Okafor',
        'JEZERO-3',
        'All eight Mars exploration payloads including Ares-IX Rover and the Deep-Core Drill are locked in Bay 2. Jezero Crater awaits.',
        'mars',
        'Eng. Lukas Lindqvist',
      ),
    ],
    equipment: INITIAL_EQUIPMENT.map((e) => ({ ...e })),
    marsSectors: INITIAL_MARS_SECTORS.map((s) => ({ ...s })),
    activeSectorId: INITIAL_MARS_SECTORS[0].id,
    samples: [],
    selectedCrewId: 'vance',
    activeTab: 'cockpit',
    cameraMode: 'exterior',
    audioEnabled: true,
    crewExchangeCount: 0,
  };
}

export function getRequiredLaunchSwitches(): SwitchId[] {
  return COCKPIT_SWITCHES.filter((s) => s.requiredForLaunch).map((s) => s.id);
}

export function getMissingLaunchSwitches(state: MissionState): SwitchId[] {
  return getRequiredLaunchSwitches().filter((id) => !state.switches[id]);
}

export function isReadyForLaunch(state: MissionState): boolean {
  return state.phase === 'PRE_LAUNCH' && getMissingLaunchSwitches(state).length === 0;
}

export function toggleSwitch(state: MissionState, switchId: SwitchId): MissionState {
  const nextVal = !state.switches[switchId];
  const switches = { ...state.switches, [switchId]: nextVal };
  const deployedCount = state.equipment.filter((e) => e.status === 'DEPLOYED').length;
  const gravityG = gravityValueForMode(state.gravityMode, switches.antigravCore, state.phase);
  const powerLoadKw = calculatePowerLoadKw(switches, state.gravityMode, deployedCount);

  const swDef = COCKPIT_SWITCHES.find((s) => s.id === switchId);
  const addedComms: CommsMessage[] = [];

  if (switchId === 'antigravCore') {
    addedComms.push(
      makeMessage(
        state.telemetry.metSeconds,
        'lindqvist',
        'Eng. Lukas Lindqvist',
        'GRAV-4',
        nextVal
          ? 'Antigravity ring core energized. Deck gravity bus stabilized and ready for G-profile selection.'
          : 'Antigravity core disengaged. Cabin transitioning to free-fall inertia—lock your mag-boots everyone.',
        'gravity',
        'All Crew',
      ),
    );
  } else if (switchId === 'crewSuitSeal') {
    addedComms.push(
      makeMessage(
        state.telemetry.metSeconds,
        'okafor',
        'Dr. Amara Okafor',
        'JEZERO-3',
        nextVal
          ? 'All four Mk-XI spacesuit seals confirmed airtight at 101.3 kPa. Visor optics clear.'
          : 'Suit umbilical seal bus moved to standby.',
        'crew',
        'Cmdr. Elena Vance',
      ),
    );
  } else if (swDef) {
    addedComms.push(
      makeMessage(
        state.telemetry.metSeconds,
        'agc',
        'AGC-XI Computer',
        'AGC-XI',
        `${swDef.label} (${swDef.shortCode}) switched ${nextVal ? 'ACTIVE' : 'STANDBY'}.`,
        'system',
      ),
    );
  }

  const crew =
    switchId === 'crewSuitSeal'
      ? state.crew.map((m) => ({
          ...m,
          suit: { ...m.suit, helmetSealed: nextVal },
        }))
      : state.crew;

  return {
    ...state,
    switches,
    crew,
    telemetry: {
      ...state.telemetry,
      gravityG,
      powerLoadKw,
    },
    comms: appendComms(state.comms, addedComms),
  };
}

export function autoPrepChecklist(state: MissionState): MissionState {
  const switches: Record<SwitchId, boolean> = {
    ...state.switches,
    fuelPress: true,
    lifeSupport: true,
    avionicsAgc: true,
    guidanceLock: true,
    crewSuitSeal: true,
    antigravCore: true,
    commsHighGain: true,
  };
  const deployedCount = state.equipment.filter((e) => e.status === 'DEPLOYED').length;
  const powerLoadKw = calculatePowerLoadKw(switches, state.gravityMode, deployedCount);
  const crew = state.crew.map((m) => ({
    ...m,
    suit: { ...m.suit, helmetSealed: true, magBootsLocked: true },
  }));

  return {
    ...state,
    switches,
    crew,
    telemetry: {
      ...state.telemetry,
      powerLoadKw,
    },
    dsky: {
      ...state.dsky,
      statusText: 'ALL LAUNCH BUSES GREEN · READY FOR IGNITION',
    },
    comms: appendComms(state.comms, [
      makeMessage(
        state.telemetry.metSeconds,
        'chen',
        'Maj. Marcus Chen',
        'COLUMBIA-2',
        'Auto-prep sequence complete. Fuel tanks pressurized, Star Tracker locked on Mars, and all four spacesuits sealed.',
        'crew',
        'Cmdr. Elena Vance',
      ),
      makeMessage(
        state.telemetry.metSeconds,
        'vance',
        'Cmdr. Elena Vance',
        'EAGLE-1',
        'Outstanding work, Marcus. Flight Director, Apollo 11-M is cleared for Launch Ignition.',
        'crew',
        'Maj. Marcus Chen',
      ),
    ]),
  };
}

export function triggerLaunch(state: MissionState): MissionState {
  if (state.phase !== 'PRE_LAUNCH') return state;
  const prepped = isReadyForLaunch(state) ? state : autoPrepChecklist(state);

  return {
    ...prepped,
    phase: 'COUNTDOWN',
    telemetry: {
      ...prepped.telemetry,
      countdownSeconds: 4,
      throttlePct: 25,
    },
    dsky: {
      ...prepped.dsky,
      prog: '11',
      verb: '16',
      noun: '62',
      statusText: 'IGNITION SEQUENCE START · SATURN-XI CORE ARMED',
    },
    comms: appendComms(prepped.comms, [
      makeMessage(
        prepped.telemetry.metSeconds,
        'flight',
        'Houston Mars Control',
        'CAPCOM',
        'Apollo 11-M, terminal count initiated. Main engines gimbaled and cleared for liftoff.',
        'system',
        'Cmdr. Elena Vance',
      ),
      makeMessage(
        prepped.telemetry.metSeconds,
        'vance',
        'Cmdr. Elena Vance',
        'EAGLE-1',
        'Roger Houston! Crew, visors secure and straps tight—we are going to Mars.',
        'crew',
        'All Crew',
      ),
    ]),
  };
}

export function triggerStageSeparation(state: MissionState): MissionState {
  if (state.phase !== 'ASCENT' || state.telemetry.stage1Separated) return state;

  return {
    ...state,
    telemetry: {
      ...state.telemetry,
      stage1Separated: true,
      altitudeKm: Math.max(state.telemetry.altitudeKm, 145),
      velocityKms: Math.max(state.telemetry.velocityKms, 7.8),
      fuelPct: Math.max(state.telemetry.fuelPct, 82),
      throttlePct: 85,
    },
    dsky: {
      ...state.dsky,
      prog: '15',
      statusText: 'STAGE 1 SEPARATED · UPPER PLASMA STAGE ACTIVE',
    },
    comms: appendComms(state.comms, [
      makeMessage(
        state.telemetry.metSeconds,
        'chen',
        'Maj. Marcus Chen',
        'COLUMBIA-2',
        'MECO confirmed! Explosive bolts fired—Saturn-XI booster clean separation. Upper plasma stage burning nominal.',
        'crew',
        'Cmdr. Elena Vance',
      ),
      makeMessage(
        state.telemetry.metSeconds,
        'lindqvist',
        'Eng. Lukas Lindqvist',
        'GRAV-4',
        'G-load dropping from 3.4 G. Antigravity ring ready to spin up as soon as we enter Trans-Mars Injection.',
        'gravity',
        'Maj. Marcus Chen',
      ),
    ]),
  };
}

export function triggerTmiBurn(state: MissionState): MissionState {
  if (state.phase !== 'ASCENT' && state.phase !== 'COUNTDOWN') return state;

  const gravityMode: GravityMode = 'ZERO_G';
  const gravityG = gravityValueForMode(gravityMode, state.switches.antigravCore, 'TRANSIT');
  const deployedCount = state.equipment.filter((e) => e.status === 'DEPLOYED').length;
  const powerLoadKw = calculatePowerLoadKw(state.switches, gravityMode, deployedCount);

  return {
    ...state,
    phase: 'TRANSIT',
    gravityMode,
    switches: {
      ...state.switches,
      solarShield: true,
      commsHighGain: true,
    },
    telemetry: {
      ...state.telemetry,
      stage1Separated: true,
      tmiBurnComplete: true,
      altitudeKm: 420,
      velocityKms: 14.8,
      throttlePct: 60,
      transitProgressPct: 12,
      distanceToMarsKm: Math.round(TOTAL_MARS_DISTANCE_KM * 0.88),
      gravityG,
      powerLoadKw,
    },
    dsky: {
      ...state.dsky,
      prog: '31',
      verb: '16',
      noun: '68',
      statusText: 'TRANS-MARS INJECTION COMPLETE · DEEP SPACE CRUISE',
    },
    comms: appendComms(state.comms, [
      makeMessage(
        state.telemetry.metSeconds,
        'vance',
        'Cmdr. Elena Vance',
        'EAGLE-1',
        'Trans-Mars Injection complete! Earth is shrinking astern. Engaging deep-space cruise and testing cabin Zero-G.',
        'crew',
        'All Crew',
      ),
      makeMessage(
        state.telemetry.metSeconds,
        'okafor',
        'Dr. Amara Okafor',
        'JEZERO-3',
        'My data tablet just floated off the console—zero gravity feels incredible! Lukas, switch us to 0.38 G Mars gravity when you want to start conditioning.',
        'gravity',
        'Eng. Lukas Lindqvist',
      ),
    ]),
  };
}

export function triggerMarsDescent(state: MissionState): MissionState {
  if (state.phase !== 'TRANSIT') return state;

  const switches: Record<SwitchId, boolean> = {
    ...state.switches,
    heatShield: true,
    retroThrusters: true,
  };
  const deployedCount = state.equipment.filter((e) => e.status === 'DEPLOYED').length;
  const gravityMode: GravityMode = 'MARS_G';
  const gravityG = gravityValueForMode(gravityMode, switches.antigravCore, 'DESCENT');

  return {
    ...state,
    phase: 'DESCENT',
    gravityMode,
    switches,
    telemetry: {
      ...state.telemetry,
      transitProgressPct: 98,
      distanceToMarsKm: 185,
      altitudeKm: 120,
      velocityKms: 5.4,
      throttlePct: 75,
      hullTempC: 680,
      gravityG,
      powerLoadKw: calculatePowerLoadKw(switches, gravityMode, deployedCount),
    },
    dsky: {
      ...state.dsky,
      prog: '63',
      verb: '16',
      noun: '68',
      statusText: 'MARS ENTRY INTERFACE · JEZERO CRATER APPROACH',
    },
    comms: appendComms(state.comms, [
      makeMessage(
        state.telemetry.metSeconds,
        'chen',
        'Maj. Marcus Chen',
        'COLUMBIA-2',
        'Entry interface over Jezero Crater! Ablative heat shield locked and retro-braking thrusters armed.',
        'mars',
        'Cmdr. Elena Vance',
      ),
      makeMessage(
        state.telemetry.metSeconds,
        'vance',
        'Cmdr. Elena Vance',
        'EAGLE-1',
        'Crew, lock helmets and lower gold visors for atmospheric braking. Preparing for powered touchdown.',
        'crew',
        'All Crew',
      ),
    ]),
  };
}

export function triggerMarsTouchdown(state: MissionState): MissionState {
  if (state.phase !== 'DESCENT' && state.phase !== 'TRANSIT') return state;

  const gravityMode: GravityMode = 'MARS_G';
  const deployedCount = state.equipment.filter((e) => e.status === 'DEPLOYED').length;
  const crew = state.crew.map((m) => ({
    ...m,
    suit: {
      ...m.suit,
      helmetSealed: true,
      goldVisorDown: true,
      magBootsLocked: true,
    },
  }));

  return {
    ...state,
    phase: 'MARS_SURFACE',
    gravityMode,
    cameraMode: 'mars',
    crew,
    telemetry: {
      ...state.telemetry,
      transitProgressPct: 100,
      distanceToMarsKm: 0,
      altitudeKm: 0,
      velocityKms: 0,
      throttlePct: 0,
      hullTempC: -42,
      gravityG: 0.38,
      powerLoadKw: calculatePowerLoadKw(state.switches, gravityMode, deployedCount),
      sciencePoints: state.telemetry.sciencePoints + 25,
    },
    dsky: {
      ...state.dsky,
      prog: '75',
      verb: '16',
      noun: '75',
      statusText: 'JEZERO BASE TRANQUILITY · APOLLO 11-M HAS LANDED',
    },
    comms: appendComms(state.comms, [
      makeMessage(
        state.telemetry.metSeconds,
        'vance',
        'Cmdr. Elena Vance',
        'EAGLE-1',
        'Contact light! Engine stop. Houston, Jezero Base here—Apollo 11-M has landed on Mars!',
        'mars',
        'Houston Mars Control',
      ),
      makeMessage(
        state.telemetry.metSeconds,
        'okafor',
        'Dr. Amara Okafor',
        'JEZERO-3',
        'Look at those layered river delta cliffs out the forward window! Lukas, open Equipment Bay 2 so we can roll out the Ares-IX Rover and Core Drill.',
        'mars',
        'Eng. Lukas Lindqvist',
      ),
      makeMessage(
        state.telemetry.metSeconds,
        'lindqvist',
        'Eng. Lukas Lindqvist',
        'GRAV-4',
        'Landing struts locked solid on Martian regolith. Natural 0.38 G outside—Equipment Bay is unlocked and ready for surface deployment.',
        'mars',
        'Dr. Amara Okafor',
      ),
    ]),
  };
}

export function fastTrackMarsLanding(state: MissionState): MissionState {
  if (state.phase === 'MARS_SURFACE') return state;
  const prepped = state.phase === 'PRE_LAUNCH' ? triggerLaunch(autoPrepChecklist(state)) : state;
  const inTransit =
    prepped.phase === 'COUNTDOWN' || prepped.phase === 'ASCENT'
      ? triggerTmiBurn(prepped)
      : prepped;
  return triggerMarsTouchdown(inTransit);
}

export function setAntigravityMode(state: MissionState, mode: GravityMode): MissionState {
  const switches = { ...state.switches, antigravCore: true };
  const gravityG = gravityValueForMode(mode, true, state.phase);
  const deployedCount = state.equipment.filter((e) => e.status === 'DEPLOYED').length;
  const powerLoadKw = calculatePowerLoadKw(switches, mode, deployedCount);

  const labelMap: Record<GravityMode, string> = {
    ZERO_G: '0.00 G Zero-Gravity Free-Float',
    MARS_G: '0.38 G Mars Acclimation Field',
    EARTH_G: '1.00 G Earth Standard Deck Field',
  };

  const crewReplies: CommsMessage[] =
    mode === 'ZERO_G'
      ? [
          makeMessage(
            state.telemetry.metSeconds,
            'lindqvist',
            'Eng. Lukas Lindqvist',
            'GRAV-4',
            'Antigravity field nulled to 0.00 G. Cabin tools and unsecured gear are now free-floating—watch your elbows, Marcus.',
            'gravity',
            'Maj. Marcus Chen',
          ),
          makeMessage(
            state.telemetry.metSeconds,
            'chen',
            'Maj. Marcus Chen',
            'COLUMBIA-2',
            'Ha, my Apollo wrench just drifted right across the DSKY! Mag-boots engaged—feels great to stretch out in microgravity.',
            'gravity',
            'Eng. Lukas Lindqvist',
          ),
        ]
      : mode === 'MARS_G'
        ? [
            makeMessage(
              state.telemetry.metSeconds,
              'lindqvist',
              'Eng. Lukas Lindqvist',
              'GRAV-4',
              'Gravitic ring tuned to 0.38 G Mars gravity. Ideal conditioning for our Jezero Crater EVA hikes, Amara.',
              'gravity',
              'Dr. Amara Okafor',
            ),
            makeMessage(
              state.telemetry.metSeconds,
              'okafor',
              'Dr. Amara Okafor',
              'JEZERO-3',
              'Much better—my Mk-XI spacesuit feels nearly weightless while keeping my lab instruments planted firmly on the bench.',
              'gravity',
              'Eng. Lukas Lindqvist',
            ),
          ]
        : [
            makeMessage(
              state.telemetry.metSeconds,
              'lindqvist',
              'Eng. Lukas Lindqvist',
              'GRAV-4',
              'Full 1.00 G Earth artificial gravity engaged across the Command Module deck.',
              'gravity',
              'Cmdr. Elena Vance',
            ),
            makeMessage(
              state.telemetry.metSeconds,
              'vance',
              'Cmdr. Elena Vance',
              'EAGLE-1',
              'Smooth transition Lukas. Everything settled cleanly back to the deck plates.',
              'gravity',
              'Eng. Lukas Lindqvist',
            ),
          ];

  return {
    ...state,
    gravityMode: mode,
    switches,
    telemetry: {
      ...state.telemetry,
      gravityG,
      powerLoadKw,
    },
    dsky: {
      ...state.dsky,
      statusText: `ANTIGRAVITY CORE · ${labelMap[mode].toUpperCase()}`,
    },
    comms: appendComms(state.comms, crewReplies),
  };
}

export function setThrottle(state: MissionState, throttlePct: number): MissionState {
  const clamped = Math.max(0, Math.min(100, Math.round(throttlePct)));
  return {
    ...state,
    telemetry: {
      ...state.telemetry,
      throttlePct: clamped,
    },
  };
}

export function stepSimulation(state: MissionState, dtSeconds: number): MissionState {
  const dt = Math.max(0, Math.min(dtSeconds, 2));
  if (dt === 0) return state;

  const t = { ...state.telemetry };
  let phase = state.phase;
  let dsky = { ...state.dsky };
  let comms = state.comms;

  const moxieDeployed = state.equipment.some((e) => e.id === 'moxie-o2' && e.status === 'DEPLOYED');

  if (phase !== 'PRE_LAUNCH') {
    t.metSeconds += dt;
  }

  if (phase === 'COUNTDOWN') {
    t.countdownSeconds = Math.max(0, t.countdownSeconds - dt);
    t.throttlePct = Math.min(100, 25 + (4 - t.countdownSeconds) * 20);
    if (t.countdownSeconds <= 0) {
      phase = 'ASCENT';
      t.throttlePct = 100;
      t.altitudeKm = 0.2;
      t.velocityKms = 0.4;
      dsky = {
        ...dsky,
        prog: '11',
        statusText: 'LIFTOFF! APOLLO 11-M CLEARED LAUNCH TOWER',
      };
      comms = appendComms(comms, [
        makeMessage(
          t.metSeconds,
          'vance',
          'Cmdr. Elena Vance',
          'EAGLE-1',
          'Liftoff! We have cleared Pad 39A tower. Roll program initiated—all five Saturn-XI engines roaring!',
          'crew',
          'Houston Mars Control',
        ),
        makeMessage(
          t.metSeconds,
          'chen',
          'Maj. Marcus Chen',
          'COLUMBIA-2',
          'Pitch and yaw nominal. Passing Max-Q shortly—stand by for Stage 1 Separation.',
          'crew',
          'Cmdr. Elena Vance',
        ),
      ]);
    }
  } else if (phase === 'ASCENT') {
    const accelFactor = (t.throttlePct / 100) * (t.stage1Separated ? 1.35 : 1.0);
    t.altitudeKm = Math.min(420, Number((t.altitudeKm + dt * 16.5 * accelFactor).toFixed(1)));
    t.velocityKms = Math.min(11.4, Number((t.velocityKms + dt * 0.62 * accelFactor).toFixed(2)));
    t.fuelPct = Math.max(15, Number((t.fuelPct - dt * 0.55 * accelFactor).toFixed(1)));
    t.oxidizerPct = Math.max(18, Number((t.oxidizerPct - dt * 0.5 * accelFactor).toFixed(1)));
    t.hullTempC = Number((22 + Math.min(180, t.velocityKms * 22)).toFixed(1));
    t.gravityG = Number((1.0 + accelFactor * 2.2).toFixed(2));
  } else if (phase === 'TRANSIT') {
    const cruiseRate = 0.75 + (t.throttlePct / 100) * 1.45;
    t.transitProgressPct = Math.min(99, Number((t.transitProgressPct + dt * cruiseRate).toFixed(1)));
    t.distanceToMarsKm = Math.max(
      1200,
      Math.round(TOTAL_MARS_DISTANCE_KM * (1 - t.transitProgressPct / 100)),
    );
    t.velocityKms = Number((14.2 + (t.throttlePct / 100) * 6.8).toFixed(2));
    t.fuelPct = Math.max(25, Number((t.fuelPct - dt * 0.08 * (t.throttlePct / 100)).toFixed(1)));
    t.hullTempC = state.switches.solarShield ? -35.0 : 12.0;
    t.gravityG = gravityValueForMode(state.gravityMode, state.switches.antigravCore, 'TRANSIT');
  } else if (phase === 'DESCENT') {
    const brakeRate = state.switches.retroThrusters ? 14.5 : 8.0;
    t.altitudeKm = Math.max(0.5, Number((t.altitudeKm - dt * brakeRate).toFixed(1)));
    t.velocityKms = Math.max(0.08, Number((t.velocityKms - dt * 0.65).toFixed(2)));
    t.distanceToMarsKm = Math.round(t.altitudeKm);
    t.hullTempC = Number(Math.max(-38, 680 * (t.altitudeKm / 120)).toFixed(1));
    t.gravityG = Number((0.38 + (t.velocityKms / 5.4) * 1.8).toFixed(2));
    if (t.altitudeKm <= 1.0) {
      return triggerMarsTouchdown({ ...state, telemetry: t, dsky, comms });
    }
  } else if (phase === 'MARS_SURFACE') {
    t.gravityG = 0.38;
    t.hullTempC = -42.0;
    if (moxieDeployed) {
      t.cabinO2Pct = Math.min(100, Number((t.cabinO2Pct + dt * 0.15).toFixed(1)));
    }
  }

  // Update live DSKY telemetry registers
  dsky.reg1 = `+${String(Math.round(t.altitudeKm * 10)).padStart(5, '0')}`;
  dsky.reg2 = `+${String(Math.round(t.velocityKms * 100)).padStart(5, '0')}`;
  dsky.reg3 = `+${String(Math.round(t.gravityG * 100)).padStart(5, '0')}`;

  return {
    ...state,
    phase,
    telemetry: t,
    dsky,
    comms,
  };
}

export function pressDskyKey(state: MissionState, key: string): MissionState {
  const dsky = { ...state.dsky, lampTestActive: false };

  if (key === 'VERB') {
    dsky.inputTarget = 'verb';
    dsky.inputBuffer = '';
    dsky.statusText = 'ENTER 2-DIGIT VERB CODE THEN PRESS ENTR';
    return { ...state, dsky };
  }
  if (key === 'NOUN') {
    dsky.inputTarget = 'noun';
    dsky.inputBuffer = '';
    dsky.statusText = 'ENTER 2-DIGIT NOUN CODE THEN PRESS ENTR';
    return { ...state, dsky };
  }
  if (key === 'CLR') {
    dsky.inputBuffer = '';
    dsky.statusText = 'AGC-XI INPUT BUFFER CLEARED';
    return { ...state, dsky };
  }
  if (/^[0-9]$/.test(key)) {
    const target = dsky.inputTarget ?? 'verb';
    const nextBuf = (dsky.inputBuffer + key).slice(-2);
    dsky.inputTarget = target;
    dsky.inputBuffer = nextBuf;
    if (target === 'verb') dsky.verb = nextBuf.padStart(2, '0');
    else dsky.noun = nextBuf.padStart(2, '0');
    return { ...state, dsky };
  }
  if (key === 'ENTR') {
    return executeDskyCommand(state, dsky.verb, dsky.noun);
  }
  return { ...state, dsky };
}

export function executeDskyCommand(state: MissionState, verb: string, noun: string): MissionState {
  const v = verb.padStart(2, '0');
  const n = noun.padStart(2, '0');

  if (v === '35' && n === '00') {
    return {
      ...state,
      dsky: {
        ...state.dsky,
        verb: v,
        noun: n,
        inputTarget: null,
        inputBuffer: '',
        lampTestActive: true,
        statusText: 'V35 N00 · AGC-XI LAMP & BUS SELF-TEST NOMINAL',
      },
      comms: appendComms(state.comms, [
        makeMessage(
          state.telemetry.metSeconds,
          'agc',
          'AGC-XI Computer',
          'AGC-XI',
          'Verb 35 Noun 00 executed: All optical logic gates and annunciator lamps verified nominal.',
          'system',
        ),
      ]),
    };
  }

  if (v === '37' && n === '01') {
    const prepped = state.phase === 'PRE_LAUNCH' ? autoPrepChecklist(state) : state;
    return {
      ...prepped,
      dsky: {
        ...prepped.dsky,
        prog: '01',
        verb: v,
        noun: n,
        inputTarget: null,
        inputBuffer: '',
        statusText: 'P01 ALIGNMENT LOCKED · MARS EPHEMERIS SYNCHRONIZED',
      },
    };
  }

  if (v === '21' && n === '42') {
    const nextGravity: GravityMode =
      state.gravityMode === 'ZERO_G'
        ? 'MARS_G'
        : state.gravityMode === 'MARS_G'
          ? 'EARTH_G'
          : 'ZERO_G';
    const updated = setAntigravityMode(state, nextGravity);
    return {
      ...updated,
      dsky: {
        ...updated.dsky,
        prog: '42',
        verb: v,
        noun: n,
        inputTarget: null,
        inputBuffer: '',
      },
    };
  }

  return {
    ...state,
    dsky: {
      ...state.dsky,
      verb: v,
      noun: n,
      inputTarget: null,
      inputBuffer: '',
      statusText: `V${v} N${n} EXECUTED · TELEMETRY REGISTER MONITOR ACTIVE`,
    },
    comms: appendComms(state.comms, [
      makeMessage(
        state.telemetry.metSeconds,
        'chen',
        'Maj. Marcus Chen',
        'COLUMBIA-2',
        `AGC-XI accepted Verb ${v} Noun ${n}. Flight bus monitoring Altitude ${state.telemetry.altitudeKm.toFixed(1)} km and ${state.telemetry.gravityG.toFixed(2)} G.`,
        'system',
      ),
    ]),
  };
}

export function toggleCrewSuitControl(
  state: MissionState,
  crewId: CrewId,
  control: keyof Pick<CrewSuitState, 'helmetSealed' | 'goldVisorDown' | 'magBootsLocked' | 'evaActive'>,
): MissionState {
  const targetMember = state.crew.find((c) => c.id === crewId);
  if (!targetMember) return state;

  const nextVal = !targetMember.suit[control];
  const crew = state.crew.map((member) => {
    if (member.id !== crewId) return member;
    return {
      ...member,
      suit: {
        ...member.suit,
        [control]: nextVal,
        pressureKpa: control === 'helmetSealed' ? (nextVal ? 101.3 : 98.6) : member.suit.pressureKpa,
        suitTempC: control === 'goldVisorDown' ? (nextVal ? 20.4 : 21.8) : member.suit.suitTempC,
      },
    };
  });

  const labelMap: Record<typeof control, string> = {
    helmetSealed: nextVal ? 'sealed helmet visor ring airtight' : 'unlatched helmet collar for cabin air',
    goldVisorDown: nextVal ? 'lowered gold solar thermal visor' : 'raised gold solar visor for clear optics',
    magBootsLocked: nextVal ? 'locked electromagnetic deck boots' : 'released magnetic boots for free movement',
    evaActive: nextVal ? 'activated EVA surface tether pack' : 'returned to cabin umbilical bus',
  };

  const buddy = state.crew.find((c) => c.id !== crewId) ?? state.crew[0];
  const added: CommsMessage[] = [
    makeMessage(
      state.telemetry.metSeconds,
      targetMember.id,
      targetMember.name,
      targetMember.callsign,
      `Suit update: I have ${labelMap[control]}. Pressure steady at ${nextVal && control === 'helmetSealed' ? '101.3' : targetMember.suit.pressureKpa.toFixed(1)} kPa.`,
      'crew',
      buddy.name,
    ),
  ];

  if (control === 'magBootsLocked' && !nextVal && state.telemetry.gravityG < 0.1) {
    added.push(
      makeMessage(
        state.telemetry.metSeconds,
        buddy.id,
        buddy.name,
        buddy.callsign,
        `Careful ${targetMember.name.split(' ')[1]}, we are in 0.00 G right now—grab the overhead rail before you float into the avionics bay!`,
        'gravity',
        targetMember.name,
      ),
    );
  }

  return {
    ...state,
    crew,
    comms: appendComms(state.comms, added),
  };
}

export function triggerCrewConversation(
  state: MissionState,
  topicId: CrewTopicId,
  focusCrewId?: CrewId,
): MissionState {
  const met = state.telemetry.metSeconds;
  const phase = state.phase;
  const gText = `${state.telemetry.gravityG.toFixed(2)} G`;
  const deployedCount = state.equipment.filter((e) => e.status === 'DEPLOYED').length;

  let lines: CommsMessage[] = [];

  if (topicId === 'systems-check') {
    lines = [
      makeMessage(
        met,
        'vance',
        'Cmdr. Elena Vance',
        'EAGLE-1',
        `Crew roll call for ${phase.replace('_', ' ')} phase. Marcus, how is our Apollo AGC-XI flight computer holding up?`,
        'crew',
        'Maj. Marcus Chen',
      ),
      makeMessage(
        met,
        'chen',
        'Maj. Marcus Chen',
        'COLUMBIA-2',
        `AGC-XI is running cool at ${state.telemetry.powerLoadKw.toFixed(1)} kW load, Commander. Fuel reserves at ${state.telemetry.fuelPct.toFixed(0)}%. Lukas, status on cabin gravity?`,
        'crew',
        'Eng. Lukas Lindqvist',
      ),
      makeMessage(
        met,
        'lindqvist',
        'Eng. Lukas Lindqvist',
        'GRAV-4',
        `Deck field reads ${gText} with zero harmonic drift. Amara, are the Mars science racks green?`,
        'gravity',
        'Dr. Amara Okafor',
      ),
      makeMessage(
        met,
        'okafor',
        'Dr. Amara Okafor',
        'JEZERO-3',
        `Spectro-Bio Lab and Core Drill diagnostics are green. ${deployedCount > 0 ? `${deployedCount} equipment units are already active on Mars!` : 'Ready to deploy upon touchdown in Jezero Crater.'}`,
        'mars',
        'Cmdr. Elena Vance',
      ),
    ];
  } else if (topicId === 'antigravity-talk') {
    lines = [
      makeMessage(
        met,
        'lindqvist',
        'Eng. Lukas Lindqvist',
        'GRAV-4',
        `Running superconducting ring diagnostics at ${gText}. Honestly, the original 1969 Apollo 11 crew would not believe we have toggleable cabin gravity.`,
        'gravity',
        'Dr. Amara Okafor',
      ),
      makeMessage(
        met,
        'okafor',
        'Dr. Amara Okafor',
        'JEZERO-3',
        state.telemetry.gravityG < 0.1
          ? 'And yet right now we are floating in 0.00 G! My centrifuge samples love zero gravity, even if Elena keeps chasing her checklist clipboard.'
          : `Dialing into ${gText} prevents bone loss across deep space and keeps our Mars acclimation right on schedule.`,
        'gravity',
        'Cmdr. Elena Vance',
      ),
      makeMessage(
        met,
        'vance',
        'Cmdr. Elena Vance',
        'EAGLE-1',
        'That clipboard has sentimental value, Amara. Keep the gravitic ring humming, Lukas—we need sharp reflexes for Jezero Crater.',
        'crew',
        'Eng. Lukas Lindqvist',
      ),
    ];
  } else if (topicId === 'suit-check') {
    const sealedCount = state.crew.filter((c) => c.suit.helmetSealed).length;
    lines = [
      makeMessage(
        met,
        'okafor',
        'Dr. Amara Okafor',
        'JEZERO-3',
        `Running Mk-XI spacesuit buddy check: ${sealedCount} of 4 helmets currently sealed airtight. Marcus, verify your gold solar visor latch.`,
        'crew',
        'Maj. Marcus Chen',
      ),
      makeMessage(
        met,
        'chen',
        'Maj. Marcus Chen',
        'COLUMBIA-2',
        'Latch is solid, Amara—gold thermal coating drops cockpit solar glare immediately and shields us from Martian UV.',
        'crew',
        'Dr. Amara Okafor',
      ),
      makeMessage(
        met,
        'vance',
        'Cmdr. Elena Vance',
        'EAGLE-1',
        'Good copy. Every astronaut stays suit-ready from Earth Pad 39A all the way to the Jezero river delta.',
        'crew',
        'All Crew',
      ),
    ];
  } else {
    const scannedCount = state.marsSectors.filter((s) => s.scanned).length;
    lines = [
      makeMessage(
        met,
        'okafor',
        'Dr. Amara Okafor',
        'JEZERO-3',
        phase === 'MARS_SURFACE'
          ? `We have scanned ${scannedCount} of 4 Jezero Crater sectors and logged ${state.samples.length} core samples. Let's push the Ares-IX Rover toward the subsurface ice shelf next.`
          : 'Once Apollo 11-M touches down in Jezero Crater, our priority is deploying the Ares-IX Rover, Deep-Core Drill, and MOXIE oxygen plant.',
        'mars',
        'Cmdr. Elena Vance',
      ),
      makeMessage(
        met,
        'lindqvist',
        'Eng. Lukas Lindqvist',
        'GRAV-4',
        'Agreed—the MOXIE-IV plant will pull CO2 straight out of the Martian sky and keep our habitat O2 reserves topped at 100%.',
        'mars',
        'Dr. Amara Okafor',
      ),
      makeMessage(
        met,
        'chen',
        'Maj. Marcus Chen',
        'COLUMBIA-2',
        'And once the Quantum Relay Dish unfolds, Earth will receive live 4K geological feeds from our Mars outpost.',
        'mars',
        'All Crew',
      ),
    ];
  }

  return {
    ...state,
    selectedCrewId: focusCrewId ?? state.selectedCrewId,
    crewExchangeCount: state.crewExchangeCount + 1,
    comms: appendComms(state.comms, lines),
  };
}

export function runEquipmentDiagnostic(state: MissionState, equipmentId: string): MissionState {
  const item = state.equipment.find((e) => e.id === equipmentId);
  if (!item) return state;

  const equipment = state.equipment.map((e) =>
    e.id === equipmentId && e.status === 'STOWED' ? { ...e, status: 'CHECKED' as const } : e,
  );

  return {
    ...state,
    equipment,
    comms: appendComms(state.comms, [
      makeMessage(
        state.telemetry.metSeconds,
        'lindqvist',
        'Eng. Lukas Lindqvist',
        'GRAV-4',
        `Diagnostics complete on ${item.name} (${item.code}): ${item.diagnosticNote}`,
        'system',
        'Dr. Amara Okafor',
      ),
    ]),
  };
}

export function deployEquipment(state: MissionState, equipmentId: string): MissionState {
  const item = state.equipment.find((e) => e.id === equipmentId);
  if (!item || item.status === 'DEPLOYED') return state;

  if (item.requiresMarsSurface && state.phase !== 'MARS_SURFACE') {
    return {
      ...state,
      comms: appendComms(state.comms, [
        makeMessage(
          state.telemetry.metSeconds,
          'lindqvist',
          'Eng. Lukas Lindqvist',
          'GRAV-4',
          `${item.name} is pre-checked and armed in Bay 2, but deployment requires touchdown on Mars surface first.`,
          'mars',
          'Cmdr. Elena Vance',
        ),
      ]),
    };
  }

  const equipment = state.equipment.map((e) =>
    e.id === equipmentId ? { ...e, status: 'DEPLOYED' as const } : e,
  );
  const deployedCount = equipment.filter((e) => e.status === 'DEPLOYED').length;
  const powerLoadKw = calculatePowerLoadKw(state.switches, state.gravityMode, deployedCount);
  const scienceBonus = item.category === 'Science' ? 25 : 15;

  return {
    ...state,
    equipment,
    telemetry: {
      ...state.telemetry,
      powerLoadKw,
      sciencePoints: state.telemetry.sciencePoints + scienceBonus,
      cabinO2Pct:
        item.id === 'moxie-o2' ? 100 : state.telemetry.cabinO2Pct,
    },
    comms: appendComms(state.comms, [
      makeMessage(
        state.telemetry.metSeconds,
        'lindqvist',
        'Eng. Lukas Lindqvist',
        'GRAV-4',
        `${item.name} (${item.code}) deployed and drawing ${item.powerKw.toFixed(1)} kW. All surface telemetry links green.`,
        'mars',
        'Dr. Amara Okafor',
      ),
      makeMessage(
        state.telemetry.metSeconds,
        'okafor',
        'Dr. Amara Okafor',
        'JEZERO-3',
        `Receiving clean data from ${item.name}! Jezero science yield up by +${scienceBonus} pts.`,
        'mars',
        'Eng. Lukas Lindqvist',
      ),
    ]),
  };
}

export function selectMarsSector(state: MissionState, sectorId: string): MissionState {
  if (!state.marsSectors.some((s) => s.id === sectorId)) return state;
  return {
    ...state,
    activeSectorId: sectorId,
  };
}

export function scanMarsSector(state: MissionState, sectorId: string): MissionState {
  const sector = state.marsSectors.find((s) => s.id === sectorId);
  if (!sector) return state;

  if (state.phase !== 'MARS_SURFACE') {
    return {
      ...state,
      comms: appendComms(state.comms, [
        makeMessage(
          state.telemetry.metSeconds,
          'okafor',
          'Dr. Amara Okafor',
          'JEZERO-3',
          `Orbital preview logged for ${sector.name}. Land Apollo 11-M on Mars to run high-resolution surface lidar and rover scans.`,
          'mars',
          'Cmdr. Elena Vance',
        ),
      ]),
    };
  }

  const alreadyScanned = sector.scanned;
  const marsSectors = state.marsSectors.map((s) =>
    s.id === sectorId ? { ...s, scanned: true } : s,
  );
  const roverDeployed = state.equipment.some((e) => e.id === 'rover-ares' && e.status === 'DEPLOYED');
  const points = alreadyScanned ? 0 : roverDeployed ? 35 : 20;

  return {
    ...state,
    activeSectorId: sectorId,
    marsSectors,
    telemetry: {
      ...state.telemetry,
      sciencePoints: state.telemetry.sciencePoints + points,
    },
    comms: appendComms(state.comms, [
      makeMessage(
        state.telemetry.metSeconds,
        'okafor',
        'Dr. Amara Okafor',
        'JEZERO-3',
        `${roverDeployed ? 'Ares-IX Rover lidar sweep' : 'EVA suit spectral scan'} complete at ${sector.name}: detected ${sector.mineralSignature}.`,
        'mars',
        'Cmdr. Elena Vance',
      ),
    ]),
  };
}

export function collectMarsSample(state: MissionState, sectorId: string): MissionState {
  if (state.phase !== 'MARS_SURFACE') return state;
  const sector = state.marsSectors.find((s) => s.id === sectorId);
  if (!sector || sector.sampleCollected) return state;

  const drillDeployed = state.equipment.some((e) => e.id === 'core-drill' && e.status === 'DEPLOYED');
  const labDeployed = state.equipment.some((e) => e.id === 'spectro-lab' && e.status === 'DEPLOYED');

  const marsSectors = state.marsSectors.map((s) =>
    s.id === sectorId ? { ...s, scanned: true, sampleCollected: true } : s,
  );

  const finding =
    sector.sampleType === 'Biosignature'
      ? 'Organic carbon chain traces preserved inside ancient carbonate mudstone.'
      : sector.sampleType === 'Ice Core'
        ? '94.2% pure subsurface water-ice suitable for colony hydrogen fuel & drinking water.'
        : sector.sampleType === 'Sedimentary'
          ? 'Layered sulfate veins confirming multi-million-year flowing surface rivers.'
          : 'Unweathered olivine basalt revealing early Martian mantle volcanism.';

  const newSample = {
    id: `sample-${state.samples.length + 1}`,
    sectorId: sector.id,
    sectorName: sector.name,
    sampleName: sector.sampleName,
    sampleType: sector.sampleType,
    collectedAtMet: formatMet(state.telemetry.metSeconds),
    analyzed: labDeployed,
    finding,
  };

  const bonus = (drillDeployed ? 45 : 30) + (labDeployed ? 15 : 0);

  return {
    ...state,
    activeSectorId: sectorId,
    marsSectors,
    samples: [newSample, ...state.samples],
    telemetry: {
      ...state.telemetry,
      sciencePoints: state.telemetry.sciencePoints + bonus,
    },
    comms: appendComms(state.comms, [
      makeMessage(
        state.telemetry.metSeconds,
        'okafor',
        'Dr. Amara Okafor',
        'JEZERO-3',
        `Extracted ${sector.sampleName} from ${sector.name}! ${finding}`,
        'mars',
        'Cmdr. Elena Vance',
      ),
      makeMessage(
        state.telemetry.metSeconds,
        'vance',
        'Cmdr. Elena Vance',
        'EAGLE-1',
        `Historic discovery, Amara! Sample logged in Apollo 11-M return vault (+${bonus} Science).`,
        'mars',
        'Dr. Amara Okafor',
      ),
    ]),
  };
}

export function setActiveTab(state: MissionState, tab: ConsoleTab): MissionState {
  return { ...state, activeTab: tab };
}

export function setCameraMode(state: MissionState, cameraMode: CameraMode): MissionState {
  return { ...state, cameraMode };
}

export function selectCrewMember(state: MissionState, crewId: CrewId): MissionState {
  return { ...state, selectedCrewId: crewId };
}

export function toggleAudio(state: MissionState): MissionState {
  return { ...state, audioEnabled: !state.audioEnabled };
}
