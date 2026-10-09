import Link from "next/link";

export const revalidate = 43200;

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
    next: { revalidate: 300 },
  });

  if (!res.ok) return [];
  return res.json();
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
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
  const activeWatch = rows.filter((r) => r.is_active).length;
  const groups = [500, 400, 300, 200, 100];

  return (
    <main className="milestonesPage">
      <section className="milestoneHero">
        <div className="heroGlow" />
        <div className="heroInner">
          <div className="breadcrumbs">
            <Link href="/">Home</Link>
            <span>›</span>
            <Link href="/stats">Stats Lab</Link>
            <span>›</span>
            <strong>Milestones</strong>
          </div>

          <div className="eyebrow">Museum Research Tools</div>
          <h1>Career Feature<br />Win Milestones</h1>
          <p>
            Career totals now use the same recorded feature-win count shown on each
            driver profile, so milestone standings and driver pages stay in sync.
          </p>

          <div className="heroActions">
            <Link className="primaryAction" href="/drivers">Driver Directory →</Link>
            <Link className="secondaryAction" href="/stats/feature-winners">Feature Winners</Link>
            <Link className="secondaryAction" href="/tracks">Track Directory</Link>
          </div>

          <div className="heroStats">
            <div>
              <strong>{achieved.length.toLocaleString()}</strong>
              <span>Drivers at a milestone</span>
            </div>
            <div>
              <strong>{withinFive.length.toLocaleString()}</strong>
              <span>Within five wins</span>
            </div>
            <div>
              <strong>{activeWatch.toLocaleString()}</strong>
              <span>Active on this watch</span>
            </div>
          </div>
        </div>
      </section>

      <div className="content">
        <section className="scopePanel">
          <div>
            <span className="sectionEyebrow">Cross-Referenced Totals</span>
            <h2>Recorded Career Wins</h2>
          </div>
          <p>
            These are museum-recorded career feature wins — the same total displayed
            on each driver profile. Wisconsin-only totals remain available in the
            Stats Lab for state-specific research.
          </p>
        </section>

        <section className="milestoneSection">
          <div className="sectionHeading">
            <div>
              <span className="sectionEyebrow">Career Leaders</span>
              <h2>Drivers at or Above Milestones</h2>
            </div>
            <p>{achieved.length.toLocaleString()} drivers currently qualify</p>
          </div>

          <div className="desktopTable">
            <table>
              <thead>
                <tr>
                  <th>Milestone</th>
                  <th>Driver</th>
                  <th>Recorded Wins</th>
                  <th>Next Milestone</th>
                  <th>Wins Needed</th>
                  <th>Status</th>
                  <th>Last Recorded Win</th>
                </tr>
              </thead>
              <tbody>
                {achieved.map((driver) => (
                  <tr key={driver.driver_id}>
                    <td>
                      <span className={`milestoneBadge ${milestoneClass(driver.achieved_milestone)}`}>
                        {driver.achieved_milestone}+
                      </span>
                    </td>
                    <td>
                      <Link className="driverLink" href={`/drivers/${driver.driver_slug}`}>
                        {driver.driver_name}
                      </Link>
                    </td>
                    <td className="bigNumber">{driver.feature_wins.toLocaleString()}</td>
                    <td>{driver.next_milestone?.toLocaleString() ?? "—"}</td>
                    <td>{driver.wins_needed?.toLocaleString() ?? "—"}</td>
                    <td>
                      {driver.is_active ? (
                        <span className="activeBadge">ACTIVE</span>
                      ) : (
                        <span className="inactiveBadge">HISTORIC</span>
                      )}
                    </td>
                    <td>{formatDate(driver.last_win_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobileCards">
            {achieved.map((driver) => (
              <Link href={`/drivers/${driver.driver_slug}`} className="mobileMilestoneCard" key={driver.driver_id}>
                <span className={`milestoneBadge ${milestoneClass(driver.achieved_milestone)}`}>
                  {driver.achieved_milestone}+
                </span>
                <div className="mobileCopy">
                  <strong>{driver.driver_name}</strong>
                  <p>{driver.feature_wins.toLocaleString()} recorded feature wins</p>
                  <small>Last win: {formatDate(driver.last_win_date)}</small>
                </div>
                {driver.is_active && <span className="mobileActive">ACTIVE</span>}
                <span className="arrow">›</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="milestoneSection">
          <div className="sectionHeading">
            <div>
              <span className="sectionEyebrow">Closing In</span>
              <h2>Within 5 Wins of a Milestone</h2>
            </div>
            <p>Automatically updates as recorded results are added</p>
          </div>

          <div className="withinGrid">
            {groups.map((level) => {
              const drivers = withinFive.filter((driver) => driver.next_milestone === level);

              return (
                <div className="withinCard" key={level}>
                  <div className="withinHeader">
                    <span>Next Mark</span>
                    <h3>{level.toLocaleString()} Wins</h3>
                    <p>{level - 5}–{level - 1} recorded wins</p>
                  </div>

                  {drivers.length === 0 ? (
                    <p className="empty">No drivers currently within five wins.</p>
                  ) : (
                    <ol>
                      {drivers.map((driver) => (
                        <li key={driver.driver_id}>
                          <Link href={`/drivers/${driver.driver_slug}`}>{driver.driver_name}</Link>
                          <div>
                            <strong>{driver.feature_wins.toLocaleString()}</strong>
                            {driver.is_active && <span>ACTIVE</span>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="researchCallout">
          <div>
            <span className="sectionEyebrow">Keep Researching</span>
            <h2>Follow the numbers back to the archive.</h2>
            <p>Every driver name links directly to the profile behind the milestone total.</p>
          </div>
          <div className="researchLinks">
            <Link href="/drivers">Browse Drivers →</Link>
            <Link href="/stats">Open Stats Lab →</Link>
            <Link href="/tracks">Browse Tracks →</Link>
          </div>
        </section>
      </div>

      <style>{`
        .milestonesPage {
          --bg: #080a0c;
          --panel: #101316;
          --panel2: #15191d;
          --line: rgba(233, 220, 194, 0.16);
          --lineStrong: rgba(233, 220, 194, 0.28);
          --gold: #c6a15b;
          --cream: #eadfc7;
          --red: #bd1721;
          --redBright: #df2630;
          min-height: 100vh;
          background:
            radial-gradient(circle at 92% 3%, rgba(189, 23, 33, 0.08), transparent 32rem),
            var(--bg);
          color: #f4f1ea;
          font-family: Arial, sans-serif;
        }

        .milestoneHero {
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid rgba(189, 23, 33, 0.65);
          background:
            linear-gradient(90deg, rgba(5, 7, 8, 0.98), rgba(11, 13, 15, 0.94) 58%, rgba(22, 14, 13, 0.88)),
            #0b0d0f;
        }

        .heroGlow {
          position: absolute;
          width: 520px;
          height: 520px;
          right: -120px;
          top: -220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(198, 161, 91, 0.14), transparent 68%);
          pointer-events: none;
        }

        .heroInner,
        .content {
          width: min(1380px, calc(100% - 40px));
          margin: 0 auto;
        }

        .heroInner {
          position: relative;
          z-index: 2;
          padding: 30px 0 34px;
        }

        .breadcrumbs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          color: #838b90;
          font-size: 0.66rem;
          font-weight: 850;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .breadcrumbs a {
          color: #a9afb2;
          text-decoration: none;
        }

        .breadcrumbs strong { color: #d3d7d8; }
        .breadcrumbs a:hover { color: #fff; }

        .eyebrow,
        .sectionEyebrow {
          color: var(--gold);
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .eyebrow { margin-top: 54px; }

        .milestoneHero h1 {
          margin: 11px 0 13px;
          max-width: 920px;
          color: #fff;
          font-size: clamp(3.4rem, 7vw, 6.8rem);
          line-height: 0.86;
          font-weight: 950;
          letter-spacing: -0.055em;
          text-transform: uppercase;
        }

        .milestoneHero p {
          max-width: 800px;
          margin: 0;
          color: #c8cdcf;
          font-size: 0.94rem;
          line-height: 1.7;
        }

        .heroActions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 22px;
        }

        .primaryAction,
        .secondaryAction {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 15px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          text-decoration: none;
          font-size: 0.66rem;
          font-weight: 950;
          letter-spacing: 0.055em;
          text-transform: uppercase;
        }

        .primaryAction { background: var(--red); color: #fff; }
        .secondaryAction { background: rgba(14, 18, 21, 0.82); color: #e8e4dd; border-color: rgba(233, 220, 194, 0.25); }
        .primaryAction:hover { background: var(--redBright); }
        .secondaryAction:hover { border-color: var(--gold); color: #fff; }

        .heroStats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 220px));
          gap: 8px;
          margin-top: 30px;
        }

        .heroStats div {
          min-height: 88px;
          display: grid;
          align-content: center;
          padding: 13px 14px;
          border: 1px solid var(--lineStrong);
          background:
            linear-gradient(135deg, rgba(189, 23, 33, 0.11), transparent 68%),
            rgba(13, 16, 19, 0.88);
        }

        .heroStats strong {
          color: #fff;
          font-size: 1.7rem;
          line-height: 1;
          font-weight: 950;
        }

        .heroStats span {
          margin-top: 7px;
          color: #9ba1a4;
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .content { padding: 24px 0 60px; }

        .scopePanel,
        .researchCallout {
          display: grid;
          grid-template-columns: minmax(260px, 0.7fr) minmax(0, 1.3fr);
          gap: 24px;
          align-items: center;
          padding: 20px 22px;
          border: 1px solid var(--lineStrong);
          background:
            linear-gradient(135deg, rgba(198, 161, 91, 0.07), transparent 60%),
            #101417;
        }

        .scopePanel h2,
        .researchCallout h2 {
          margin: 5px 0 0;
          color: #fff;
          font-size: clamp(1.35rem, 2.5vw, 2rem);
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.025em;
          text-transform: uppercase;
        }

        .scopePanel p,
        .researchCallout p {
          margin: 0;
          color: #9da3a6;
          font-size: 0.72rem;
          line-height: 1.65;
        }

        .milestoneSection { margin-top: 28px; }

        .sectionHeading {
          min-height: 58px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 22px;
          padding: 0 2px 11px;
          border-bottom: 1px solid var(--line);
        }

        .sectionHeading h2 {
          margin: 5px 0 0;
          color: #fff;
          font-size: clamp(1.45rem, 2.7vw, 2.15rem);
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.03em;
          text-transform: uppercase;
        }

        .sectionHeading p {
          margin: 0;
          color: #858d91;
          font-size: 0.68rem;
        }

        .desktopTable {
          margin-top: 12px;
          overflow-x: auto;
          border: 1px solid var(--line);
          background: #0d1114;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          padding: 11px 12px;
          border-bottom: 1px solid var(--lineStrong);
          background: #0a0d0f;
          color: #8f969a;
          text-align: left;
          font-size: 0.58rem;
          font-weight: 950;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.055);
          color: #b8bdc0;
          font-size: 0.69rem;
        }

        tbody tr:last-child td { border-bottom: 0; }
        tbody tr:nth-child(even) { background: rgba(255, 255, 255, 0.012); }
        tbody tr:hover { background: rgba(198, 161, 91, 0.045); }

        .driverLink {
          color: #f1f1ef;
          font-size: 0.75rem;
          font-weight: 900;
          text-decoration: none;
        }

        .driverLink:hover { color: #ef5961; }

        .bigNumber {
          color: var(--gold);
          font-size: 0.8rem;
          font-weight: 950;
        }

        .milestoneBadge {
          display: inline-flex;
          min-width: 58px;
          min-height: 30px;
          align-items: center;
          justify-content: center;
          padding: 0 9px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: white;
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.03em;
        }

        .m500 { background: #66161c; }
        .m400 { background: #9e1a20; }
        .m300 { background: #9a4b18; }
        .m200 { background: #8a6924; }
        .m100 { background: #536238; }

        .activeBadge,
        .inactiveBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 23px;
          padding: 0 8px;
          border-radius: 999px;
          font-size: 0.52rem;
          font-weight: 950;
          letter-spacing: 0.08em;
        }

        .activeBadge { background: #1c6c31; color: #eaffed; border: 1px solid rgba(104, 220, 130, 0.25); }
        .inactiveBadge { background: #24292d; color: #969da0; border: 1px solid rgba(255, 255, 255, 0.08); }

        .mobileCards { display: none; }

        .withinGrid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .withinCard {
          min-width: 0;
          border: 1px solid var(--line);
          background: #0d1114;
        }

        .withinHeader {
          padding: 13px;
          border-bottom: 1px solid var(--line);
          background:
            linear-gradient(135deg, rgba(198, 161, 91, 0.08), transparent 62%),
            #111518;
        }

        .withinHeader > span {
          color: var(--gold);
          font-size: 0.52rem;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .withinHeader h3 {
          margin: 5px 0 0;
          color: #fff;
          font-size: 1.05rem;
          font-weight: 950;
          text-transform: uppercase;
        }

        .withinHeader p {
          margin: 4px 0 0;
          color: #777f83;
          font-size: 0.58rem;
        }

        .withinCard ol {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .withinCard li {
          min-height: 43px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 9px;
          padding: 8px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.055);
        }

        .withinCard li:last-child { border-bottom: 0; }
        .withinCard li:hover { background: rgba(255, 255, 255, 0.025); }

        .withinCard a {
          min-width: 0;
          color: #e7e9e8;
          font-size: 0.65rem;
          font-weight: 850;
          text-decoration: none;
          overflow-wrap: anywhere;
        }

        .withinCard a:hover { color: #ef5961; }

        .withinCard li > div {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .withinCard li strong { color: var(--gold); font-size: 0.7rem; }
        .withinCard li span { color: #74c887; font-size: 0.43rem; font-weight: 950; letter-spacing: 0.06em; }
        .empty { margin: 0; padding: 18px 12px; color: #70787c; font-size: 0.63rem; line-height: 1.5; }

        .researchCallout {
          margin-top: 30px;
          grid-template-columns: minmax(0, 1fr) auto;
          background:
            linear-gradient(135deg, rgba(189, 23, 33, 0.15), transparent 58%),
            #101417;
        }

        .researchCallout p { margin-top: 8px; }

        .researchLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .researchLinks a {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          border: 1px solid rgba(233, 220, 194, 0.22);
          color: #ece9e3;
          text-decoration: none;
          font-size: 0.58rem;
          font-weight: 950;
          letter-spacing: 0.045em;
          text-transform: uppercase;
        }

        .researchLinks a:hover { border-color: var(--gold); color: #fff; }

        @media (max-width: 1180px) {
          .withinGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }

        @media (max-width: 900px) {
          .heroInner,
          .content { width: min(100% - 24px, 1380px); }
          .scopePanel,
          .researchCallout { grid-template-columns: 1fr; }
          .researchLinks { justify-content: flex-start; }
          .withinGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 760px) {
          .eyebrow { margin-top: 40px; }
          .milestoneHero h1 { font-size: clamp(2.9rem, 14vw, 5rem); }
          .heroStats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .desktopTable { display: none; }
          .mobileCards { display: grid; gap: 8px; margin-top: 12px; }
          .sectionHeading { align-items: flex-start; flex-direction: column; gap: 6px; }

          .mobileMilestoneCard {
            position: relative;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 11px;
            align-items: center;
            min-height: 76px;
            padding: 10px 38px 10px 10px;
            border: 1px solid var(--line);
            background: #0d1114;
            color: #fff;
            text-decoration: none;
          }

          .mobileCopy strong { display: block; color: #fff; font-size: 0.78rem; font-weight: 950; }
          .mobileCopy p { margin: 5px 0 2px; color: var(--gold); font-size: 0.65rem; font-weight: 850; }
          .mobileCopy small { color: #7f878b; font-size: 0.56rem; }
          .mobileActive { color: #74c887; font-size: 0.45rem; font-weight: 950; letter-spacing: 0.06em; }
          .arrow { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); color: #777f83; font-size: 1.25rem; }
        }

        @media (max-width: 580px) {
          .heroStats { grid-template-columns: 1fr; }
          .heroStats div { min-height: 72px; }
          .withinGrid { grid-template-columns: 1fr; }
          .scopePanel { padding: 17px; }
          .researchLinks { display: grid; grid-template-columns: 1fr; }
          .researchLinks a { justify-content: center; }
        }
      `}</style>
    </main>
  );
}
