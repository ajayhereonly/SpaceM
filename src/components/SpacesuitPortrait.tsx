import type { CrewMember } from '../simulation/types';

interface SpacesuitPortraitProps {
  member: CrewMember;
  isZeroG: boolean;
  compact?: boolean;
}

export function SpacesuitPortrait({
  member,
  isZeroG,
  compact = false,
}: SpacesuitPortraitProps) {
  const floating = isZeroG && !member.suit.magBootsLocked;
  const accent = member.suitColorAccent;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-[#243044] bg-[#0B111D] flex items-center justify-center ${
        compact ? 'w-14 h-14' : 'w-24 h-24 shrink-0'
      }`}
      aria-label={`${member.name} in Mk-XI spacesuit`}
    >
      <svg
        viewBox="0 0 120 120"
        className={`w-full h-full ${floating ? 'animate-zero-g' : ''}`}
        role="img"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`bg-${member.id}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#1B2840" />
            <stop offset="100%" stopColor="#090D16" />
          </radialGradient>
          <linearGradient id={`goldVisor-${member.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.95" />
            <stop offset="48%" stopColor="#D97706" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#78350F" stopOpacity="0.96" />
          </linearGradient>
          <linearGradient id={`clearVisor-${member.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.28" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Deep cabin backdrop */}
        <rect width="120" height="120" fill={`url(#bg-${member.id})`} />

        {/* Subtle cabin grid line */}
        <line x1="0" y1="96" x2="120" y2="96" stroke="#1E293B" strokeWidth="1" />

        {/* Pressurized Spacesuit Shoulders & Torso */}
        <path
          d="M14 120 C16 95, 32 86, 60 86 C88 86, 104 95, 106 120 Z"
          fill="#E2E8F0"
          stroke="#94A3B8"
          strokeWidth="1.5"
        />
        {/* Suit shoulder accent stripes */}
        <path d="M23 99 L34 94 L37 102 L26 107 Z" fill={accent} />
        <path d="M97 99 L86 94 L83 102 L94 107 Z" fill={accent} />

        {/* Chest Life-Support Telemetry Module */}
        <rect
          x="42"
          y="96"
          width="36"
          height="20"
          rx="3"
          fill="#111827"
          stroke="#475569"
          strokeWidth="1.2"
        />
        <rect x="47" y="101" width="12" height="5" rx="1" fill={accent} />
        <rect x="63" y="101" width="10" height="5" rx="1" fill="#10B981" />
        <line x1="47" y1="110" x2="73" y2="110" stroke="#334155" strokeWidth="1.5" />

        {/* Metallic Helmet Neck Collar Ring */}
        <ellipse
          cx="60"
          cy="86"
          rx="25"
          ry="7"
          fill="#334155"
          stroke={member.suit.helmetSealed ? '#10B981' : '#F59E0B'}
          strokeWidth="2"
        />

        {/* Outer Polycarbonate Helmet Shell */}
        <circle
          cx="60"
          cy="52"
          r="33"
          fill="#F1F5F9"
          stroke="#94A3B8"
          strokeWidth="1.8"
        />
        {/* Helmet side comms pods */}
        <rect x="23" y="45" width="6" height="16" rx="2.5" fill="#475569" />
        <rect x="91" y="45" width="6" height="16" rx="2.5" fill="#475569" />
        <rect x="24" y="49" width="4" height="6" rx="1" fill={accent} />
        <rect x="92" y="49" width="4" height="6" rx="1" fill={accent} />

        {/* Inner Helmet Face Cavity */}
        <ellipse cx="60" cy="54" rx="24" ry="25" fill="#0F172A" />

        {/* Astronaut Head / Neck */}
        <rect x="53" y="69" width="14" height="12" rx="4" fill={member.skinTone} />
        <ellipse cx="60" cy="54" rx="15" ry="18" fill={member.skinTone} />

        {/* Hair Variations */}
        {member.hairStyle === 'bun' && (
          <>
            <circle cx="60" cy="34" r="6" fill={member.hairColor} />
            <path
              d="M45 50 C45 36, 75 36, 75 50 C72 43, 48 43, 45 50 Z"
              fill={member.hairColor}
            />
          </>
        )}
        {member.hairStyle === 'short' && (
          <path
            d="M45 50 C45 35, 75 35, 75 50 C71 42, 49 42, 45 50 Z"
            fill={member.hairColor}
          />
        )}
        {member.hairStyle === 'braids' && (
          <>
            <path
              d="M44 52 C44 35, 76 35, 76 52 C72 43, 48 43, 44 52 Z"
              fill={member.hairColor}
            />
            <circle cx="46" cy="56" r="3" fill={member.hairColor} />
            <circle cx="74" cy="56" r="3" fill={member.hairColor} />
          </>
        )}
        {member.hairStyle === 'swept' && (
          <path
            d="M44 49 C46 34, 76 35, 75 49 C68 41, 52 43, 44 49 Z"
            fill={member.hairColor}
          />
        )}

        {/* Facial Features */}
        <circle cx="54" cy="53" r="1.8" fill="#1E293B" />
        <circle cx="66" cy="53" r="1.8" fill="#1E293B" />
        <path d="M51 49 Q54 47.5 57 49" stroke="#1E293B" strokeWidth="1.2" fill="none" />
        <path d="M63 49 Q66 47.5 69 49" stroke="#1E293B" strokeWidth="1.2" fill="none" />
        <path d="M56 62 Q60 65 64 62" stroke="#7C2D12" strokeWidth="1.4" fill="none" strokeLinecap="round" />

        {/* Headset Comms Mic */}
        <path d="M44 59 Q50 64 56 63" stroke="#94A3B8" strokeWidth="1.3" fill="none" />

        {/* Clear or Gold Sun Visor Overlay */}
        {member.suit.helmetSealed && (
          <ellipse
            cx="60"
            cy="54"
            rx="24"
            ry="25"
            fill={
              member.suit.goldVisorDown
                ? `url(#goldVisor-${member.id})`
                : `url(#clearVisor-${member.id})`
            }
            stroke={member.suit.goldVisorDown ? '#F59E0B' : '#38BDF8'}
            strokeWidth="1.2"
          />
        )}

        {/* Visor Specular Highlight */}
        {member.suit.helmetSealed && (
          <path
            d="M44 44 Q52 34 65 37"
            stroke="#FFFFFF"
            strokeOpacity={member.suit.goldVisorDown ? '0.6' : '0.45'}
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>

      {!compact && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-mono-tabular font-semibold bg-[#07090E]/90 text-slate-200 rounded border border-[#243044]">
          {member.patchCode}
        </span>
      )}
    </div>
  );
}
