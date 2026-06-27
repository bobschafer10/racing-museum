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

<style>{`
  .milestonesPage {
    background: #f4efe5;
    color: #18120c;
    min-height: 100vh;
    font-family: Arial, sans-serif;
  }

  .milestoneHero {
    background: linear-gradient(135deg, #15110c, #3a2414);
    color: white;
    padding: 70px 6vw;
    border-bottom: 6px solid #a20f12;
  }

  .milestoneHero h1 {
    font-size: clamp(42px, 7vw, 84px);
    line-height: .9;
    margin: 10px 0;
    text-transform: uppercase;
  }

  .milestoneHero p {
    font-size: 20px;
    max-width: 760px;
  }

  .milestoneSection,
  .milestoneIntro,
  .trackWatchCallout {
    width: min(1180px, calc(100% - 32px));
    margin: 30px auto;
  }

  .milestoneSection h2 {
    color: #8f1111;
    text-transform: uppercase;
    font-size: 26px;
  }

  .desktopTable {
    background: white;
    border-radius: 12px;
    overflow-x: auto;
    border: 1px solid #d6cbb8;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    background: #111;
    color: white;
    padding: 12px;
    text-transform: uppercase;
    font-size: 12px;
  }

  td {
    padding: 13px;
    border-bottom: 1px solid #e1d7c8;
  }

  .driverLink {
    color: #a20f12;
    font-weight: 900;
    text-decoration: none;
  }

  .milestoneBadge {
    display: inline-block;
    min-width: 70px;
    text-align: center;
    padding: 10px;
    color: white;
    border-radius: 6px;
    font-weight: 900;
  }

  .m500 { background: #681515; }
  .m400 { background: #b91414; }
  .m300 { background: #d55a00; }
  .m200 { background: #c69010; }
  .m100 { background: #3f7d33; }

  .withinGrid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 14px;
  }

  .withinCard {
    background: white;
    border: 1px solid #d6cbb8;
    border-radius: 10px;
    overflow: hidden;
  }

  .withinCard h3 {
    background: #111;
    color: white;
    margin: 0;
    padding: 12px;
  }

  .withinCard a {
    color: #8f1111;
    font-weight: 800;
  }

  .trackWatchCallout {
    background: #101820;
    color: white;
    padding: 24px;
    border-radius: 12px;
  }

  @media (max-width: 760px) {
    .desktopTable {
      display: none;
    }

    .mobileCards {
      display: grid;
      gap: 12px;
    }

    .withinGrid {
      grid-template-columns: 1fr;
    }
  }
`}</style>
    </main>
  );
}