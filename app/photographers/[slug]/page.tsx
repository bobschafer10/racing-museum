import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPhotoUrl } from '@/lib/photos'
import '../../media/archive-dark.css'

export const revalidate = 300
const PAGE_SIZE = 60

type SearchParams = Promise<{ page?: string }>

function fmt(value: string | null | undefined) { if (!value) return 'Unknown'; return value.replace(/_/g,'-').split('-').filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ') }
function imageUrl(photo:any) { return getPhotoUrl(`photos/master/${photo.track_slug}/${photo.year || 'unknown-year'}/${photo.file_name}`) }

export default async function PhotographerProfilePage({ params, searchParams }: { params: Promise<{slug:string}>, searchParams?: SearchParams }) {
  const { slug } = await params
  const sp = searchParams ? await searchParams : {}
  const page = Math.max(1, Number(sp?.page || 1) || 1)
  const from = (page-1)*PAGE_SIZE
  const to = from+PAGE_SIZE-1

  const [{ data: profile }, { data: photos, count }, { data: footprint }] = await Promise.all([
    supabase.from('photographer_directory_view').select('photographer_slug, photographer_name, total_items, photo_count, post_count').eq('photographer_slug',slug).maybeSingle(),
    supabase.from('photos').select('*',{count:'exact'}).eq('photographer_slug',slug).order('year',{ascending:false,nullsFirst:false}).order('sequence',{ascending:true}).range(from,to),
    supabase.from('photos').select('track_slug,driver_slug,year').eq('photographer_slug',slug).limit(10000),
  ])

  if (!profile || !count) notFound()
  const name = profile.photographer_name || fmt(slug)
  const rows = photos || []
  const hero = rows[0]
  const tracks = new Set((footprint||[]).map((r:any)=>r.track_slug).filter(Boolean))
  const drivers = new Set((footprint||[]).map((r:any)=>r.driver_slug).filter(Boolean))
  const years = (footprint||[]).map((r:any)=>Number(r.year)).filter((y:number)=>Number.isFinite(y))
  const firstYear = years.length ? Math.min(...years) : null
  const lastYear = years.length ? Math.max(...years) : null
  const totalPages = Math.max(1,Math.ceil(count/PAGE_SIZE))

  return <main className="ma-page">
    <section className="ma-hero" style={hero ? {backgroundImage:`linear-gradient(90deg,rgba(5,8,10,.97),rgba(5,8,10,.8) 50%,rgba(5,8,10,.45)),url(${imageUrl(hero)})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>
      <div className="ma-hero-inner"><div className="ma-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><Link href="/photographers">Photographers</Link><span>›</span><span>{name}</span></div>
      <div className="ma-profile-hero">{hero ? <img src={imageUrl(hero)} alt={name} className="ma-profile-photo" /> : <div className="ma-profile-photo"/>}<div><div className="ma-eyebrow">Photographer / Contributor Archive</div><h1 className="ma-title">{name}</h1><div className="ma-subtitle">{firstYear && lastYear ? `${firstYear}–${lastYear}` : 'Museum Photo Collection'}</div><p className="ma-lede">A connected museum collection of racing photographs credited to {name}, linked back to drivers, tracks, years, and individual photo records.</p><div className="ma-actions"><Link href="/photographers" className="ma-button">Photographer Directory</Link><Link href={`/photos?photographer=${slug}`} className="ma-button-ghost">Advanced Photo Search</Link></div></div></div>
      <div className="ma-stats"><div className="ma-stat"><strong>{count.toLocaleString()}</strong><span>Archived Photos</span></div><div className="ma-stat"><strong>{tracks.size.toLocaleString()}</strong><span>Tracks Represented</span></div><div className="ma-stat"><strong>{drivers.size.toLocaleString()}</strong><span>Drivers Connected</span></div><div className="ma-stat"><strong>{firstYear ?? '—'}</strong><span>Earliest Year</span></div><div className="ma-stat"><strong>{lastYear ?? '—'}</strong><span>Latest Year</span></div></div></div>
    </section>

    <section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">Museum Photo Collection</div><h2 className="ma-h2">Photography Archive</h2></div><div className="ma-note">Page {page} of {totalPages} • {count.toLocaleString()} photographs indexed.</div></div><div className="ma-photo-grid">{rows.map((photo:any)=><article className="ma-photo-card" key={photo.file_name}><Link href={`/photo/${encodeURIComponent(photo.file_name)}`}><img src={imageUrl(photo)} alt={fmt(photo.driver_slug)} loading="lazy" /></Link><div className="body"><h3><Link href={`/photo/${encodeURIComponent(photo.file_name)}`}>{fmt(photo.driver_slug)}</Link></h3><p><span className="ma-gold">{photo.year || 'Year unknown'}</span> • {fmt(photo.track_slug)}</p><p>{name}</p></div></article>)}</div>
      {totalPages>1 ? <div className="ma-actions" style={{justifyContent:'space-between',marginTop:18}}>{page>1 ? <Link className="ma-button-ghost" href={`/photographers/${slug}?page=${page-1}`}>← Previous Page</Link>:<span/>}<span className="ma-muted" style={{fontSize:11,alignSelf:'center'}}>Page {page} of {totalPages}</span>{page<totalPages ? <Link className="ma-button" href={`/photographers/${slug}?page=${page+1}`}>Next Page →</Link>:<span/>}</div>:null}
    </section>

    <section className="ma-section"><div className="ma-footer-links"><Link href="/photographers" className="ma-footer-link">Photographers<span>Browse all collections →</span></Link><Link href="/photos" className="ma-footer-link">Photo Archive<span>Search all photography →</span></Link><Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link></div></section>
  </main>
}