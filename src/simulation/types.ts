export type MissionPhase =
  | 'PRE_LAUNCH'
  | 'COUNTDOWN'
  | 'ASCENT'
  | 'TRANSIT'
  | 'DESCENT'
  | 'MARS_SURFACE';

export type ConsoleTab = 'cockpit' | 'crew' | 'equipment' | 'mars';

export type CameraMode = 'window' | 'exterior' | 'cabin' | 'mars';

export type GravityMode = 'ZERO_G' | 'MARS_G' | 'EARTH_G';

export type SwitchId =
  | 'fuelPress'
  | 'lifeSupport'
  | 'avionicsAgc'
  | 'guidanceLock'
  | 'crewSuitSeal'
  | 'antigravCore'
  | 'solarShield'
  | 'heatShield'
  | 'retroThrusters'
  | 'commsHighGain';

export interface CockpitSwitchDef {
  id: SwitchId;
  label: string;
  shortCode: string;
  group: 'Propulsion' | 'Life & Suit' | 'Guidance' | 'Defense';
  requiredForLaunch: boolean;
  powerDrawKw: number;
  description: string;
}

export type CrewId = 'vance' | 'chen' | 'okafor' | 'lindqvist';

export interface CrewSuitState {
  helmetSealed: boolean;
  goldVisorDown: boolean;
  magBootsLocked: boolean;
  evaActive: boolean;
  oxygenPct: number;
  pressureKpa: number;
  heartRateBpm: number;
  suitTempC: number;
}

export interface CrewMember {
  id: CrewId;
  name: string;
  callsign: string;
  role: string;
  specialty: string;
  suitColorAccent: string;
  skinTone: string;
  hairColor: string;
  hairStyle: 'bun' | 'short' | 'braids' | 'swept';
  patchCode: string;
  bio: string;
  suit: CrewSuitState;
}

export interface CommsMessage {
  id: string;
  timestampMet: string;
  speakerId: CrewId | 'flight' | 'agc';
  speakerName: string;
  callsign: string;
  targetName?: string;
  text: string;
  category: 'crew' | 'system' | 'mars' | 'gravity';
}

export type EquipmentCategory = 'Mobility' | 'Science' | 'Habitat' | 'Comms';

export interface EquipmentItem {
  id: string;
  name: string;
  code: string;
  category: EquipmentCategory;
  massKg: number;
  powerKw: number;
  summary: string;
  marsBenefit: string;
  status: 'STOWED' | 'CHECKED' | 'DEPLOYED';
  requiresMarsSurface: boolean;
  diagnosticNote: string;
}

export interface MarsSector {
  id: string;
  name: string;
  coordinates: string;
  elevationM: number;
  tempC: number;
  dustIndex: string;
  summary: string;
  mineralSignature: string;
  sampleName: string;
  sampleType: 'Ice Core' | 'Sedimentary' | 'Biosignature' | 'Basalt';
  scanned: boolean;
  sampleCollected: boolean;
  mapX: number;
  mapY: number;
}

export interface CollectedSample {
  id: string;
  sectorId: string;
  sectorName: string;
  sampleName: string;
  sampleType: MarsSector['sampleType'];
  collectedAtMet: string;
  analyzed: boolean;
  finding: string;
}

export interface DskyState {
  prog: string;
  verb: string;
  noun: string;
  reg1: string;
  reg2: string;
  reg3: string;
  inputBuffer: string;
  inputTarget: 'verb' | 'noun' | null;
  statusText: string;
  lampTestActive: boolean;
}

export interface TelemetryData {
  metSeconds: number;
  countdownSeconds: number;
  altitudeKm: number;
  velocityKms: number;
  distanceToMarsKm: number;
  transitProgressPct: number;
  fuelPct: number;
  oxidizerPct: number;
  reactorOutputKw: number;
  powerLoadKw: number;
  cabinO2Pct: number;
  cabinPressureKpa: number;
  hullTempC: number;
  gravityG: number;
  throttlePct: number;
  stage1Separated: boolean;
  tmiBurnComplete: boolean;
  sciencePoints: number;
}

export interface MissionState {
  phase: MissionPhase;
  gravityMode: GravityMode;
  switches: Record<SwitchId, boolean>;
  telemetry: TelemetryData;
  dsky: DskyState;
  crew: CrewMember[];
  comms: CommsMessage[];
  equipment: EquipmentItem[];
  marsSectors: MarsSector[];
  activeSectorId: string;
  samples: CollectedSample[];
  selectedCrewId: CrewId;
  activeTab: ConsoleTab;
  cameraMode: CameraMode;
  audioEnabled: boolean;
  crewExchangeCount: number;
}
