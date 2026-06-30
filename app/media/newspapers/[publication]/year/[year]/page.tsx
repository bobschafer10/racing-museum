import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "../../../newspapers.css";

const PUBLICATIONS: Record<string, string> = {
  "checkered-flag-racing-news": "Checkered Flag Racing News",
  "midwest-racing-news": "Midwest Racing News",
  "national-speed-sport-news": "National Speed Sport News",
};

async function listFolders(supabase: any, path: string) {
  const { data, error } = await supabase.storage.from("media").list(path, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error || !data) return [];
  return data.filter((item: any) => !item.name.includes("."));
}

function prettyDate(folderName: string) {
  const [year, month, day] = folderName.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function NewspaperYearPage({
  params,
}: {
  params: Promise<{ publication: string; year: string }>;
}) {
  const { publication, year } = await params;
  

  const issueFolders = await listFolders(
    supabase,
    `newspapers/${publication}`
  );

  const issues = issueFolders.filter((issue: any) =>
    issue.name.startsWith(`${year}-`)
  );

  if (!issues.length) notFound();

  const publicationName = PUBLICATIONS[publication] || publication;

  return (
    <main className="newspapers-page">
      <section className="newspapers-hero compact">
        <div>
          <p className="eyebrow">Newspaper Archive</p>
          <h1>
            {publicationName} — {year}
          </h1>
          <p className="hero-text">
            {issues.length} available issue{issues.length === 1 ? "" : "s"} from{" "}
            {year}.
          </p>

          <div className="breadcrumb-links">
            <Link href="/media/newspapers">Newspapers</Link>
            <span>›</span>
            <Link href={`/media/newspapers/${publication}`}>
              {publicationName}
            </Link>
          </div>
        </div>
      </section>

      <section className="issue-browser full-width">
        <div className="section-title">
          <span>▣</span>
          <h2>{year} Issues</h2>
        </div>

        <div className="issue-grid">
          {issues.map((issue: any) => (
            <Link
              key={issue.name}
              href={`/media/newspapers/viewer?publication=${publication}&issue=${issue.name}`}
              className="issue-card"
            >
              <div className="issue-cover-placeholder">
                <span>Newspaper Issue</span>
              </div>

              <strong>{prettyDate(issue.name)}</strong>
              <span>Open Issue →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}