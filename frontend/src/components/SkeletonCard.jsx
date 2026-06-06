/* ─────────────────────────────────────────────────────────────────────────
   Skeleton Loading Components
   Dùng chung cho Vocabulary, Quiz, Dashboard khi đang fetch data
──────────────────────────────────────────────────────────────────────────── */

/* ── Base shimmer block ── */
const Shimmer = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

/* ── Vocabulary word card skeleton ── */
export const SkeletonWordCard = () => (
  <div className="card-3d p-4 flex flex-col gap-3">
    {/* Top row: theme badge + type */}
    <div className="flex items-center justify-between">
      <Shimmer className="h-5 w-16 rounded-lg" />
      <Shimmer className="h-4 w-10 rounded-md" />
    </div>

    {/* Image placeholder */}
    <Shimmer className="w-full h-28 rounded-xl" />

    {/* Word */}
    <Shimmer className="h-6 w-2/3 rounded-lg" />

    {/* IPA */}
    <Shimmer className="h-4 w-1/3 rounded-md" />

    {/* Meaning */}
    <Shimmer className="h-4 w-full rounded-md" />
    <Shimmer className="h-4 w-3/4 rounded-md" />

    {/* Bottom buttons row */}
    <div className="flex gap-2 mt-1">
      <Shimmer className="h-8 flex-1 rounded-xl" />
      <Shimmer className="h-8 w-8 rounded-xl" />
    </div>
  </div>
);

/* ── Vocabulary grid skeleton (shows N cards) ── */
export const SkeletonVocabularyGrid = ({ count = 6 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonWordCard key={i} />
    ))}
  </div>
);

/* ── Stat card skeleton (Dashboard) ── */
export const SkeletonStat = () => (
  <div className="card-3d p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <Shimmer className="h-4 w-20 rounded-md" />
      <Shimmer className="h-8 w-8 rounded-xl" />
    </div>
    <Shimmer className="h-8 w-1/2 rounded-lg" />
    <Shimmer className="h-3 w-3/4 rounded-md" />
  </div>
);

/* ── Stats grid skeleton ── */
export const SkeletonStatGrid = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonStat key={i} />
    ))}
  </div>
);

/* ── Quiz question card skeleton ── */
export const SkeletonQuizCard = () => (
  <div className="card-3d p-6 space-y-5">
    {/* Progress bar */}
    <Shimmer className="h-1.5 w-full rounded-full -mt-2" />

    {/* Header */}
    <div className="flex items-center justify-between">
      <Shimmer className="h-4 w-24 rounded-md" />
      <Shimmer className="h-5 w-20 rounded-lg" />
    </div>

    {/* Question text */}
    <div className="space-y-2">
      <Shimmer className="h-5 w-full rounded-lg" />
      <Shimmer className="h-5 w-4/5 rounded-lg" />
    </div>

    {/* Answer options */}
    <div className="space-y-3 pt-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Shimmer className="h-7 w-7 rounded-lg shrink-0" />
          <Shimmer className="h-11 flex-1 rounded-2xl" />
        </div>
      ))}
    </div>
  </div>
);

/* ── Generic content block skeleton ── */
export const SkeletonBlock = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Shimmer
        key={i}
        className={`h-4 rounded-md ${i === lines - 1 ? 'w-3/5' : 'w-full'}`}
      />
    ))}
  </div>
);

/* ── Profile card skeleton ── */
export const SkeletonProfileHeader = () => (
  <div className="card-3d p-6 flex flex-col items-center gap-4">
    <Shimmer className="w-24 h-24 rounded-2xl" />
    <Shimmer className="h-6 w-32 rounded-lg" />
    <Shimmer className="h-4 w-48 rounded-md" />
    <div className="flex gap-6 w-full justify-center pt-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <Shimmer className="h-6 w-12 rounded-lg" />
          <Shimmer className="h-3 w-10 rounded-md" />
        </div>
      ))}
    </div>
  </div>
);

/* ── Lobby theme grid skeleton ── */
export const SkeletonLobbyThemeGrid = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="card-3d p-4 flex flex-col justify-between h-[130px] opacity-70">
        <div>
          <Shimmer className="w-8 h-8 rounded-lg mb-2" />
          <Shimmer className="h-4 w-3/4 rounded-md mb-1.5" />
          <Shimmer className="h-3 w-1/3 rounded-md" />
        </div>
        <div className="flex justify-between items-center mt-2">
          <Shimmer className="h-3 w-1/2 rounded-md" />
          <Shimmer className="w-6 h-6 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

export default SkeletonWordCard;
