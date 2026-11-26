import { MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { CREW_DIALOGUE_TOPICS, type CrewTopicId } from '../simulation/missionData';
import type { CrewId, CrewSuitState, MissionState } from '../simulation/types';
import { SpacesuitPortrait } from './SpacesuitPortrait';

interface CrewDeckProps {
  mission: MissionState;
  onSelectCrew: (id: CrewId) => void;
  onToggleSuitControl: (
    crewId: CrewId,
    control: keyof Pick<CrewSuitState, 'helmetSealed' | 'goldVisorDown' | 'magBootsLocked' | 'evaActive'>,
  ) => void;
  onTriggerConversation: (topicId: CrewTopicId, focusCrewId?: CrewId) => void;
}

export function CrewDeck({
  mission,
  onSelectCrew,
  onToggleSuitControl,
  onTriggerConversation,
}: CrewDeckProps) {
  const isZeroG = mission.telemetry.gravityG < 0.1;
  const recentComms = mission.comms.slice(-10).reverse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left 8 Columns: 4 Suited Crew Cards */}
      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3">
        {mission.crew.map((member) => {
          const isSelected = mission.selectedCrewId === member.id;
          const isFloating = isZeroG && !member.suit.magBootsLocked;

          return (
            <article
              key={member.id}
              className={`rounded-xl border p-3.5 transition-colors flex flex-col gap-3 ${
                isSelected
                  ? 'bg-[#141D2E] border-amber-500/60'
                  : 'bg-[#111722] border-[#243044]'
              }`}
            >
              <div className="flex items-start gap-3">
                <SpacesuitPortrait member={member} isZeroG={isZeroG} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectCrew(member.id)}
                      className="font-display text-sm font-semibold text-slate-100 hover:text-amber-300 text-left truncate"
                    >
                      {member.name}
                    </button>
                    <span className="font-mono-tabular text-[11px] text-slate-400 shrink-0">
                      {member.callsign}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-0.5">
                    {member.role} · {isFloating ? 'Floating (0.00 G)' : `${mission.telemetry.gravityG.toFixed(2)} G Deck`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {member.bio}
                  </p>

                  {/* Suit Biometrics Row */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-[#1E293B] font-mono-tabular text-[11px]">
                    <div>
                      <div className="text-[9px] text-slate-500">O2</div>
                      <div className="text-emerald-400 font-semibold">{member.suit.oxygenPct}%</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500">PRESS</div>
                      <div className="text-slate-200">{member.suit.pressureKpa.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500">BPM</div>
                      <div className="text-cyan-300">{member.suit.heartRateBpm}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500">TEMP</div>
                      <div className="text-slate-200">{member.suit.suitTempC.toFixed(1)}°C</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Mk-XI Spacesuit Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                <button
                  type="button"
                  aria-pressed={member.suit.helmetSealed}
                  onClick={() => onToggleSuitControl(member.id, 'helmetSealed')}
                  className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-colors whitespace-nowrap ${
                    member.suit.helmetSealed
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                      : 'bg-[#0B0F17] border-[#243044] text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Helmet {member.suit.helmetSealed ? 'Sealed' : 'Open'}
                </button>
                <button
                  type="button"
                  aria-pressed={member.suit.goldVisorDown}
                  onClick={() => onToggleSuitControl(member.id, 'goldVisorDown')}
                  className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-colors whitespace-nowrap ${
                    member.suit.goldVisorDown
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                      : 'bg-[#0B0F17] border-[#243044] text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Visor {member.suit.goldVisorDown ? 'Gold' : 'Clear'}
                </button>
                <button
                  type="button"
                  aria-pressed={member.suit.magBootsLocked}
                  onClick={() => onToggleSuitControl(member.id, 'magBootsLocked')}
                  className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-colors whitespace-nowrap ${
                    member.suit.magBootsLocked
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200'
                      : 'bg-[#0B0F17] border-[#243044] text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Boots {member.suit.magBootsLocked ? 'Locked' : 'Free'}
                </button>
                <button
                  type="button"
                  aria-pressed={member.suit.evaActive}
                  onClick={() => onToggleSuitControl(member.id, 'evaActive')}
                  className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-colors whitespace-nowrap ${
                    member.suit.evaActive
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-[#0B0F17] border-[#243044] text-slate-400 hover:border-slate-500'
                  }`}
                >
                  EVA {member.suit.evaActive ? 'Active' : 'Cabin'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Right 4 Columns: Interactive Crew-to-Crew Dialogue Center */}
      <section
        aria-label="Crew Intercom and Interactive Briefings"
        className="lg:col-span-4 bg-[#111722] border border-[#243044] rounded-xl p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Crew-to-Crew Intercom
            </h2>
          </div>
          <span className="text-[11px] font-mono-tabular text-slate-400">
            {mission.crew.filter((c) => c.suit.helmetSealed).length}/4 Sealed
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
            Initiate Crew Discussion
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {CREW_DIALOGUE_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => onTriggerConversation(topic.id, mission.selectedCrewId)}
                className="text-left px-3 py-2 rounded-lg border border-[#243044] bg-[#0B0F17] hover:bg-[#161E2E] hover:border-cyan-500/50 transition-colors"
              >
                <div className="text-xs font-semibold text-slate-100">{topic.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{topic.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-[#1E293B]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              Live Radio Transcript
            </span>
            <span className="font-mono-tabular text-[11px] text-slate-400">
              {mission.comms.length} msgs
            </span>
          </div>
          <div
            data-testid="crew-intercom-transcript"
            className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-56"
          >
            {recentComms.map((msg) => (
              <div
                key={msg.id}
                className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 mb-0.5">
                  <span className="font-semibold text-amber-300 truncate">
                    {msg.speakerName}
                    {msg.targetName ? ` → ${msg.targetName}` : ''}
                  </span>
                  <span className="font-mono-tabular shrink-0">{msg.timestampMet}</span>
                </div>
                <p className="text-slate-200 leading-snug">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
