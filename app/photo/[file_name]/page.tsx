import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPhotoUrl } from '@/lib/photos'
import '../../media/archive-dark.css'

export const dynamic = 'force-dynamic'

type PhotoRecord = { photo_id:number; file_name:string; track_slug:string|null; year:string|null; driver_slug:string|null; photographer_slug:string|null; credit_type:string|null }

export default async function PhotoDetailPage({ params }: { params: Promise<{ file_name:string }> }) {
  const { file_name } = await params
  const decoded = decodeURIComponent(file_name)
  const { data } = await supabase.from('photos').select('photo_id,file_name,track_slug,year,driver_slug,photographer_slug,credit_type').eq('file_name',decoded).maybeSingle()
  if (!data) notFound()
  const photo = data as PhotoRecord
  const imageUrl = photoUrl(photo)

  let relatedQuery = supabase.from('photos').select('photo_id,file_name,track_slug,year,driver_slug,photographer_slug,credit_type').neq('file_name',photo.file_name).limit(8)
  if (photo.driver_slug && !isUnknown(photo.driver_slug)) relatedQuery = relatedQuery.eq('driver_slug',photo.driver_slug)
  else if (photo.track_slug) relatedQuery = relatedQuery.eq('track_slug',photo.track_slug)
  const { data: related } = await relatedQuery

  const driverName = formatSlugName(photo.driver_slug)
  const photographerName = formatSlugName(photo.photographer_slug)
  const trackName = formatSlugName(photo.track_slug)

  return <main className="ma-page">
    <section className="ma-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(5,8,10,.98),rgba(5,8,10,.84) 48%,rgba(5,8,10,.48)),url(${imageUrl})`,backgroundSize:'cover',backgroundPosition:'center'}}>
      <div className="ma-hero-inner"><div className="ma-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><Link href="/photos">Photos</Link><span>›</span><span>{driverName}</span></div><div className="ma-hero-grid"><div><div className="ma-eyebrow">Museum Photo Archive</div><h1 className="ma-title">{driverName}</h1><div className="ma-subtitle">{photo.year && photo.year!=='unknown-year' ? photo.year : 'Year Unknown'} • {trackName}</div><p className="ma-lede">A preserved racing photograph connected to the museum's driver, track, year, and photographer research indexes.</p><div className="ma-actions"><Link href="/photos" className="ma-button">Browse Photo Archive</Link>{photo.photographer_slug && !isUnknown(photo.photographer_slug)?<Link href={`/photographers/${photo.photographer_slug}`} className="ma-button-ghost">{photographerName} Collection</Link>:null}</div></div></div><div className="ma-stats"><div className="ma-stat"><strong>{photo.year && photo.year!=='unknown-year'?photo.year:'—'}</strong><span>Year</span></div><div className="ma-stat"><strong>{driverName==='Unknown'?'—':driverName.split(' ').slice(-1)[0]}</strong><span>Driver</span></div><div className="ma-stat"><strong>{trackName==='Unknown'?'—':trackName.split(' ')[0]}</strong><span>Track</span></div><div className="ma-stat"><strong>{photographerName==='Unknown'?'—':photographerName.split(' ').slice(-1)[0]}</strong><span>Photographer</span></div><div className="ma-stat"><strong>#{photo.photo_id}</strong><span>Museum Photo ID</span></div></div></div>
    </section>

    <section className="ma-section"><div className="ma-grid-2" style={{gridTemplateColumns:'minmax(0,2fr) minmax(280px,1fr)'}}><div className="ma-panel" style={{display:'grid',placeItems:'center'}}><img src={imageUrl} alt={driverName} style={{width:'100%',maxHeight:'78vh',objectFit:'contain',display:'block'}}/></div><aside className="ma-panel"><div className="ma-kicker">Archive Metadata</div><h2 className="ma-h2" style={{fontSize:28,marginBottom:18}}>Photo Record</h2>{[['Driver',driverName],['Track',trackName],['Year',photo.year&&photo.year!=='unknown-year'?photo.year:'Year Unknown'],['Credit',formatCreditLine(photo.credit_type,photo.photographer_slug)],['File',photo.file_name]].map(([label,value])=><div key={label} style={{borderTop:'1px solid #283036',padding:'12px 0'}}><div className="ma-card-label">{label}</div><div style={{marginTop:5,color:'#fff',fontSize:13,wordBreak:'break-word'}}>{value}</div></div>)}<div className="ma-actions">{photo.driver_slug&&!isUnknown(photo.driver_slug)?<Link href={`/photos?driver=${encodeURIComponent(photo.driver_slug)}`} className="ma-button-ghost">More of This Driver</Link>:null}{photo.track_slug?<Link href={`/photos?track=${encodeURIComponent(photo.track_slug)}`} className="ma-button-ghost">More From This Track</Link>:null}</div></aside></div></section>

    {(related||[]).length>0?<section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">Connected Archive</div><h2 className="ma-h2">Related Photographs</h2></div><div className="ma-note">More images tied to the same driver or track.</div></div><div className="ma-grid-4">{(related||[]).map((r:any)=><Link href={`/photo/${encodeURIComponent(r.file_name)}`} className="ma-card" key={r.file_name}><div className="ma-card-media"><img src={photoUrl(r)} alt={formatSlugName(r.driver_slug)}/></div><div className="ma-card-body"><div className="ma-card-label">{r.year||'Year unknown'}</div><div className="ma-card-title">{formatSlugName(r.driver_slug)}</div><div className="ma-card-meta">{formatSlugName(r.track_slug)}</div><span className="ma-card-link">Open photo →</span></div></Link>)}</div></section>:null}

    <section className="ma-section"><div className="ma-footer-links"><Link href="/photos" className="ma-footer-link">Photo Archive<span>Search all photography →</span></Link><Link href="/photographers" className="ma-footer-link">Photographers<span>Browse credited collections →</span></Link><Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link></div></section>
  </main>
}

function photoUrl(photo:any){return getPhotoUrl(`photos/master/${photo.track_slug||'unknown-track'}/${photo.year||'unknown-year'}/${photo.file_name}`)}
function isUnknown(v:string|null|undefined){return !v||['unknown','unknown-driver','unknown-track','unknown-photographer','unknown-credit'].includes(v)}
function formatSlugName(value:string|null|undefined){if(isUnknown(value))return'Unknown';return String(value).replace(/_/g,'-').split('-').filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')}
function formatCreditLine(type:string|null,photographer:string|null){const name=formatSlugName(photographer);if(!type||type==='photo')return `${name} Photo`;if(type==='post')return `${name} Post`;return `${name} ${formatSlugName(type)}`}