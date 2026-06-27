import Link from "next/link";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type MilestoneDriver = {
  driver_id: number;
  driver_name: string;
  driver_slug: string;
  feature_wins: number;
  achieved_milestone: number | null;
  next_milestone: number | null;
  wins_needed: number | null;
  last_win_date: string | null;
  is_active: boolean;
  milestone_status: "achieved" | "within_5" | "other";
};

async function getMilestones(): Promise<MilestoneDriver[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/victory_milestone_watch_view` +
    `?select=*` +
    `&order=feature_wins.desc`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];
  return res.json();
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function milestoneClass(level: number | null) {
  if (level === 500) return "m500";
  if (level === 400) return "m400";
  if (level === 300) return "m300";
  if (level === 200) return "m200";
  return "m100";
}

export default async function MilestonesPage() {
  const rows = await getMilestones();

  const achieved = rows.filter((r) => r.milestone_status === "achieved");
  const withinFive = rows.filter((r) => r.milestone_status === "within_5");

  const groups = [500, 400, 300, 200, 100];

  return (
    <main className="milestonesPage">
      <section className="milestoneHero">
        <div>
          <div className="eyebrow">Victory Milestones</div>
          <h1>Career Feature Win Milestones</h1>
          <p>
            Celebrating Wisconsin drivers who have reached major recorded
            feature win milestones — and those closing in on racing history.
          </p>
        </div>
      </section>

      <section className="milestoneIntro">
        <p>
          Wisconsin feature wins are based on recorded museum results. Drivers,
          tracks, and totals are clickable for deeper research.
        </p>

        <div className="milestoneActions">
          <Link href="/drivers">Driver Directory</Link>
          <Link href="/tracks">Track Directory</Link>
          <Link href="/stats">Stats Lab</Link>
          <Link href="/milestones/tracks">Active Track Watch</Link>
        </div>
      </section>

      <section className="milestoneSection">
        <h2>Drivers at or Above Milestones</h2>

        <div className="desktopTable">
          <table>
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Driver</th>
                <th>WI Feature Wins</th>
                <th>Next Milestone</th>
                <th>Wins Needed</th>
                <th>Active?</th>
                <th>Last Win</th>
              </tr>
            </thead>
            <tbody>
              {achieved.map((driver) => (
                <tr key={driver.driver_id}>
                  <td>
                    <span
                      className={`milestoneBadge ${milestoneClass(
                        driver.achieved_milestone
                      )}`}
                    >
                      {driver.achieved_milestone}+
                    </span>
                  </td>
                  <td>
                    <Link
                      className="driverLink"
                      href={`/drivers/${driver.driver_slug}`}
                    >
                      {driver.driver_name}
                    </Link>
                  </td>
                  <td className="bigNumber">{driver.feature_wins}</td>
                  <td>{driver.next_milestone ?? "—"}</td>
                  <td>{driver.wins_needed ?? "—"}</td>
                  <td>{driver.is_active ? "Yes" : "No"}</td>
                  <td>{formatDate(driver.last_win_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobileCards">
          {achieved.map((driver) => (
            <Link
              href={`/drivers/${driver.driver_slug}`}
              className="mobileMilestoneCard"
              key={driver.driver_id}
            >
              <span
                className={`milestoneBadge ${milestoneClass(
                  driver.achieved_milestone
                )}`}
              >
                {driver.achieved_milestone}+
              </span>

              <div>
                <strong>{driver.driver_name}</strong>
                <p>{driver.feature_wins} Wisconsin feature wins</p>
                <p>Last win: {formatDate(driver.last_win_date)}</p>
              </div>

              <span className="arrow">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="milestoneSection">
        <h2>Within 5 Wins of a Milestone</h2>

        <div className="withinGrid">
          {groups.map((level) => {
            const drivers = withinFive.filter(
              (driver) => driver.next_milestone === level
            );

            return (
              <div className="withinCard" key={level}>
                <h3>{level} Wins</h3>
                <p className="range">
                  {level - 5} – {level - 1} wins
                </p>

                {drivers.length === 0 ? (
                  <p className="empty">No drivers within 5 wins.</p>
                ) : (
                  <ol>
                    {drivers.map((driver) => (
                      <li key={driver.driver_id}>
                        <Link href={`/drivers/${driver.driver_slug}`}>
                          {driver.driver_name}
                        </Link>
                        <span>{driver.feature_wins}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="trackWatchCallout">
        <div>
          <h2>Active Tracks Milestone Watch</h2>
          <p>
            Track-specific milestone watch belongs on its own page so the main
            statewide milestone page stays fast and easy to use.
          </p>
        </div>

        <Link href="/milestones/tracks">View Active Track Watch</Link>
      </section>
    </main>
  );
}