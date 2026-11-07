/* Academic Manager Home: read-only views from existing allowlisted GitHub projections. */
(function () {
  'use strict';
  const q = id => document.getElementById(id);
  const E = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const dateLabel = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))) return 'Date not recorded';
    return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value+'T12:00:00'));
  };
  const short = (s,max=115) => {const x=String(s||'').trim();return x.length>max?x.slice(0,max-1).trimEnd()+'…':x;};
  const baseToday = () => {const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const source = {projects:null, archive:null, cv:null};
  const cards = document.querySelectorAll('.hm-view');
  function show(tab) {
    const t = ['overview','insights','projects'].includes(tab)?tab:'overview';
    cards.forEach(node => {node.hidden=node.id!==t;});
    document.querySelectorAll('.hm-navigation a[data-nav]').forEach(a => {
      const active=(t==='projects' ? a.dataset.nav==='projects' : a.dataset.nav==='home');
      a.classList.toggle('active',active);
      if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-home-tab]').forEach(b => {
      const active=b.dataset.homeTab===t;
      b.setAttribute('aria-selected',String(active));
    });
    window.scrollTo(0,0);
  }
  window.show=show;
  function route() { const hash=decodeURIComponent(location.hash.slice(1));show(hash==='publications'?'insights':hash); }
  function openProject(id) {
    location.hash='projects';show('projects');
    const locate=()=>{
      const match=[...document.querySelectorAll('#projects [data-rp-open]')].find(el=>el.dataset.rpOpen===id);
      if(match){match.click();return true;}return false;
    };
    if(locate())return;
    const observer=new MutationObserver(()=>{if(locate())observer.disconnect();});
    observer.observe(q('projects'),{childList:true,subtree:true});
  }
  document.querySelectorAll('[data-home-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>{location.hash=btn.dataset.homeTab;show(btn.dataset.homeTab);});
  });
  document.querySelectorAll('.hm-navigation a[data-nav]').forEach(a=>a.addEventListener('click',()=>{
    if(a.dataset.nav==='home'&&location.hash==='#overview')show('overview');
    if(a.dataset.nav==='projects'&&location.hash==='#projects')show('projects');
  }));
  window.addEventListener('hashchange',route);
  route();
  function projectLink(p,content) {
    return '<a class="hm-row" href="#projects" data-open-project="'+E(p.id)+'">'+content+'</a>';
  }
  function bindProjectClicks(root){
    root.querySelectorAll('[data-open-project]').forEach(a=>{
      a.addEventListener('click',event=>{event.preventDefault();openProject(a.dataset.openProject);});
    });
  }
  const phaseGroups=[
    {name:'Data collection',matcher:s=>/Data Collection/i.test(s)},
    {name:'Data analysis',matcher:s=>/Data Analyses|Empirical Design/i.test(s)},
    {name:'Writing',matcher:s=>/First Draft|Final Draft|Revision/i.test(s)},
    {name:'Editorial process',matcher:s=>/Submitted|Under Review|R&R/i.test(s)}
  ];
  function renderPipeline(projects) {
    const groups=phaseGroups.map(g=>({...g,items:projects.filter(p=>g.matcher(p.snapshot?.stage||''))}));
    const known=new Set(groups.flatMap(g=>g.items.map(p=>p.id)));
    const remaining=projects.filter(p=>!known.has(p.id));
    if(remaining.length)groups.push({name:'Other stages',items:remaining});
    q('hm-pipeline').innerHTML=groups.map((g,i)=>
      '<button class="hm-phase" type="button" data-phase="'+i+'" aria-pressed="false"><span>'+E(g.name)+'</span><b>'+g.items.length+'</b><small>'+(g.items.length===1?'1 project':g.items.length+' projects')+'</small></button>'
    ).join('');
    const summary=q('hm-phase-summary');
    summary.textContent='Select a phase to see its projects. Project phases come from the current Active Projects registry.';
    q('hm-pipeline').querySelectorAll('[data-phase]').forEach(button=>{
      button.addEventListener('click',()=>{
        const active=button.getAttribute('aria-pressed')==='true';
        q('hm-pipeline').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));
        if(active){summary.textContent='Select a phase to see its projects. Project phases come from the current Active Projects registry.';return;}
        button.setAttribute('aria-pressed','true');
        const group=groups[Number(button.dataset.phase)];
        summary.innerHTML='<strong>'+E(group.name)+':</strong> '+(group.items.length?group.items.map(p=>'<a href="#projects" data-open-project="'+E(p.id)+'">'+E(p.title)+'</a>').join(' · '):'No projects recorded');
        bindProjectClicks(summary);
      });
    });
  }
  function renderMatters(projects){
    const today=baseToday();
    const weight=p=>{
      const s=p.snapshot||{},status=s.status||'';
      if(/Waiting for Me/i.test(status))return 0;
      if(/Decision Pending|At Risk|Stalling/i.test(status))return 1;
      if(s.dueDate&&s.dueDate<today)return 0;
      if(s.dueDate&&s.dueDate>=today)return 2;
      if(/Waiting for Coauthors/i.test(status))return 3;
      return 9;
    };
    const pick=[...projects].filter(p=>weight(p)<9).sort((a,b)=>weight(a)-weight(b)||(a.priority||99)-(b.priority||99)).slice(0,4);
    q('hm-matters').innerHTML=pick.length?pick.map(p=>{
      const s=p.snapshot||{},flag=/Decision Pending/i.test(s.status)?'decision':/Waiting|Risk/i.test(s.status)?'warn':'';
      const symbol=/Decision Pending/i.test(s.status)?'⚑':/Waiting|Risk/i.test(s.status)?'!':'↗';
      return projectLink(p,'<span class="hm-row-icon '+flag+'">'+symbol+'</span><span class="hm-row-inner"><strong>'+E(p.title)+'</strong><small>'+E(short(s.nextAction||s.milestone||s.status,132))+'</small></span><span class="hm-row-chevron">›</span>');
    }).join(''):'<div class="hm-empty">No priority actions identified from documented status and deadlines.</div>';
    bindProjectClicks(q('hm-matters'));
  }
  function renderActivity(projects){
    const latest=[...projects].filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.snapshot?.updatedAt||''))
      .sort((a,b)=>b.snapshot.updatedAt.localeCompare(a.snapshot.updatedAt)||(a.priority||99)-(b.priority||99)).slice(0,4);
    q('hm-activity').innerHTML=latest.map(p=>projectLink(p,
      '<span class="hm-row-inner"><strong>'+E(p.title)+'</strong><small>'+E(p.snapshot.stage)+' · '+E(p.snapshot.status)+'</small></span><span class="hm-date">'+E(dateLabel(p.snapshot.updatedAt))+'</span>'
    )).join('')||'<div class="hm-empty">No dated updates documented.</div>';
    bindProjectClicks(q('hm-activity'));
  }
  function renderMilestones(projects){
    const today=baseToday(),rows=[],months='January|February|March|April|May|June|July|August|September|October|November|December';
    const pattern=new RegExp('\\b('+months+')\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b','g');
    const monthIdx=Object.fromEntries(months.split('|').map((m,i)=>[m,i+1]));
    projects.forEach(p=>{
      const s=p.snapshot||{},due=s.dueDate;
      if(/^\d{4}-\d{2}-\d{2}$/.test(due||'')&&due>=today){
        rows.push({id:p.id,title:p.title,date:due,tag:/tentative|indicative|expected/i.test(s.milestone||'')?'Indicative':/final deadline/i.test(s.milestone||'')?'Deadline':'Target date',note:s.milestone||'Recorded milestone'});
      }
      const message=String(s.milestone||'');
      for(const m of message.matchAll(pattern)){
        const d=m[3]+'-'+String(monthIdx[m[1]]).padStart(2,'0')+'-'+String(m[2]).padStart(2,'0');
        if(d<today||d===due)continue;
        rows.push({id:p.id,title:p.title,date:d,tag:/call|meeting/i.test(message)?'Meeting':'Documented date',note:message});
      }
    });
    rows.sort((a,b)=>a.date.localeCompare(b.date)||(a.title.localeCompare(b.title)));
    const unique=[...new Map(rows.map(r=>[r.id+'|'+r.date,r])).values()].slice(0,6);
    q('hm-milestones').innerHTML=unique.length?unique.map(x=>
      '<a class="hm-milestone" style="text-decoration:none;color:inherit" href="#projects" data-open-project="'+E(x.id)+'"><span class="hm-date-box">'+E(dateLabel(x.date).replace(/ 2026$/,''))+'</span>'+
      '<span><span class="hm-milestone-title">'+E(x.title)+'</span><span class="hm-milestone-small" style="display:block">'+E(short(x.note,155))+'</span></span>'+
      '<span class="hm-tag '+(/Indicative|Planned/i.test(x.tag)?'warn':'')+'">'+E(x.tag)+'</span></a>').join('')
      :'<div class="hm-empty">No upcoming dated milestones in the current source. Undated work remains in each project record.</div>';
    bindProjectClicks(q('hm-milestones'));
  }
  function loadProjects(){
    fetch('./data/projects.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{
      if(data.schemaVersion!==1||!Array.isArray(data.projects))throw Error('Unexpected source schema');
      source.projects=data;
      q('hm-active-count').textContent=data.projects.length+' active projects';
      renderPipeline(data.projects);renderMatters(data.projects);renderActivity(data.projects);renderMilestones(data.projects);
      q('hm-overview-source').textContent='Active Projects: public GitHub JSON · Last generated '+(data.generatedAt||'date not specified')+' · Read-only.';
    }).catch(e=>{q('hm-pipeline').innerHTML='<div class="hm-error" role="alert">Active Projects source unavailable: '+E(e.message)+'</div>';});
  }
  // Publication views use approved public archive records; no private author histories are transferred.
  const typeName={article:'Journal articles',book:'Books',book_chapter:'Book chapters'};
  function works(records,filter) {return records.filter(filter);}
  function publicationDetail(target,title,items){
    target.innerHTML='<div class="hm-year-heading">'+E(title)+'</div>'+(items.length?items.sort((a,b)=>(b.year||0)-(a.year||0)).map(x=>
      '<div class="hm-pub-line"><a href="./archive.html#record='+encodeURIComponent(x.id)+'">'+E(x.title)+'</a> <span class="hm-muted">('+E(x.year||'n.d.')+')</span></div>'
    ).join(''):'<div class="hm-empty">No matching publications.</div>');
  }
  function drawHistory(records){
    const valid=records.filter(x=>Number.isInteger(Number(x.year))&&Number(x.year)>=1900&&Number(x.year)<=2100);
    const years=valid.map(x=>Number(x.year)),start=Math.min(...years),end=Math.max(...years);
    if(!years.length){q('hm-history').textContent='No verified publication years found.';return;}
    const counts=new Map();
    valid.forEach(x=>counts.set(Number(x.year),(counts.get(Number(x.year))||0)+1));
    const width=1000,height=230,left=38,right=17,top=20,bottom=43,base=height-bottom,plot=base-top;
    const step=(width-left-right)/(end-start+1);
    const ceiling=Math.max(4,...counts.values());
    let sum=0,cumulative=[];
    const bars=Array.from({length:end-start+1},(_,i)=>{
      const yr=start+i,n=counts.get(yr)||0;
      sum+=n;cumulative.push({x:left+step*(i+.5),y:base-plot*sum/valid.length,yr,n});
      const h=n*plot/ceiling;
      return '<rect x="'+(left+i*step+step*.16).toFixed(1)+'" y="'+(base-h).toFixed(1)+'" width="'+(step*.68).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="2" fill="#76b6df" data-year="'+yr+'" tabindex="0" role="button" aria-label="'+yr+': '+n+' publications"><title>'+yr+': '+n+' publications</title></rect>';
    }).join('');
    const path=cumulative.map((v,i)=>(i===0?'M':'L')+v.x.toFixed(1)+' '+v.y.toFixed(1)).join(' ');
    const grid=Array.from({length:ceiling+1},(_,i)=>{const y=base-i*plot/ceiling;return '<path d="M'+left+' '+y.toFixed(1)+' H'+(width-right)+'" stroke="#eaf0f6"/><text x="'+(left-10)+'" y="'+(y+4).toFixed(1)+'" fill="#72849a" font-size="11" text-anchor="end">'+i+'</text>';}).join('');
    const ticks=Array.from({length:end-start+1},(_,i)=>start+i).filter((yr,i)=>i%2===0||yr===end).map(yr=>'<text x="'+(left+step*(yr-start+.5)).toFixed(1)+'" y="'+(height-15)+'" fill="#5b7188" font-size="11" text-anchor="middle">'+yr+'</text>').join('');
    q('hm-history').innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" role="group" aria-label="Annual publications with cumulative publication trend">'+grid+bars+
      '<path d="'+path+'" fill="none" stroke="#124878" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'+ticks+
      '<text x="'+(width-12)+'" y="15" fill="#466580" font-size="12" text-anchor="end">Cumulative total: '+valid.length+'</text></svg>';
    const result=q('hm-history-detail');
    function selectYear(year){const sub=valid.filter(x=>Number(x.year)===year);publicationDetail(result,year+' · '+sub.length+' publications',sub);}
    const plotEl=q('hm-history');
    plotEl.querySelectorAll('[data-year]').forEach(rect=>{
      rect.addEventListener('click',()=>selectYear(Number(rect.dataset.year)));
      rect.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectYear(Number(rect.dataset.year));}});
    });
    selectYear(end);
  }
  function renderVenues(records){
    const journals=new Map();
    records.filter(x=>x.type==='article').forEach(x=>{
      const name=String(x.journal||'Journal not recorded').trim();
      if(!journals.has(name))journals.set(name,[]);
      journals.get(name).push(x);
    });
    const ordered=[...journals].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]));
    let all=false;
    function draw(){
      const visible=all?ordered:ordered.slice(0,5);
      q('hm-journals').innerHTML=visible.map(([name,arr])=>
        '<button type="button" class="hm-vrow" data-journal="'+E(name)+'" style="width:100%;border:0;background:none;text-align:left;padding:0"><span><span class="hm-vlabel">'+E(name)+'</span><span class="hm-bar" style="display:block"><span style="display:block;width:'+((arr.length/(ordered[0]?.[1].length||1))*100)+'%;height:100%;background:#3785c6;border-radius:4px"></span></span></span><span class="hm-vnum">'+arr.length+'</span></button>'
      ).join('');
      q('hm-all-journals').textContent=all?'Show fewer journals':'View all '+ordered.length+' journals';
      q('hm-journals').querySelectorAll('[data-journal]').forEach(b=>b.addEventListener('click',()=>{
        const a=ordered.find(row=>row[0]===b.dataset.journal);publicationDetail(q('hm-journal-detail'),a[0],a[1]);
      }));
    }
    q('hm-all-journals').addEventListener('click',()=>{all=!all;draw();});
    draw();
  }
  function normName(raw){return String(raw||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,' ').toLowerCase().trim();}
  function renderCoauthors(records){
    const map=new Map();
    for(const p of records){
      const seen=new Set();
      for(const raw of String(p.authors||'').split(/\s+and\s+/i)){
        const name=raw.trim(),key=normName(name);
        if(!key||/^(bajo emanuele|emanuele bajo)$/.test(key)||seen.has(key))continue;
        seen.add(key);
        if(!map.has(key))map.set(key,{name,count:0,records:[]});
        const co=map.get(key);co.count++;co.records.push(p);
      }
    }
    const arr=[...map.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
    q('hm-coauthor-count').textContent=arr.length+' distinct coauthor names after formatting normalization';
    const show=arr.slice(0,8);
    q('hm-coauthors').innerHTML=show.map((c,i)=>
      '<button type="button" class="hm-vrow" data-coauthor="'+i+'" style="width:100%;border:0;background:none;text-align:left;padding:0"><span class="hm-vlabel">'+E(c.name)+'</span><span class="hm-vnum">'+c.count+'</span></button>'
    ).join('');
    q('hm-coauthors').querySelectorAll('[data-coauthor]').forEach(b=>b.addEventListener('click',()=>{
      const c=show[Number(b.dataset.coauthor)];publicationDetail(q('hm-coauthor-detail'),c.name+' · '+c.count+' joint publications',c.records);
    }));
    const colors=['#3e87bd','#6eb1db','#9bcee9'];
    const center={x:170,y:111},radius=80;
    const svg=arr.slice(0,12).map((c,i)=>{
      const angle=(i/Math.min(arr.length,12))*Math.PI*2-Math.PI/2;
      const x=center.x+Math.cos(angle)*radius,y=center.y+Math.sin(angle)*radius;
      const size=5+Math.min(10,Math.sqrt(c.count)*2);
      return '<path d="M170 111 L'+x.toFixed(1)+' '+y.toFixed(1)+'" stroke="#8cacca" stroke-width="1.6"/>'+
        '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+size.toFixed(1)+'" fill="'+colors[i%3]+'"><title>'+E(c.name)+' · '+c.count+' publications</title></circle>';
    }).join('');
    q('hm-network').innerHTML='<svg class="hm-network" viewBox="0 0 340 224" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of leading coauthors. Node sizes represent joint publication counts.">'+svg+
      '<circle cx="170" cy="111" r="32" fill="#123f68"/><text x="170" y="116" fill="white" font-size="14" font-weight="700" text-anchor="middle">E. Bajo</text></svg>';
  }
  function renderAreas(cv,records){
    const all=(cv.website?.publicationGroups||[]);
    const groups=all.filter(x=>x.name!=='Books & Book Chapters');
    const total=groups.reduce((v,x)=>v+(x.items?.length||0),0);
    const articleCount=records.filter(x=>x.type==='article').length;
    q('hm-areas').innerHTML=groups.map(x=>{
      const n=x.items?.length||0;
      return '<div class="hm-vrow"><div><div class="hm-vlabel">'+E(x.name)+'</div><div class="hm-bar"><div style="width:'+(total?n/total*100:0)+'%"></div></div></div><span class="hm-vnum">'+n+'</span></div>';
    }).join('');
    q('hm-area-note').textContent='Approved website research-topic groups cover '+total+' curated finance articles out of '+articleCount+' journal articles. Other articles, books and chapters are not assigned to these groups; no automatic classification.';
  }
  function loadPublications(){
    Promise.all([
      fetch('./data/archive-public-v1.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Archive HTTP '+r.status);return r.json();}),
      fetch('./data/cv-public-v1.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('CV HTTP '+r.status);return r.json();})
    ]).then(([archive,cv])=>{
      if(archive.schemaVersion!==1||!Array.isArray(archive.records)||cv.schemaVersion!==1||!cv.website)throw Error('Unexpected source schemas');
      source.archive=archive;source.cv=cv;
      const records=archive.records.filter(x=>x.lifecycle==='published'&&['article','book','book_chapter'].includes(x.type));
      const types=records.reduce((a,p)=>(a[p.type]=(a[p.type]||0)+1,a),{});
      if(records.length!==archive.summary?.published)throw Error('Publication count does not match archive summary');
      q('hm-pub-count').textContent=records.length;
      q('hm-article-count').textContent=types.article||0;
      q('hm-book-count').textContent=types.book||0;
      q('hm-chapter-count').textContent=types.book_chapter||0;
      q('hm-publication-header').textContent=records.length+' published records';
      drawHistory(records);
      renderVenues(records);
      renderCoauthors(records);
      renderAreas(cv,records);
      q('hm-publication-source').textContent='Source: approved archive public projection ('+(archive.generatedOn||'undated')+'), derived from private canonical scientific registry. Publication years use reconciled bibliographic records; the CV bibliography may contain pending corrections. No citation metrics inferred.';
    }).catch(e=>{q('hm-history').innerHTML='<div class="hm-error" role="alert">Publication sources unavailable: '+E(e.message)+'</div>';});
  }
  loadProjects();
  loadPublications();
})();
