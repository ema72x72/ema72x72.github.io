/* Academic Manager — verified coauthor relationships from the existing public archive projection.
   No independent bibliography, private records or inferred collaborations. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const H=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const normalize=n=>String(n||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,' ').toLowerCase().trim();
const palette=['#287cbf','#36a087','#9061ba','#da9850','#628cbd','#b45c87','#578d80','#9a7c51'];
function authors(pub){
  const seen=new Set();
  return String(pub.authors||'').split(/\s+and\s+/i).map(name=>({name:name.trim(),key:normalize(name)})).filter(a=>{
    if(!a.key||a.key==='bajo emanuele'||a.key==='emanuele bajo'||seen.has(a.key))return false;
    seen.add(a.key);return true;
  });
}
function model(records){
  const nodes=new Map(), links=new Map();
  for(const pub of records){
    const names=authors(pub);
    for(const a of names){
      if(!nodes.has(a.key))nodes.set(a.key,{id:a.key,name:a.name,works:[],count:0});
      const node=nodes.get(a.key);
      node.count++;node.works.push(pub);
    }
    for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){
      const keys=[names[i].key,names[j].key].sort(),k=keys.join('|');
      if(!links.has(k))links.set(k,{a:keys[0],b:keys[1],count:0});
      links.get(k).count++;
    }
  }
  return {
    nodes:[...nodes.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)),
    links:[...links.values()]
  };
}
function communities(nodes,edges){
  // Deterministic, weighted greedy modularity. Colors are network clusters, not research topics.
  const degrees=new Map(nodes.map(n=>[n.id,0]));
  let total=0;
  for(const edge of edges){
    degrees.set(edge.a,(degrees.get(edge.a)||0)+edge.count);
    degrees.set(edge.b,(degrees.get(edge.b)||0)+edge.count);
    total+=edge.count;
  }
  const groups=nodes.map(n=>({ids:new Set([n.id]),degree:degrees.get(n.id)||0}));
  if(total===0)return new Map(nodes.map((n,i)=>[n.id,i]));
  while(groups.length>1){
    let best=0,ai=-1,bi=-1;
    for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
      const a=groups[i],b=groups[j];
      let between=0;
      for(const e of edges){
        if((a.ids.has(e.a)&&b.ids.has(e.b))||(a.ids.has(e.b)&&b.ids.has(e.a)))between+=e.count;
      }
      if(!between)continue;
      const gain=between/total-a.degree*b.degree/(2*total*total);
      if(gain>best+1e-9){best=gain;ai=i;bi=j;}
    }
    if(ai<0)break;
    const g=groups[ai],h=groups[bi];
    for(const k of h.ids)g.ids.add(k);
    g.degree+=h.degree;
    groups.splice(bi,1);
  }
  groups.sort((a,b)=>b.ids.size-a.ids.size||[...a.ids][0].localeCompare([...b.ids][0]));
  const result=new Map();
  groups.forEach((g,i)=>g.ids.forEach(id=>result.set(id,i)));
  return result;
}
function layout(nodes,edges,clustering){
  // A researcher-centric radial layout. Community order is based on documented
  // shared publications, not arbitrary subject-area labels.
  const W=920,H=660,center={x:460,y:330};
  const byCommunity=new Map();
  for(const n of nodes){
    const group=clustering.get(n.id)||0;
    if(!byCommunity.has(group))byCommunity.set(group,[]);
    byCommunity.get(group).push(n);
  }
  const groups=[...byCommunity.entries()].sort((a,b)=>a[0]-b[0]);
  const gap=Math.min(.15,Math.PI/(Math.max(groups.length,1)*4));
  const angleBudget=2*Math.PI-gap*groups.length;
  let offset=-Math.PI/2;
  const points=[];
  for(const [,members] of groups){
    // Keep community members adjacent while preserving a readable central hub.
    const sector=angleBudget*members.length/Math.max(nodes.length,1);
    members.sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
    members.forEach((n,index)=>{
      const angle=offset+gap*.5+sector*(index+.5)/members.length;
      const r=nodes.length>18?(index%2===0?205:285):222;
      points.push({
        id:n.id,name:n.name,count:n.count,
        r:8+Math.sqrt(n.count)*3.1,
        x:center.x+Math.cos(angle)*r,
        y:center.y+Math.sin(angle)*r
      });
    });
    offset+=sector+gap;
  }
  // Avoid overlap between nearby nodes, including across community boundaries.
  // Radial constraints keep all coauthors outside the labeled central node.
  for(let k=0;k<75;k++){
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
      const x=points[i],y=points[j];
      let dx=x.x-y.x,dy=x.y-y.y,d=Math.hypot(dx,dy)||.01;
      const min=x.r+y.r+(nodes.length>18?17:32);
      if(d>=min)continue;
      const f=(min-d)*.2;
      dx=dx/d*f;dy=dy/d*f;
      x.x+=dx;y.x-=dx;x.y+=dy;y.y-=dy;
    }
    for(const p of points){
      const dx=p.x-center.x,dy=p.y-center.y,d=Math.hypot(dx,dy)||1;
      const ringMin=138,ringMax=294;
      const target=Math.max(ringMin,Math.min(ringMax,d));
      p.x=center.x+dx/d*target;
      p.y=center.y+dy/d*target;
      p.x=Math.max(67,Math.min(W-67,p.x));
      p.y=Math.max(48,Math.min(H-50,p.y));
    }
  }
  return {points,lookup:new Map(points.map(p=>[p.id,p])),W,H,center};
}
function buildNetwork(nodes,links,selected,onclick){
  const clusters=communities(nodes,links);
  const {points,lookup,W,H:graphHeight,center}=layout(nodes,links,clusters);
  const selectedLinks=new Set(links.filter(l=>l.a===selected||l.b===selected).flatMap(l=>[l.a,l.b]));
  const spokes=points.map(p=>{
    const active=!selected||p.id===selected;
    const color=p.id===selected?'#2577b2':'#9cb8cf';
    return '<line x1="'+center.x+'" y1="'+center.y+'" x2="'+p.x.toFixed(1)+'" y2="'+p.y.toFixed(1)+
      '" stroke="'+color+'" stroke-width="'+(p.id===selected?'3.5':'1.15')+
      '" opacity="'+(active?'.57':'.12')+'"><title>Emanuele Bajo and '+H(p.name)+': '+p.count+
      ' joint published works</title></line>';
  }).join('');
  const coauthorEdges=links.map(l=>{
    const a=lookup.get(l.a),b=lookup.get(l.b);if(!a||!b)return '';
    const active=!selected||l.a===selected||l.b===selected;
    return '<line x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+
      '" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+
      '" stroke="#376d99" stroke-width="'+Math.min(6.5,1.25+1.25*l.count).toFixed(1)+
      '" opacity="'+(active?'.86':'.11')+'"><title>'+l.count+
      ' jointly authored work'+(l.count===1?'':'s')+' between coauthors</title></line>';
  }).join('');
  const graphNodes=points.map(p=>{
    const active=!selected||p.id===selected||selectedLinks.has(p.id);
    const fill=palette[(clusters.get(p.id)||0)%palette.length];
    const label=p.name.split(',')[0];
    return '<g data-coauthor-node="'+H(p.id)+'" role="button" tabindex="0" aria-label="'+H(p.name)+
      ', '+p.count+' publications with Emanuele Bajo" style="cursor:pointer" opacity="'+(active?'1':'.25')+'">'+
      '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(p.r+3).toFixed(1)+
      '" fill="'+(p.id===selected?'#f7cc75':'#fff')+'"/>'+
      '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+p.r.toFixed(1)+
      '" fill="'+fill+'" stroke="'+(p.id===selected?'#a56f21':'#fff')+
      '" stroke-width="'+(p.id===selected?'3':'1.5')+'"><title>'+H(p.name)+
      ': '+p.count+' joint publications</title></circle>'+
      '<text x="'+p.x.toFixed(1)+'" y="'+(p.y+p.r+15).toFixed(1)+
      '" font-size="12" font-weight="'+(p.id===selected?'800':'650')+
      '" fill="#203f58" text-anchor="middle">'+H(label)+'</text></g>';
  }).join('');
  // Render the hub above graph edges, with an accessible, unambiguous full name.
  const hub='<g aria-label="Emanuele Bajo, central researcher" role="img">'+
    '<circle cx="'+center.x+'" cy="'+center.y+'" r="53" fill="#e5eff8"/>'+
    '<circle cx="'+center.x+'" cy="'+center.y+'" r="46" fill="#123a61" stroke="#fff" stroke-width="3"/>'+
    '<text x="'+center.x+'" y="'+(center.y-5)+'" fill="#fff" font-size="15" text-anchor="middle" font-weight="750">Emanuele</text>'+
    '<text x="'+center.x+'" y="'+(center.y+15)+'" fill="#fff" font-size="17" text-anchor="middle" font-weight="800">Bajo</text></g>';
  const svg='<svg viewBox="0 0 '+W+' '+graphHeight+
    '" width="100%" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Emanuele Bajo at the center, connected to coauthors. Additional weighted lines link coauthors who have published together. Select a node for publications">'+
    spokes+coauthorEdges+hub+graphNodes+'</svg>';
  el('hm-network').innerHTML=nodes.length?svg:'<p class="hm-empty">No coauthors recorded for this period.</p>';
  el('hm-network').querySelectorAll('[data-coauthor-node]').forEach(node=>{
    const activate=()=>onclick(node.dataset.coauthorNode);
    node.addEventListener('click',activate);
    node.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}
    });
  });
  return clusters;
}
function buildTimeline(filtered,top,selected,select){
  const allYears=filtered.map(p=>Number(p.year)).filter(y=>Number.isInteger(y)&&y>=1900&&y<=2100);
  const earliest=Math.min(...allYears),latest=Math.max(...allYears);
  if(!allYears.length||!top.length){
    el('hm-timeline').innerHTML='<p class="hm-empty">No dated publications available for this selection.</p>';
    return;
  }
  const left=185,right=40,W=1030,step=42,topY=43,H=Math.max(116,topY+top.length*step+21);
  const x=year=>left+(year-earliest)*(W-left-right)/Math.max(1,latest-earliest);
  const years=[earliest,...Array.from({length:latest-earliest+1},(_,i)=>earliest+i).filter(y=>y>earliest&&y<latest&&((y-earliest)%4===0)),latest];
  const grid=years.map(y=>
    '<line x1="'+x(y)+'" x2="'+x(y)+'" y1="30" y2="'+(H-17)+'" stroke="#dce7f0" stroke-dasharray="3 6"/>'+
    '<text x="'+x(y)+'" y="20" text-anchor="middle" fill="#66809a" font-size="12">'+y+'</text>'
  ).join('');
  const rows=top.map((person,index)=>{
    const y=topY+index*step;
    const byYear=new Map();
    for(const pub of person.works){const key=Number(pub.year);if(!Number.isInteger(key))continue;if(!byYear.has(key))byYear.set(key,[]);byYear.get(key).push(pub);}
    const line='<line x1="'+left+'" y1="'+y+'" x2="'+(W-right)+'" y2="'+y+'" stroke="#edf2f6"/>';
    const circles=[...byYear.entries()].sort((a,b)=>a[0]-b[0]).map(([year,works])=>{
      const r=5+Math.min(5,Math.sqrt(works.length)*2.1);
      return '<g data-year-coauthor="'+Htxt(person.id)+'" data-year="'+year+'" role="button" tabindex="0" aria-label="'+Htxt(person.name)+': '+works.length+' publications in '+year+'" style="cursor:pointer">'+
        '<circle cx="'+x(year).toFixed(1)+'" cy="'+y+'" r="'+r.toFixed(1)+'" fill="'+(person.id===selected?'#0b4f86':'#3689c5')+'" stroke="#fff" stroke-width="2"><title>'+Htxt(person.name)+' · '+year+' · '+works.length+' works</title></circle>'+
      '</g>';
    }).join('');
    return '<text x="'+(left-12)+'" y="'+(y+4)+'" font-size="12" font-weight="'+(person.id===selected?'780':'580')+'" fill="#274861" text-anchor="end">'+Htxt(person.name.split(',')[0])+'</text>'+line+circles;
  }).join('');
  el('hm-timeline').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" width="100%" role="group" aria-label="Joint published papers by coauthor and bibliographic year. Larger dots mean more papers that year.">'+grid+rows+'</svg>';
  el('hm-timeline').querySelectorAll('[data-year-coauthor]').forEach(dot=>{
    const activate=()=>select(dot.dataset.yearCoauthor,Number(dot.dataset.year));
    dot.addEventListener('click',activate);
    dot.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
  });
}
function Htxt(v){return H(v);}
function init(records,publicationDetail){
  const valid=records.filter(r=>r&&typeof r.authors==='string'&&Number.isInteger(Number(r.year)));
  let selection='',chosenYear=null;
  const scope=el('hm-network-scope'),period=el('hm-network-period');
  function filtered(){
    const v=period.value;
    if(v==='1998-2009')return valid.filter(r=>Number(r.year)>=1998&&Number(r.year)<=2009);
    if(v==='2010-2019')return valid.filter(r=>Number(r.year)>=2010&&Number(r.year)<=2019);
    if(v==='2020-2026')return valid.filter(r=>Number(r.year)>=2020&&Number(r.year)<=2026);
    return valid;
  }
  function select(id,year=null){
    selection=selection===id&&year===null?'':id;
    chosenYear=selection?year:null;
    render();
  }
  function render(){
    const filteredRecords=filtered(),data=model(filteredRecords);
    const present=new Map(data.nodes.map(n=>[n.id,n]));
    if(selection&&!present.has(selection)){selection='';chosenYear=null;}
    const visible=scope.value==='all'?data.nodes:data.nodes.slice(0,12);
    const visibleSet=new Set(visible.map(n=>n.id));
    const edges=data.links.filter(e=>visibleSet.has(e.a)&&visibleSet.has(e.b));
    el('hm-coauthor-count').textContent=data.nodes.length+' coauthors · '+data.links.length+' coauthor pairs · '+data.links.filter(e=>e.count>=2).length+' repeated pairs';
    el('hm-network-note').textContent='Network displays '+visible.length+' of '+data.nodes.length+' coauthors and '+edges.length+' documented links. The center connects Emanuele Bajo to each coauthor (thin lines); thicker, darker links show joint papers between coauthors. Colors mark communities in the selected network.';
    el('hm-graph-metrics').innerHTML='<div><strong>'+data.nodes.length+'</strong><small>Coauthors</small></div><div><strong>'+data.links.length+'</strong><small>Pairs</small></div><div><strong>'+data.links.filter(e=>e.count>=2).length+'</strong><small>2+ joint papers</small></div>';
    buildNetwork(visible,edges,selection,select);
    const show=data.nodes.slice(0,scope.value==='all'?data.nodes.length:12);
    el('hm-coauthors').innerHTML=show.map(person=>
      '<button type="button" class="hm-collab-person'+(person.id===selection?' selected':'')+'" data-coauthor="'+H(person.id)+'">'+
      '<span class="hm-collab-person-name">'+H(person.name)+'</span><span class="hm-collab-person-count">'+person.count+'</span>'+
      '<span class="hm-collab-meter"><span style="width:'+((person.count/(data.nodes[0]?.count||1))*100).toFixed(1)+'%"></span></span></button>'
    ).join('');
    el('hm-coauthors').querySelectorAll('[data-coauthor]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.coauthor)));
    const list=selection?data.nodes.find(p=>p.id===selection):null;
    if(list){
      const selectedWorks=chosenYear===null?list.works:list.works.filter(p=>Number(p.year)===chosenYear);
      publicationDetail(el('hm-coauthor-detail'),list.name+' · '+(chosenYear===null?list.count+' joint publications':chosenYear+' · '+selectedWorks.length+' joint publications'),[...selectedWorks]);
      el('hm-coauthor-detail').hidden=false;
      el('hm-clear-coauthor').hidden=false;
    }else{
      el('hm-coauthor-detail').hidden=true;
      el('hm-coauthor-detail').innerHTML='';
      el('hm-clear-coauthor').hidden=true;
    }
    const timelineTop=data.nodes.slice(0,6);
    if(list&&!timelineTop.some(n=>n.id===list.id))timelineTop[timelineTop.length-1]=list;
    buildTimeline(filteredRecords,timelineTop,selection,select);
    el('hm-timeline-note').textContent='Dots indicate joint publications in bibliographic years (not first-online dates). Larger dots represent multiple papers in one year. Select a dot to see its papers.';
  }
  scope.addEventListener('change',render);
  period.addEventListener('change',()=>{selection='';chosenYear=null;render();});
  el('hm-clear-coauthor').addEventListener('click',()=>{selection='';chosenYear=null;render();});
  render();
}
window.AcademicCoauthors={init};
})();
