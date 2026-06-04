export type NewspaperPublicationStatus = "active" | "coming-soon"

export type NewspaperPublication = {
  slug: string
  name: string
  logo?: string
  status: NewspaperPublicationStatus
}

export const newspaperPublications: NewspaperPublication[] = [
  {
    slug: "all",
    name: "All Publications",
    status: "active",
  },
  {
    slug: "all-the-dirt-racing-news",
    name: "All the Dirt Racing News",
    logo: "/logos/newspapers/all-the-dirt-racing-news.jpg",
    status: "active",
  },
  {
    slug: "checkered-flag-racing-news",
    name: "Checkered Flag Racing News",
    logo: "/logos/newspapers/checkered-flag-racing-news.jpg",
    status: "active",
  },
  {
    slug: "midwest-racing-news",
    name: "Midwest Racing News",
    logo: "/logos/newspapers/midwest-racing-news.jpg",
    status: "active",
  },
  {
    slug: "national-speed-sport-news",
    name: "National Speed Sport News",
    logo: "/logos/newspapers/national-speed-sport-news.jpg",
    status: "active",
  },
  {
    slug: "marc-times-racing-news",
    name: "Marc Times Racing News",
    logo: "/logos/newspapers/marc-times-racing-news.jpg",
    status: "coming-soon",
  },
  {
  slug: "hawkeye-racing-news",
  name: "Hawkeye Racing News",
  logo: "/logos/newspapers/hawkeye-racing-news.jpg",
  status: "active",
},
  {
    slug: "mid-american-auto-racing-news",
    name: "Mid-American Auto Racing News",
    logo: "/logos/newspapers/mid-american-auto-racing-news.jpg",
    status: "coming-soon",
  },
]