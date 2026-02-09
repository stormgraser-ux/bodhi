import teachings from "../data/teachings.json";

/** Deterministic daily index based on the date */
function todayIndex(): number {
  const now = new Date();
  const daysSinceEpoch = Math.floor(now.getTime() / 86400000);
  return daysSinceEpoch % teachings.length;
}

export function DailyTeaching() {
  const teaching = teachings[todayIndex()];

  return (
    <div className="daily-teaching">
      <p className="teaching-text">{teaching.text}</p>
      <p className="teaching-source">{teaching.source}</p>
    </div>
  );
}
