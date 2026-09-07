import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import '../media/archive-dark.css'

export const dynamic = 'force-dynamic'
export const revalidate = 300

type SearchParams = Promise<{ q?: string }>

function formatSlugName(value: string) { return value.split('-').map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' ') }
function getPhotoUrl(photo: any) {
  if (!photo?.file_name) return ''
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawTrackSlug = photo.track_slug || photo.file_name.split('_')[0]
  const trackSlug = rawTrackSlug.replace(/-(wi|il|mn|mi)$/i, '')
  const year = photo.year || photo.file_name.split('_')[1] || 'unknown-year'
  return `${baseUrl}/storage/v1/object/public/media/photos/master/${trackSlug}/${year}/${photo.file_name}`
}

export default async function PhotographersPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {}
  const q = (params?.q || '').trim().toLowerCase()

  const [{ data, error }, { data: samplePhotos }] = await Promise.all([
    supabase.from('photographer_directory_view').select('photographer_slug, photographer_name, total_items, photo_count, post_count').order('total_items',{ascending:false}).limit(2000),
    supabase.from('photos').select('photographer_slug, track_slug, file_name, credit_type, year').neq('credit_type','unknown').not('photographer_slug','is',null).not('file_name','is',null).order('year',{ascending:false,nullsFirst:false}).order('sequence',{ascending:true}).limit(5000),
  ])

  if (error) return <main className="ma-page"><section className="ma-section"><div className="ma-source">Unable to load photographer archive.</div></section></main>

  const sampleMap = new Map<string,any>()
  for (const photo of samplePhotos || []) if (photo.photographer_slug && !sampleMap.has(photo.photographer_slug)) sampleMap.set(photo.photographer_slug,photo)

  const photographers = (data || []).filter((p:any)=>p.photographer_slug && !p.photographer_slug.includes('#') && !/^\d/.test(p.photographer_slug) && p.photographer_slug.length>=3 && !['unknown','unknown-credit','unknown-photographer','photo'].includes(p.photographer_slug)).map((p:any)=>({slug:p.photographer_slug,name:p.photographer_name||formatSlugName(p.photographer_slug),total:Number(p.total_items||0),photos:Number(p.photo_count||0),posts:Number(p.post_count||0),samplePhoto:sampleMap.get(p.photographer_slug)}))

  const filtered = q ? photographers.filter(p => p.name.toLowerCase().includes(q) || p.slug.includes(q)) : photographers
  const top = photographers.slice(0,12)
  const totalPhotos = photographers.reduce((sum,p)=>sum+p.photos,0)
  const heroPhoto = top.find(p=>p.samplePhoto)?.samplePhoto
  const heroUrl = heroPhoto ? getPhotoUrl(heroPhoto) : ''

  return <main className="ma-page">
    <section className="ma-hero" style={heroUrl ? {backgroundImage:`linear-gradient(90deg,rgba(5,8,10,.97),rgba(5,8,10,.82) 50%,rgba(5,8,10,.48)),url(${heroUrl})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>
      <div className="ma-hero-inner"><div className="ma-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><span>Photographers</span></div><div className="ma-hero-grid"><div><div className="ma-eyebrow">Through the Lens</div><h1 className="ma-title">Photographer Archive</h1><div className="ma-subtitle">The People Who Preserved Race Night</div><p className="ma-lede">Explore credited photographers and contributors whose images document drivers, cars, tracks, crews, victory lanes, and the atmosphere surrounding Upper Midwest auto racing.</p><div className="ma-actions"><Link href="/media" className="ma-button">Back to Media Archive</Link><Link href="/photos" className="ma-button-ghost">Complete Photo Archive</Link></div></div></div><div className="ma-stats"><div className="ma-stat"><strong>{photographers.length.toLocaleString()}</strong><span>Indexed Sources</span></div><div className="ma-stat"><strong>{totalPhotos.toLocaleString()}</strong><span>Credited Photos</span></div><div className="ma-stat"><strong>{top[0]?.photos.toLocaleString() || '—'}</strong><span>Largest Photo Collection</span></div><div className="ma-stat"><strong>{top[0]?.name?.split(' ').slice(-1)[0] || '—'}</strong><span>Leading Contributor</span></div><div className="ma-stat"><strong>Growing</strong><span>Research Collection</span></div></div></div>
    </section>

    <section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">Museum Highlights</div><h2 className="ma-h2">Leading Contributors</h2></div><div className="ma-note">The largest currently indexed credited collections in the museum.</div></div><div className="ma-leader-grid">{top.map((p,index)=><Link key={p.slug} href={`/photographers/${p.slug}`} className="ma-leader-card" style={{textDecoration:'none'}}>{p.samplePhoto ? <img src={getPhotoUrl(p.samplePhoto)} alt={p.name} /> : <div style={{width:92,height:76,display:'grid',placeItems:'center',background:'#171c20',color:'#8f979d',fontSize:10}}>NO IMAGE</div>}<div><div className="ma-card-label">#{index+1} • Photographer Archive</div><strong>{p.name}</strong><span>{p.photos.toLocaleString()} photos • {p.total.toLocaleString()} archive items</span><span className="ma-red">View collection →</span></div></Link>)}</div></section>

    <section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">Research Directory</div><h2 className="ma-h2">Photographers & Sources</h2></div><div className="ma-note">{filtered.length.toLocaleString()} collections shown.</div></div><form action="/photographers" className="ma-filter" style={{gridTemplateColumns:'1fr auto',marginBottom:10}}><input name="q" defaultValue={params?.q||''} placeholder="Search photographers or contributors..."/><button type="submit">Search</button></form><div className="ma-directory"><div className="ma-row head"><span>Photographer / Source</span><span>Photos</span><span>Posts</span><span>Total Items</span><span>Collection</span></div>{filtered.map(p=><div className="ma-row" key={p.slug}><strong><Link href={`/photographers/${p.slug}`}>{p.name}</Link></strong><span>{p.photos.toLocaleString()}</span><span>{p.posts.toLocaleString()}</span><span>{p.total.toLocaleString()}</span><Link href={`/photographers/${p.slug}`} className="ma-red">View →</Link></div>)}</div></section>

    <section className="ma-section"><div className="ma-footer-links"><Link href="/photos" className="ma-footer-link">Photo Archive<span>Browse all photography →</span></Link><Link href="/media/race-programs" className="ma-footer-link">Race Programs<span>Browse printed history →</span></Link><Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link></div></section>
  </main>
}