import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "./newspapers.css";

const PUBLICATIONS: Record<string, string> = {
  "checkered-flag-racing-news": "Checkered Flag Racing News",
  "midwest-racing-news": "Midwest Racing News",
  "national-speed-sport-news": "National Speed Sport News",
};

async function listFolders(path: string) {
  const { data, error } = await supabase.storage.from("media").list(path, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error || !data) return [];
  return data.filter((item) => !item.name.includes("."));
}

export default async function NewspapersPage() {
  const publicationFolders = await listFolders("newspapers");

  const publications = await Promise.all(
    publicationFolders.map(async (pub) => {
      const issueFolders = await listFolders(`newspapers/${pub.name}`);
      const years: Record<string, number> = {};

      issueFolders.forEach((issue) => {
        const year = issue.name.substring(0, 4);
        if (/^\d{4}$/.test(year)) {
          years[year] = (years[year] || 0) + 1;
        }
      });

      const sortedYears = Object.keys(years).sort();

      return {
        slug: pub.name,
        name: PUBLICATIONS[pub.name] || pub.name,
        issueCount: issueFolders.length,
        years,
        firstYear: sortedYears[0],
        lastYear: sortedYears[sortedYears.length - 1],
      };
    })
  );

  const totalIssues = publications.reduce((sum, pub) => sum + pub.issueCount, 0);
  const allYears = new Set(publications.flatMap((pub) => Object.keys(pub.years)));

  return (
    <main className="newspapers-page">
      <section className="newspapers-hero">
        <div>
          <p className="eyebrow">Media Archive</p>
          <h1>Newspapers</h1>
          <p className="hero-text">
            Browse historic racing newspapers by publication, year, and issue.
          </p>
        </div>
      </section>

      <div className="newspapers-layout">
        <aside className="publication-sidebar">
          <h2>Newspaper Publications</h2>

          {publications.map((pub) => (
            <Link key={pub.slug} href={`/media/newspapers/${pub.slug}`} className="publication-card">
              <div className="publication-logo">{pub.name}</div>
              <h3>{pub.name}</h3>
              <p>{pub.firstYear} – {pub.lastYear}</p>
              <strong>{pub.issueCount.toLocaleString()} Issues</strong>
              <span>Browse Archive →</span>
            </Link>
          ))}

          <div className="archive-stats">
            <h2>Archive Statistics</h2>
            <div><strong>{totalIssues.toLocaleString()}</strong><span>Total Issues</span></div>
            <div><strong>{publications.length}</strong><span>Publications</span></div>
            <div><strong>{allYears.size}</strong><span>Years Covered</span></div>
          </div>
        </aside>

        <section className="archive-main">
          <section className="year-browser">
            <div className="section-title">
              <span>▣</span>
              <h2>Browse by Year</h2>
            </div>

            {publications.map((pub) => (
              <div key={pub.slug} className="publication-year-group">
                <div className="publication-year-header">
                  <h3>{pub.name}</h3>
                  <p>{pub.firstYear} – {pub.lastYear} · {pub.issueCount.toLocaleString()} Issues</p>
                </div>

                <div className="year-grid">
                  {Object.entries(pub.years).map(([year, count]) => (
                    <Link
                      key={year}
                      href={`/media/newspapers/${pub.slug}/year/${year}`}
                      className="year-card"
                    >
                      <strong>{year}</strong>
                      <span>{count} Issues</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}