import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "../newspapers.css";

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

export default async function PublicationPage({
  params,
}: {
  params: Promise<{ publication: string }>;
}) {
  const { publication } = await params;

  const issueFolders = await listFolders(`newspapers/${publication}`);
  if (!issueFolders.length) notFound();

  const years: Record<string, number> = {};

  issueFolders.forEach((issue) => {
    const year = issue.name.substring(0, 4);
    if (/^\d{4}$/.test(year)) {
      years[year] = (years[year] || 0) + 1;
    }
  });

  const sortedYears = Object.keys(years).sort();
  const publicationName = PUBLICATIONS[publication] || publication;

  return (
    <main className="newspapers-page">
      <section className="newspapers-hero compact">
        <div>
          <p className="eyebrow">Newspaper Archive</p>
          <h1>{publicationName}</h1>
          <p className="hero-text">
            Browse available years from the {publicationName} archive.
          </p>

          <Link href="/media/newspapers" className="back-link">
            ← Back to Newspapers
          </Link>
        </div>
      </section>

      <section className="year-browser full-width">
        <div className="publication-year-group">
          <div className="publication-year-header">
            <h3>{publicationName}</h3>
            <p>
              {sortedYears[0]} – {sortedYears[sortedYears.length - 1]} ·{" "}
              {issueFolders.length.toLocaleString()} Issues
            </p>
          </div>

          <div className="year-grid">
            {sortedYears.map((year) => (
              <Link
                key={year}
                href={`/media/newspapers/${publication}/year/${year}`}
                className="year-card"
              >
                <strong>{year}</strong>
                <span>{years[year]} Issues</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}