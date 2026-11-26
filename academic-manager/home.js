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
  function loadProjects(){
    fetch('./data/projects.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{
      if(data.schemaVersion!==1||!Array.isArray(data.projects))throw Error('Unexpected source schema');
      source.projects=data;
      if(!window.AcademicOverview)throw Error('Home Overview component unavailable');
      window.AcademicOverview.render(data,openProject);
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
      if(!window.AcademicCoauthors)throw Error('Collaboration module missing');
      window.AcademicCoauthors.init(records,publicationDetail);
      renderAreas(cv,records);
      q('hm-publication-source').textContent='Source: approved archive public projection ('+(archive.generatedOn||'undated')+'), derived from private canonical scientific registry. Publication years use reconciled bibliographic records; the CV bibliography may contain pending corrections. No citation metrics inferred.';
    }).catch(e=>{q('hm-history').innerHTML='<div class="hm-error" role="alert">Publication sources unavailable: '+E(e.message)+'</div>';});
  }
  loadProjects();
  loadPublications();
})();
