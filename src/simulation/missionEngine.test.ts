import test from 'node:test';
import assert from 'node:assert/strict';
import {
  autoPrepChecklist,
  collectMarsSample,
  createInitialMissionState,
  deployEquipment,
  executeDskyCommand,
  fastTrackMarsLanding,
  isReadyForLaunch,
  scanMarsSector,
  setAntigravityMode,
  stepSimulation,
  toggleCrewSuitControl,
  toggleSwitch,
  triggerCrewConversation,
  triggerLaunch,
  triggerMarsDescent,
  triggerMarsTouchdown,
  triggerStageSeparation,
  triggerTmiBurn,
} from './missionEngine';

test('pre-launch checklist gates readiness and autoPrep enables all required switches', () => {
  const initial = createInitialMissionState();
  assert.equal(initial.phase, 'PRE_LAUNCH');
  assert.equal(isReadyForLaunch(initial), false);

  const prepped = autoPrepChecklist(initial);
  assert.equal(isReadyForLaunch(prepped), true);
  assert.equal(prepped.switches.fuelPress, true);
  assert.equal(prepped.switches.guidanceLock, true);
  assert.equal(prepped.switches.crewSuitSeal, true);
});

test('launch countdown progresses into ascent, stage separation, and deep-space transit', () => {
  let state = triggerLaunch(createInitialMissionState());
  assert.equal(state.phase, 'COUNTDOWN');

  // Step through 4-second terminal countdown
  for (let i = 0; i < 5; i += 1) {
    state = stepSimulation(state, 1);
  }
  assert.equal(state.phase, 'ASCENT');
  assert.ok(state.telemetry.altitudeKm > 0);
  assert.ok(state.telemetry.velocityKms > 0);

  state = triggerStageSeparation(state);
  assert.equal(state.telemetry.stage1Separated, true);

  state = triggerTmiBurn(state);
  assert.equal(state.phase, 'TRANSIT');
  assert.equal(state.telemetry.tmiBurnComplete, true);
  assert.equal(state.gravityMode, 'ZERO_G');
  assert.equal(state.telemetry.gravityG, 0);
});

test('antigravity generator switches between 0.00 G, 0.38 G Mars, and 1.00 G Earth in transit', () => {
  let state = triggerTmiBurn(triggerLaunch(createInitialMissionState()));
  assert.equal(state.telemetry.gravityG, 0);

  const marsGrav = setAntigravityMode(state, 'MARS_G');
  assert.equal(marsGrav.gravityMode, 'MARS_G');
  assert.equal(marsGrav.telemetry.gravityG, 0.38);
  assert.ok(marsGrav.telemetry.powerLoadKw > state.telemetry.powerLoadKw);

  const earthGrav = setAntigravityMode(marsGrav, 'EARTH_G');
  assert.equal(earthGrav.telemetry.gravityG, 1.0);

  const coreOff = toggleSwitch(earthGrav, 'antigravCore');
  assert.equal(coreOff.switches.antigravCore, false);
  assert.equal(coreOff.telemetry.gravityG, 0);
});

test('DSKY computer processes Verb/Noun commands including Lamp Self-Test and Antigravity Sync', () => {
  let state = triggerTmiBurn(triggerLaunch(createInitialMissionState()));
  const tested = executeDskyCommand(state, '35', '00');
  assert.equal(tested.dsky.lampTestActive, true);

  const synced = executeDskyCommand(tested, '21', '42');
  assert.equal(synced.gravityMode, 'MARS_G');
  assert.equal(synced.telemetry.gravityG, 0.38);
});

test('spacesuit crew controls and multi-turn crew-to-crew interactions update state and comms', () => {
  let state = triggerTmiBurn(triggerLaunch(createInitialMissionState()));
  const initialCommsCount = state.comms.length;

  state = toggleCrewSuitControl(state, 'chen', 'magBootsLocked');
  const chen = state.crew.find((c) => c.id === 'chen');
  assert.equal(chen?.suit.magBootsLocked, false);
  // Zero-G + unlocked mag-boots triggers crewmate safety banter!
  assert.ok(state.comms.length >= initialCommsCount + 2);

  const beforeTalk = state.comms.length;
  state = triggerCrewConversation(state, 'antigravity-talk', 'lindqvist');
  assert.equal(state.crewExchangeCount, 1);
  assert.ok(state.comms.length >= beforeTalk + 3);
});

test('Mars descent, touchdown, equipment deployment, and Jezero sector sample collection work end-to-end', () => {
  let state = triggerTmiBurn(triggerLaunch(createInitialMissionState()));

  // Surface-only equipment cannot deploy before Mars touchdown
  const prematureDeploy = deployEquipment(state, 'rover-ares');
  assert.equal(
    prematureDeploy.equipment.find((e) => e.id === 'rover-ares')?.status,
    'STOWED',
  );

  state = triggerMarsDescent(state);
  assert.equal(state.phase, 'DESCENT');

  state = triggerMarsTouchdown(state);
  assert.equal(state.phase, 'MARS_SURFACE');
  assert.equal(state.telemetry.gravityG, 0.38);
  assert.equal(state.telemetry.distanceToMarsKm, 0);

  state = deployEquipment(state, 'rover-ares');
  state = deployEquipment(state, 'core-drill');
  state = deployEquipment(state, 'moxie-o2');
  assert.equal(state.equipment.find((e) => e.id === 'rover-ares')?.status, 'DEPLOYED');
  assert.equal(state.equipment.find((e) => e.id === 'moxie-o2')?.status, 'DEPLOYED');

  state = scanMarsSector(state, 'jezero-delta');
  assert.equal(state.marsSectors.find((s) => s.id === 'jezero-delta')?.scanned, true);

  state = collectMarsSample(state, 'jezero-delta');
  assert.equal(state.samples.length, 1);
  assert.equal(state.samples[0].sectorId, 'jezero-delta');
  assert.ok(state.telemetry.sciencePoints >= 100);
});

test('fastTrackMarsLanding transitions directly from PRE_LAUNCH to MARS_SURFACE with equipment unlockable', () => {
  const initial = createInitialMissionState();
  const landed = fastTrackMarsLanding(initial);
  assert.equal(landed.phase, 'MARS_SURFACE');
  assert.equal(landed.telemetry.gravityG, 0.38);
  assert.equal(landed.telemetry.distanceToMarsKm, 0);

  const withRover = deployEquipment(landed, 'rover-ares');
  assert.equal(withRover.equipment.find((e) => e.id === 'rover-ares')?.status, 'DEPLOYED');
});
