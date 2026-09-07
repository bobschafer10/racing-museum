import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getPhotoUrl } from '@/lib/photos'
import '../media/archive-dark.css'

export const dynamic = 'force-dynamic'
const PAGE_SIZE = 60

type SearchParams = { q?: string; driver?: string; photographer?: string; track?: string; year?: string; credit?: string; page?: string }

export default async function PhotosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page || 1) || 1)
  const from = (page-1)*PAGE_SIZE
  const to = from+PAGE_SIZE-1

  let query = supabase.from('photos').select('*',{count:'exact'}).order('year',{ascending:false,nullsFirst:false}).order('file_name',{ascending:true})
  if (params.driver) query=query.eq('driver_slug',params.driver)
  if (params.photographer) query=query.eq('photographer_slug',params.photographer)
  if (params.track) query=query.eq('track_slug',params.track)
  if (params.year) query=query.eq('year',params.year)
  if (params.credit) query=query.eq('credit_type',params.credit)
  if (params.q) query=query.or(`file_name.ilike.%${params.q}%,driver_slug.ilike.%${params.q}%,photographer_slug.ilike.%${params.q}%,track_slug.ilike.%${params.q}%`)

  const [{data:photos,count},{data:filterRows}] = await Promise.all([
    query.range(from,to),
    supabase.from('photos').select('driver_slug,photographer_slug,track_slug,year,credit_type').limit(10000),
  ])

  const rows = photos || []
  const total = count || 0
  const totalPages = Math.max(1,Math.ceil(total/PAGE_SIZE))
  const drivers=uniqueClean(filterRows?.map((p:any)=>p.driver_slug))
  const photographers=uniqueClean(filterRows?.map((p:any)=>p.photographer_slug))
  const tracks=uniqueClean(filterRows?.map((p:any)=>p.track_slug))
  const years=uniqueClean(filterRows?.map((p:any)=>p.year)).sort((a,b)=>Number(b)-Number(a))
  const credits=uniqueClean(filterRows?.map((p:any)=>p.credit_type))
  const hero=rows[0]
  const selectedPhotographer=params.photographer?formatSlugName(params.photographer):null
  const selectedDriver=params.driver?formatSlugName(params.driver):null
  const selectedTrack=params.track?formatSlugName(params.track):null
  const title=selectedPhotographer?`${selectedPhotographer} Photos`:selectedDriver?`${selectedDriver} Photos`:selectedTrack?`${selectedTrack} Photos`:'Photo Archive'

  const makeUrl=(targetPage:number)=>{const sp=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{if(v&&k!=='page')sp.set(k,v)});if(targetPage>1)sp.set('page',String(targetPage));const s=sp.toString();return `/photos${s?`?${s}`:''}`}

  return <main className="ma-page">
    <section className="ma-hero" style={hero ? {backgroundImage:`linear-gradient(90deg,rgba(5,8,10,.97),rgba(5,8,10,.8) 50%,rgba(5,8,10,.44)),url(${photoUrl(hero)})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>
      <div className="ma-hero-inner"><div className="ma-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><span>Photos</span></div><div className="ma-hero-grid"><div><div className="ma-eyebrow">Museum Photo Collection</div><h1 className="ma-title">{title}</h1><div className="ma-subtitle">Search the Complete Racing Image Archive</div><p className="ma-lede">Browse racing photography connected to drivers, tracks, years, and credited photographers throughout the Upper Midwest Auto Racing Museum.</p><div className="ma-actions"><Link href="/media" className="ma-button">Media Archive</Link><Link href="/photographers" className="ma-button-ghost">Photographer Directory</Link></div></div></div><div className="ma-stats"><div className="ma-stat"><strong>{total.toLocaleString()}</strong><span>Matching Photos</span></div><div className="ma-stat"><strong>{page}</strong><span>Current Page</span></div><div className="ma-stat"><strong>{totalPages}</strong><span>Archive Pages</span></div><div className="ma-stat"><strong>{params.year || 'All'}</strong><span>Year Filter</span></div><div className="ma-stat"><strong>{params.credit ? formatSlugName(params.credit) : 'All'}</strong><span>Credit Type</span></div></div></div>
    </section>

    <section className="ma-section"><form action="/photos" className="ma-filter"><input name="q" defaultValue={params.q||''} placeholder="Search photos..."/><select name="driver" defaultValue={params.driver||''}><option value="">All Drivers</option>{drivers.map(v=><option key={v} value={v}>{formatSlugName(v)}</option>)}</select><select name="photographer" defaultValue={params.photographer||''}><option value="">All Photographers</option>{photographers.map(v=><option key={v} value={v}>{formatSlugName(v)}</option>)}</select><select name="track" defaultValue={params.track||''}><option value="">All Tracks</option>{tracks.map(v=><option key={v} value={v}>{formatSlugName(v)}</option>)}</select><select name="year" defaultValue={params.year||''}><option value="">All Years</option>{years.map(v=><option key={v} value={v}>{v}</option>)}</select><button type="submit">Search Archive</button></form></section>

    <section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">Research Results</div><h2 className="ma-h2">Photo Collection</h2></div><div className="ma-note">Showing {rows.length} photos on page {page} of {totalPages}.</div></div><div className="ma-photo-grid">{rows.map((photo:any)=><article key={photo.file_name} className="ma-photo-card"><Link href={`/photo/${encodeURIComponent(photo.file_name)}`}><img src={photoUrl(photo)} alt={formatSlugName(photo.driver_slug)} loading="lazy"/></Link><div className="body"><h3><Link href={`/photo/${encodeURIComponent(photo.file_name)}`}>{formatSlugName(photo.driver_slug)}</Link></h3><p><span className="ma-gold">{photo.year||'Year unknown'}</span> • {formatSlugName(photo.track_slug)}</p><p>{formatCredit(photo.credit_type,photo.photographer_slug)}</p></div></article>)}</div>
    {totalPages>1?<div className="ma-actions" style={{justifyContent:'space-between',marginTop:18}}>{page>1?<Link href={makeUrl(page-1)} className="ma-button-ghost">← Previous Page</Link>:<span/>}<span className="ma-muted" style={{fontSize:11,alignSelf:'center'}}>Page {page} of {totalPages}</span>{page<totalPages?<Link href={makeUrl(page+1)} className="ma-button">Next Page →</Link>:<span/>}</div>:null}</section>

    <section className="ma-section"><div className="ma-footer-links"><Link href="/photographers" className="ma-footer-link">Photographer Archive<span>Browse collections →</span></Link><Link href="/media/race-programs" className="ma-footer-link">Race Programs<span>Browse printed archive →</span></Link><Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link></div></section>
  </main>
}

function photoUrl(photo:any){return getPhotoUrl(`photos/master/${photo.track_slug}/${photo.year||'unknown-year'}/${photo.file_name}`)}
function uniqueClean(values:any[]|undefined){return Array.from(new Set((values||[]).filter(Boolean).map(v=>String(v)).filter(v=>!['unknown','unknown-driver','unknown-track','unknown-photographer','unknown-credit','year-unknown','unknown-year'].includes(v)))).sort()}
function formatSlugName(value:string|null|undefined){if(!value)return'Unknown';return value.replace(/_/g,'-').split('-').filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')}
function formatCredit(value:string|null,photographer:string|null){const name=formatSlugName(photographer);if(!value||value==='photo')return `${name} Photo`;if(value==='post')return `${name} Post`;return `${name} ${formatSlugName(value)}`}