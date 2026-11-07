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
  const W=860,H=460,pad=49;
  const ids=[...new Set(nodes.map(n=>clustering.get(n.id)||0))];
  const columns=ids.length>4?3:ids.length>1?2:1;
  const rows=Math.ceil(ids.length/columns);
  const centers=new Map(ids.map((id,i)=>[id,{
    x:W*(i%columns+.5)/columns,
    y:H*(Math.floor(i/columns)+.5)/rows
  }]));
  const grouped=new Map(ids.map(id=>[id,[]]));
  for(const node of nodes)grouped.get(clustering.get(node.id)||0).push(node);
  const points=nodes.map(n=>{
    const group=grouped.get(clustering.get(n.id)||0);
    const index=group.indexOf(n);
    const center=centers.get(clustering.get(n.id)||0);
    const angle=2*Math.PI*index/Math.max(group.length,1)-Math.PI/2;
    const dist=group.length===1?0:30+Math.min(48,group.length*6);
    return {id:n.id,name:n.name,count:n.count,r:9+Math.sqrt(n.count)*3.0,
      x:center.x+Math.cos(angle)*dist,y:center.y+Math.sin(angle)*dist,
      home:center};
  });
  const lookup=new Map(points.map(p=>[p.id,p]));
  for(let t=0;t<230;t++){
    const fx=new Map(points.map(p=>[p.id,0])),fy=new Map(points.map(p=>[p.id,0]));
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
      const a=points[i],b=points[j];let dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy)||.01;
      if(d<.1){dx=.05;dy=.05;d=.071;}
      const min= a.r+b.r+33;
      const push=(d<min?(min-d)*.13:850/(d*d));
      const x=dx/d*push,y=dy/d*push;
      fx.set(a.id,fx.get(a.id)+x);fy.set(a.id,fy.get(a.id)+y);
      fx.set(b.id,fx.get(b.id)-x);fy.set(b.id,fy.get(b.id)-y);
    }
    for(const link of edges){
      const a=lookup.get(link.a),b=lookup.get(link.b);
      if(!a||!b)continue;
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
      const rest=link.count>2?98:124;
      const f=Math.max(-1.7,Math.min(1.7,(d-rest)*.018));
      fx.set(a.id,fx.get(a.id)+dx/d*f);fy.set(a.id,fy.get(a.id)+dy/d*f);
      fx.set(b.id,fx.get(b.id)-dx/d*f);fy.set(b.id,fy.get(b.id)-dy/d*f);
    }
    for(const point of points){
      const balance=t<145?.018:.009;
      const vx=fx.get(point.id)+(point.home.x-point.x)*balance;
      const vy=fy.get(point.id)+(point.home.y-point.y)*balance;
      point.x=Math.max(pad,Math.min(W-pad,point.x+Math.max(-4,Math.min(4,vx))));
      point.y=Math.max(pad,Math.min(H-pad,point.y+Math.max(-4,Math.min(4,vy))));
    }
  }
  return {points,lookup,W,H};
}
function buildNetwork(nodes,links,selected,onclick){
  const clusters=communities(nodes,links);
  const layoutData=layout(nodes,links,clusters);
  const {points,lookup,W}=layoutData; const graphHeight=layoutData.H;
  const selectedLinks=new Set(links.filter(l=>l.a===selected||l.b===selected).flatMap(l=>[l.a,l.b]));
  const graphEdges=links.map(l=>{
    const a=lookup.get(l.a),b=lookup.get(l.b);if(!a||!b)return '';
    const active=!selected||l.a===selected||l.b===selected;
    return '<line x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke="#8caac3" stroke-width="'+Math.min(6,1.05+1.2*l.count).toFixed(1)+'" opacity="'+(active?'.82':'.12')+'"><title>'+l.count+' joint publication'+(l.count===1?'':'s')+'</title></line>';
  }).join('');
  const graphNodes=points.map(point=>{
    const active=!selected||point.id===selected||selectedLinks.has(point.id);
    const fill=palette[(clusters.get(point.id)||0)%palette.length];
    const label=point.name.split(',')[0];
    const size=point.r;
    return '<g data-coauthor-node="'+H(point.id)+'" role="button" tabindex="0" aria-label="'+H(point.name)+', '+point.count+' publications" style="cursor:pointer" opacity="'+(active?'1':'.24')+'">'+
      '<circle cx="'+point.x.toFixed(1)+'" cy="'+point.y.toFixed(1)+'" r="'+(size+4).toFixed(1)+'" fill="'+(point.id===selected?'#ffce74':'#fff')+'"/>'+
      '<circle cx="'+point.x.toFixed(1)+'" cy="'+point.y.toFixed(1)+'" r="'+size.toFixed(1)+'" fill="'+fill+'" stroke="'+(point.id===selected?'#ae6729':'#fff')+'" stroke-width="'+(point.id===selected?'3':'1.5')+'">'+
      '<title>'+H(point.name)+': '+point.count+' joint published works</title></circle>'+
      '<text x="'+point.x.toFixed(1)+'" y="'+(point.y+size+15).toFixed(1)+'" font-size="11" font-weight="'+(point.id===selected?'800':'620')+'" fill="#23425d" text-anchor="middle">'+H(label)+'</text>'+
    '</g>';
  }).join('');
  const svg='<svg viewBox="0 0 '+W+' '+graphHeight+'" width="100%" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Coauthor network with documented links between coauthors; select a node for publications">'+graphEdges+graphNodes+'</svg>';
  el('hm-network').innerHTML=nodes.length?svg:'<p class="hm-empty">No coauthors recorded for this period.</p>';
  el('hm-network').querySelectorAll('[data-coauthor-node]').forEach(g=>{
    const activate=()=>onclick(g.dataset.coauthorNode);
    g.addEventListener('click',activate);
    g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
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
    el('hm-network-note').textContent='Network displays '+visible.length+' of '+data.nodes.length+' coauthors and '+edges.length+' documented links. Line width represents jointly authored works. Colored groups are algorithmic communities within the visible network.';
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
