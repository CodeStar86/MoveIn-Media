import { useState } from 'react'

type Category='decluttering'|'staging'
const sets={
 decluttering:[
  ['/portfolio/declutter-living.png','Living room'],['/portfolio/declutter-dining.png','Living / dining'],['/portfolio/declutter-loft.png','Loft living space'],['/portfolio/declutter-bedroom.png','Bedroom'],['/portfolio/declutter-balcony.png','Balcony'],['/portfolio/declutter-office.png','Home office'],
 ],
 staging:[
  ['/portfolio/stage-living.png','Living room'],['/portfolio/stage-fireplace.png','Reception room'],['/portfolio/stage-lounge.png','Lounge'],['/portfolio/stage-bedroom.png','Bedroom'],['/portfolio/stage-bathroom.png','Bathroom'],
 ]
}
export default function BeforeAfterPage(){
 const [cat,setCat]=useState<Category>('decluttering')
 return <div className="portfolio-page">
  <section className="page-hero"><div className="shell"><div className="eyebrow light">MOVEIN MEDIA PORTFOLIO</div><h1>Before & after.</h1><p>Real examples created for the MoveIn Media service concept. See how professional post-production can clean up occupied spaces or help empty rooms communicate their potential.</p></div></section>
  <section className="shell gallery-section">
   <div className="gallery-tabs"><button className={cat==='decluttering'?'active':''} onClick={()=>setCat('decluttering')}>Digital Decluttering</button><button className={cat==='staging'?'active':''} onClick={()=>setCat('staging')}>Virtual Staging</button></div>
   <div className="gallery-intro"><h2>{cat==='decluttering'?'Cleaner presentation. Same property.':'Empty to aspirational.'}</h2><p>{cat==='decluttering'?'Decluttering removes appropriate movable distractions without adding new objects or changing permanent property features.':'Virtual staging adds realistic furnishings to suitable empty spaces while preserving the underlying room.'}</p></div>
   <div className="ba-gallery">{sets[cat].map(([src,label],i)=><figure className={i===0?'wide':''} key={src}><img src={src} alt={`${label} before and after`}/><figcaption><span>{cat==='decluttering'?'DIGITAL DECLUTTERING':'VIRTUAL STAGING'}</span><b>{label}</b></figcaption></figure>)}</div>
  </section>
 </div>
}
