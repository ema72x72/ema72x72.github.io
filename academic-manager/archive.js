
/* Academic Manager Archive & Analytics — read-only public projection (v1).
   Never fetch or bundle the private canonical registry on GitHub Pages. */
(() => {
 'use strict';
 const root=document.getElementById('aa-root'); if(!root)return;
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={idea:'Idea',data_collection:'Data Collection',data_analyses:'Data Analyses',writing:'Writing',editorial_process:'Editorial Process',accepted:'Accepted',published:'Published'};
 const lifecycle={published:'Published',active:'Active',paused:'Standby',abandoned:'Discontinued'};
 const types={article:'Journal Article',book:'Book',book_chapter:'Book Chapter',project:'Project'};
 const steps=['idea','data_collection','data_analyses','writing','editorial_process','accepted','published'];
 const state={data:null,view:'explorer',record:null,detailTab:'overview',query:'',openFilters:false,sort:'updated',filterIds:null,returnScroll:0,
    filters:{type:'all',lifecycle:'all',phase:'all',year:'all',coauthor:''},heatFocus:null};
 const number=(v,n=1)=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:n,minimumFractionDigits:n});
 const desc=x=>x==='abandoned'?'abandoned':x==='paused'?'paused':x==='active'?'active':'published';
 const date=x=>x?String(x).slice(0,10):'Not available';
 const badge=(x)=>'<span class="aa-tag aa-tag-'+desc(x)+'">'+E(lifecycle[x]||x)+'</span>';
 function setView(view,record){
    if(view==='detail'&&state.view==='explorer'){state.returnScroll=window.scrollY;state.detailTab='overview';}
    if(view==='explorer'&&state.view==='analytics')state.returnScroll=0;
    const hash=view==='detail'?'record='+encodeURIComponent(record):view;
    if(location.hash.slice(1)===hash){readRoute();return;}
    location.hash=hash;
 }
 function readRoute(){
    const hash=decodeURIComponent(location.hash.slice(1));
    if(hash.startsWith('record=')){
      const id=hash.slice(7);
      if(state.data?.records?.some(x=>x.id===id)){state.view='detail';state.record=id;}else{state.view='explorer';state.record=null;}
    }else{state.view=hash==='analytics'?'analytics':'explorer';state.record=null;}
    render();window.scrollTo(0,state.view==='explorer'?state.returnScroll:0);
 }
 function navTabs(){
    document.querySelectorAll('[data-aa-main-tab]').forEach(btn=>btn.setAttribute('aria-selected',String(state.view===(btn.dataset.aaMainTab))));
 }
 function render(){
   navTabs();
   if(!state.data)return;
   if(state.view==='analytics')renderAnalytics();
   else if(state.view==='detail')renderDetail();
   else renderExplorer();
 }
 function attr(v){return E(v)}
 function visibleYears(){return [...new Set(state.data.records.map(r=>r.year).filter(Boolean))].sort((a,b)=>b-a)}
 function renderExplorer(){
   const f=state.filters;
   root.innerHTML='<div class="aa-explorer-tools">'+
    '<input id="aa-search" class="aa-input aa-search" type="search" autocomplete="off" aria-label="Search the research archive" placeholder="Search titles, coauthors, keywords..." value="'+attr(state.query)+'">'+
    '<button class="aa-button" type="button" id="aa-filter-toggle" aria-expanded="'+String(state.openFilters)+'">☷ Filters <span id="aa-active-filter-count"></span></button>'+
    '<select id="aa-sort" class="aa-select aa-sort" aria-label="Sort records"><option value="updated">Last updated (newest)</option><option value="year">Year (newest)</option><option value="title">Title (A–Z)</option><option value="status">Status</option></select></div>'+
    '<div id="aa-filter-panel" class="aa-filters" '+(state.openFilters?'':'hidden')+'><div class="aa-filtergrid">'+
    '<div class="aa-field"><label for="aa-f-type">Type</label><select class="aa-select" id="aa-f-type"><option value="all">All</option><option value="project">Projects</option><option value="article">Journal articles</option><option value="book">Books</option><option value="book_chapter">Book chapters</option></select></div>'+
    '<div class="aa-field"><label for="aa-f-status">Status</label><select class="aa-select" id="aa-f-status"><option value="all">All</option><option value="active">Active</option><option value="paused">Standby</option><option value="published">Published</option><option value="abandoned">Discontinued</option></select></div>'+
    '<div class="aa-field"><label for="aa-f-phase">Last scientific stage</label><select class="aa-select" id="aa-f-phase"><option value="all">All</option>'+steps.map(x=>'<option value="'+x+'">'+E(labels[x])+'</option>').join('')+'</select></div>'+
    '<div class="aa-field"><label for="aa-f-year">Publication year</label><select class="aa-select" id="aa-f-year"><option value="all">All</option>'+visibleYears().map(y=>'<option value="'+y+'">'+y+'</option>').join('')+'</select></div>'+
    '<div class="aa-field"><label for="aa-f-coauthors">Coauthors</label><input class="aa-input" id="aa-f-coauthors" placeholder="Coauthor name" value="'+attr(f.coauthor)+'"></div></div>'+
    '<div class="aa-row" style="margin-top:13px;justify-content:flex-end"><button class="aa-button" id="aa-clear" type="button">Clear filters</button></div></div>'+
    '<div class="aa-explorer-foot"><strong id="aa-result-count"></strong><span>Select a record to open its detail page</span></div>'+
    '<div class="aa-list" id="aa-results" aria-live="polite"></div>'+
    '<p class="aa-statnote">Public view: historical project titles, lifecycle and scientific stages are displayed. Private notes, coauthors, correspondence and individual histories remain in the private repository.</p>';
   document.getElementById('aa-sort').value=state.sort;
   for(const [id,v] of [['aa-f-type',f.type],['aa-f-status',f.lifecycle],['aa-f-phase',f.phase],['aa-f-year',f.year]])document.getElementById(id).value=v;
   document.getElementById('aa-search').addEventListener('input',e=>{state.query=e.target.value;refreshRecords()});
   document.getElementById('aa-f-coauthors').addEventListener('input',e=>{state.filters.coauthor=e.target.value;refreshRecords()});
   for(const [id,key] of [['aa-f-type','type'],['aa-f-status','lifecycle'],['aa-f-phase','phase'],['aa-f-year','year']])
      document.getElementById(id).addEventListener('change',e=>{state.filters[key]=e.target.value;refreshRecords()});
   document.getElementById('aa-sort').addEventListener('change',e=>{state.sort=e.target.value;refreshRecords()});
   document.getElementById('aa-filter-toggle').addEventListener('click',()=>{
      state.openFilters=!state.openFilters;const panel=document.getElementById('aa-filter-panel');panel.hidden=!state.openFilters;document.getElementById('aa-filter-toggle').setAttribute('aria-expanded',String(state.openFilters));
   });
   document.getElementById('aa-clear').addEventListener('click',()=>{
      state.filters={type:'all',lifecycle:'all',phase:'all',year:'all',coauthor:''};state.query='';state.filterIds=null;renderExplorer();
   });
   refreshRecords();
 }
 function orderedRecords(){
   const f=state.filters,q=state.query.trim().toLocaleLowerCase('en-US'),a=state.data.records.filter(r=>{
      if(state.filterIds&&!state.filterIds.has(r.id))return false;
      if(f.type!=='all'&&r.type!==f.type)return false;
      if(f.lifecycle!=='all'&&r.lifecycle!==f.lifecycle)return false;
      if(f.phase!=='all'&&r.phase!==f.phase)return false;
      if(f.year!=='all'&&String(r.year)!==String(f.year))return false;
      if(f.coauthor.trim()&&!String(r.authors||'').toLocaleLowerCase('en-US').includes(f.coauthor.toLocaleLowerCase('en-US')))return false;
      if(q&&!([r.title,r.authors,r.summary,r.journal,r.year,labels[r.phase],lifecycle[r.lifecycle]].join(' ').toLocaleLowerCase('en-US').includes(q)))return false;
      return true;
   });
   const collator=new Intl.Collator('en',{sensitivity:'base'});
   a.sort((a,b)=>{
      if(state.sort==='year')return Number(b.year||0)-Number(a.year||0)||collator.compare(a.title,b.title);
      if(state.sort==='title')return collator.compare(a.title,b.title);
      if(state.sort==='status')return collator.compare(lifecycle[a.lifecycle],lifecycle[b.lifecycle])||collator.compare(a.title,b.title);
      const byDate=String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));
      return byDate||(Number(b.year||0)-Number(a.year||0))||collator.compare(a.title,b.title);
   });
   return a;
 }
 function refreshRecords(){
   const list=orderedRecords();
   document.getElementById('aa-result-count').textContent=list.length+' results of '+state.data.records.length;
   const active=Object.entries(state.filters).filter(([k,v])=>v&&v!=='all').length;
   document.getElementById('aa-active-filter-count').textContent=active?'('+active+')':'';
   const place=document.getElementById('aa-results');
   if(!list.length){place.innerHTML='<div class="aa-empty">No records match your search or filters.</div>';return;}
   place.innerHTML=list.map(r=>{
     const privateRecord=r.visibility==='restricted';
     const sub=privateRecord?'Additional details are private':r.visibility==='limited'?'Title and scientific stages only':(r.authors||r.journal||r.summary||'');
     const yearText=r.year?' · '+E(r.year):r.updatedAt?' · Updated '+E(date(r.updatedAt)):'';
     return '<button type="button" class="aa-record" data-aa-record="'+attr(r.id)+'"><span class="aa-record-icon" aria-hidden="true">'+(r.type==='project'?'◇':'▤')+'</span>'+
      '<span class="aa-record-body"><span class="aa-record-title">'+E(r.title)+'</span><span class="aa-record-sub">'+E(sub)+yearText+'</span>'+
      '<span class="aa-record-flags"><span class="aa-tag">'+E(types[r.type]||r.type)+'</span>'+badge(r.lifecycle)+(r.phase?'<span class="aa-tag">'+E(labels[r.phase]||r.phase)+'</span>':'')+'</span></span>'+
      '<span class="aa-chevron" aria-hidden="true">›</span></button>';
   }).join('');
   place.querySelectorAll('[data-aa-record]').forEach(b=>b.addEventListener('click',()=>setView('detail',b.dataset.aaRecord)));
 }
 function renderDetail(){
   const r=state.data.records.find(x=>x.id===state.record);if(!r){setView('explorer');return;}
   const priv=r.visibility==='restricted',limited=r.visibility==='limited';
   const tabs=[['overview','Overview'],['journey','Journey & Timeline'],['sources','Sources']];
   root.innerHTML='<div><button class="aa-back" id="aa-back" type="button">← Back to Explorer</button>'+
    '<div class="aa-detail-head"><div><span class="aa-eyebrow">Research record</span><h2 class="aa-detail-title">'+E(r.title)+'</h2><div class="aa-detail-meta">'+E(r.authors||'')+'</div></div>'+badge(r.lifecycle)+'</div>'+
    '<div role="tablist" class="aa-detail-tabs" aria-label="Record details">'+tabs.map(([key,title])=>'<button type="button" data-aa-detail-tab="'+key+'" role="tab" aria-selected="'+String(key===state.detailTab)+'">'+title+'</button>').join('')+'</div>'+
    '<div id="aa-detail-body" role="tabpanel"></div></div>';
   document.getElementById('aa-back').addEventListener('click',()=>setView('explorer'));
   root.querySelectorAll('[data-aa-detail-tab]').forEach(b=>b.addEventListener('click',()=>{
       state.detailTab=b.dataset.aaDetailTab;root.querySelectorAll('[data-aa-detail-tab]').forEach(x=>x.setAttribute('aria-selected',String(x.dataset.aaDetailTab===state.detailTab)));paintDetailTab(r);
   }));
   paintDetailTab(r);
 }
 function info(k,v){return '<div class="aa-info"><small>'+E(k)+'</small><strong>'+E(v||'Not documented')+'</strong></div>'}
 function profileHTML(r){
   if(!r.profile||typeof r.profile!=='object')return '';
   const fields=[['Research Question',r.profile.researchQuestion],['Scientific Contribution',r.profile.contribution],['Methodology',r.profile.methodology],['Main Findings',r.profile.mainFindings]].filter(x=>x[1]&&typeof x[1]==='string');
   if(!fields.length)return '';
   return '<div class="aa-summary-grid" style="margin:15px 0">'+fields.map(([label,value])=>'<div class="aa-info"><small>'+E(label)+'</small><p>'+E(value)+'</p></div>').join('')+'</div>';
 }
 function paintDetailTab(r){
   const priv=r.visibility==='restricted',limited=r.visibility==='limited';
   const body=document.getElementById('aa-detail-body');
   if(state.detailTab==='overview'){
    body.innerHTML='<div class="aa-panel"><h3 class="aa-heading">Scientific Profile</h3>'+
      '<p class="aa-muted">'+(priv?'This record belongs to the consolidated portfolio. Some details remain restricted.':limited?'This view includes the research title, lifecycle and scientific stages only.':'Bibliographic and project information approved for this public view.')+'</p>'+
      (r.summary?'<p>'+E(r.summary)+'</p>':'')+
      profileHTML(r)+'<div class="aa-info-grid">'+info('Type',types[r.type])+info('Lifecycle status',lifecycle[r.lifecycle])+info('Year',r.year||null)+
      info('Last scientific stage',r.phase?labels[r.phase]:null)+info('Most advanced stage reached',r.maxPhase?labels[r.maxPhase]:null)+info('Last documented update',r.updatedAt?date(r.updatedAt):null)+'</div></div>';
    return;
   }
   if(state.detailTab==='journey'){
     const noPhase=!r.phase&&!r.maxPhase;
     const progress='<div class="aa-flow">'+steps.map((p,i)=>'<div class="aa-flowitem'+(p===r.phase?' aa-last':'')+(p===r.maxPhase?' aa-max':'')+'"><span class="aa-dot">'+(p===r.phase||p===r.maxPhase?'●':'·')+'</span><span class="aa-flowname">'+E(labels[p])+'</span></div>').join('')+'</div>';
     const events=(r.events||[]).filter(x=>x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
     const history=events.length?'<div class="aa-timeline">'+events.map(x=>'<article class="aa-event"><time>'+E(date(x.date))+'</time><strong>'+E(x.from?((labels[x.from]||x.from)+' → '+(labels[x.to]||x.to)):(x.label||'Documented event'))+'</strong></article>').join('')+'</div>':'<p class="aa-muted">Individual event history is not publicly available. Missing dates and milestones are not inferred.</p>';
     body.innerHTML='<div class="aa-panel"><h3 class="aa-heading">Scientific Journey</h3>'+
       (noPhase?'<p class="aa-muted">Scientific stages are not available in this public view.</p>':progress)+
       '<div class="aa-info-grid">'+info('Last scientific stage',r.phase?labels[r.phase]:null)+info('Most advanced stage reached',r.maxPhase?labels[r.maxPhase]:null)+'</div>'+
       '<p class="aa-statnote">The diagram distinguishes last stage from the furthest stage reached; intermediate milestones are not assumed.</p>'+
       '<div class="aa-journey"><h3 class="aa-heading">Documented event timeline</h3>'+history+'</div></div>';
     return;
   }
   const sourceCards=Array.isArray(r.sources)?r.sources.filter(x=>x&&typeof x.trelloUrl==='string'&&/^https:\/\/trello\.com\//.test(x.trelloUrl)):[];
   const sourceLinks=sourceCards.length?'<h4>Historical sources</h4><div class="aa-list">'+sourceCards.map(x=>'<a class="aa-link" href="'+E(x.trelloUrl)+'" target="_blank" rel="noopener noreferrer">Trello card #'+E(x.trelloNum||'—')+'</a>').join('')+'</div>':'';
   body.innerHTML='<div class="aa-panel"><h3 class="aa-heading">Sources & References</h3>'+
      ((priv||limited)?'<p>Only the title, lifecycle and scientific stages are published here. The full project history and sources remain in the private GitHub repository.</p>':
         '<div class="aa-info-grid">'+info('Authors',r.authors)+info('Journal / publication venue',r.journal)+info('Bibliographic year',r.year||null)+'</div>'+
         (r.bibliographyKey?'<p class="aa-muted">Bibliographic key: '+E(r.bibliographyKey)+'</p>':'')+
         (r.originalTitle?'<p class="aa-muted"><strong>Original published title:</strong> '+E(r.originalTitle)+'</p>':'')+
         sourceLinks+
         '<p class="aa-statnote">Metadata are drawn from authorized source fields. Notes and correspondence are excluded from the public projection.</p>')+'</div>';
 }
 function analyticsSVG(){
   const starts=state.data.starts,max=Math.max(10,...starts.map(x=>x.count)),w=660,h=258;
   const left=38,right=14,top=18,bottom=39,plot=(w-left-right),band=plot/starts.length,graphH=h-top-bottom;
   let s='<svg class="aa-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Projects started by year from 2013 to 2026">';
   for(const v of [0,5,10]){const y=top+graphH-v/max*graphH;s+='<line x1="'+left+'" y1="'+y+'" x2="'+(w-right)+'" y2="'+y+'" stroke="#e1eaf3"/><text x="28" y="'+(y+4)+'" text-anchor="end" font-size="12" fill="#607b91">'+v+'</text>';}
   starts.forEach((d,i)=>{const x=left+i*band+band*.18,bw=band*.64,y=top+graphH-d.count/max*graphH,bar=top+graphH-y;
      s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bar+'" rx="3" fill="#2c80cb"><title>'+d.year+': '+d.count+' projects</title></rect>';
      s+='<text x="'+(x+bw/2)+'" y="'+(h-17)+'" text-anchor="middle" font-size="10.5" fill="#627c92">'+String(d.year).slice(2)+'</text>';
   });
   return s+'</svg>';
 }
 function donut(){
   const s=state.data.summary,total=s.total;const entries=[['published','Publications','#1268bb'],['active','Active projects','#2bb67e'],['paused','Standby','#efbb50'],['abandoned','Discontinued projects','#aebbc9']];
   let n=0;const wedges=entries.map(([key,label,color])=>{const from=n/total*100;n+=s[key];return color+' '+from+'% '+(n/total*100)+'%';});
   return '<div class="aa-donut-layout"><div class="aa-donut" style="background:conic-gradient('+wedges.join(',')+')"><div class="aa-donut-core"><strong>'+total+'</strong><small>record</small></div></div>'+
      '<div class="aa-legend">'+entries.map(([key,label,color])=>'<button type="button" data-aa-lifecycle="'+key+'"><span class="aa-swatch" style="background:'+color+'"></span>'+label+': <strong>'+s[key]+'</strong> ('+Math.round(s[key]/total*100)+'%)</button>').join('')+'</div></div>';
 }
 function heatmap(){
   const years=state.data.years,heat=state.data.heatmap;
   const color=n=>n===0?'#edf2f8':n===1?'#c6dff4':n===2?'#85bae4':n===3?'#4c93cb':'#185e9d';
   const textColor=n=>n>=3?'#fff':'#234c6a';
   return '<div class="aa-heat-scroll"><div class="aa-heat-grid">'+
    '<span></span>'+years.map(y=>'<span class="aa-heat-head">'+String(y).slice(2)+'</span>').join('')+
    heat.map(r=>'<span class="aa-heat-label">'+E(labels[r.phase]||r.phase)+'</span>'+r.values.map((n,i)=>
     '<button class="aa-heat-cell" type="button" style="background:'+color(n)+';color:'+textColor(n)+'" data-aa-phase="'+attr(r.phase)+'" data-aa-year="'+years[i]+'" data-aa-value="'+n+'" aria-label="'+E(labels[r.phase]||r.phase)+' year '+years[i]+': '+n+' projects">'+(n||'·')+'</button>'
    ).join('')).join('')+'</div></div>'+
    '<div id="aa-heat-description" class="aa-heat-note">Select a cell to inspect documented transitions. Values are transitions, not projects occupying a stage.</div>';
 }
 function forestSVG(){
   const rows=state.data.durations,w=600,h=314,left=40,right=50,top=18,bottom=45,plot=w-left-right,max=36,graphH=h-top-bottom;
   const xp=v=>left+v/max*plot;
   let svg='<svg class="aa-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Mean time between stages with 95 percent bootstrap confidence intervals">';
   for(let v=0;v<=36;v+=6){const x=xp(v);svg+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+(h-bottom)+'" stroke="#dce6ef" stroke-dasharray="3 4"/><text x="'+x+'" y="'+(h-25)+'" font-size="12" text-anchor="middle" fill="#58718a">'+v+'</text>';}
   rows.forEach((d,i)=>{const y=top+29+i*48,lo=xp(d.ciLow),hi=xp(d.ciHigh),mean=xp(d.mean),med=xp(d.median);
     svg+='<line x1="'+lo+'" y1="'+y+'" x2="'+hi+'" y2="'+y+'" stroke="#2279bd" stroke-width="3"/>';
     svg+='<line x1="'+lo+'" y1="'+(y-6)+'" x2="'+lo+'" y2="'+(y+6)+'" stroke="#2279bd" stroke-width="2"/><line x1="'+hi+'" y1="'+(y-6)+'" x2="'+hi+'" y2="'+(y+6)+'" stroke="#2279bd" stroke-width="2"/>';
     svg+='<rect x="'+xp(d.q1)+'" y="'+(y-11)+'" width="'+Math.max(1,xp(d.q3)-xp(d.q1))+'" height="22" rx="4" fill="#b5d4ea" fill-opacity=".85"/>';
     svg+='<rect x="'+(med-2)+'" y="'+(y-13)+'" width="4" height="26" fill="#6355a5"/>';
     svg+='<circle cx="'+mean+'" cy="'+y+'" r="6" fill="#166bc1" stroke="#fff" stroke-width="1.5"><title>Mean '+number(d.mean)+' months; median '+number(d.median)+'; n='+d.n+'</title></circle>';
   });
   return svg+'<text x="'+(left+plot/2)+'" y="'+(h-3)+'" text-anchor="middle" font-size="13" fill="#3a566d">Observed duration (months)</text></svg>';
 }
 function renderAnalytics(){
   const s=state.data.summary;
   const k=[['◈',s.total,'Total records',''],['▤',s.published,'Publications',''],['◇',s.active,'Active projects','aa-kpi-green'],['Ⅱ',s.paused,'On standby','aa-kpi-yellow'],['⊗',s.abandoned,'Discontinued projects','aa-kpi-red']];
   root.innerHTML='<div class="aa-kpis">'+k.map(([icon,n,label,cls])=>'<div class="aa-kpi '+cls+'"><span class="aa-kpi-icon">'+icon+'</span><span><strong>'+n+'</strong><small>'+label+'</small></span></div>').join('')+'</div>'+
    '<div class="aa-chartgrid"><section class="aa-panel aa-chartpanel"><h2 class="aa-heading">Projects Started by Year</h2><p class="aa-caption">Research initiatives with an identified start date (56 of 93 records; 2013–2026)</p>'+analyticsSVG()+'</section>'+
    '<section class="aa-panel aa-chartpanel"><h2 class="aa-heading">Portfolio Composition</h2><p class="aa-caption">Distribution of records by lifecycle status</p>'+donut()+'</section></div>'+
    '<section class="aa-panel aa-full"><h2 class="aa-heading">Research Journey — Scientific Stage Transitions</h2><p class="aa-caption">Distinct projects with a documented transition into each scientific stage, by year</p>'+
    heatmap()+'<p class="aa-statnote">The heatmap counts changes between scientific stages, not repeated movements within an editorial stage. Individual histories may be incomplete.</p></section>'+
    '<section class="aa-panel aa-full"><h2 class="aa-heading">Research Stage Durations</h2><p class="aa-caption">Observed time between documented consecutive stage changes · months · exploratory analysis</p>'+
    '<div class="aa-forest-wrap"><div><table class="aa-forest-table"><thead><tr><th>Scientific stage transition</th><th>n</th><th>Mean</th><th>Median</th></tr></thead><tbody>'+
    state.data.durations.map(d=>'<tr><td>'+E(labels[d.from]+' → '+labels[d.to])+'</td><td>'+d.n+'</td><td><strong>'+number(d.mean)+'</strong></td><td>'+number(d.median)+'</td></tr>').join('')+'</tbody></table>'+
    '<p class="aa-statnote"><strong>Interpretation.</strong> Blue dots: mean; whiskers: 95% bootstrap CI for the mean; purple ticks: median; pale blue bands: interquartile range (25th–75th percentiles). Only completed documented intervals are included; these may not reflect actual scientific stage durations.</p></div>'+
    '<div class="aa-forest-chart">'+forestSVG()+'</div></div></section>';
   root.querySelectorAll('[data-aa-lifecycle]').forEach(b=>b.addEventListener('click',()=>{state.filters={type:'all',lifecycle:b.dataset.aaLifecycle,phase:'all',year:'all',coauthor:''};state.query='';state.filterIds=null;setView('explorer')}));
   root.querySelectorAll('[data-aa-phase][data-aa-year]').forEach(b=>b.addEventListener('click',()=>{
      const phase=b.dataset.aaPhase,year=b.dataset.aaYear,n=Number(b.dataset.aaValue);
      const matches=state.data.records.filter(r=>(r.events||[]).some(t=>String(t.date||'').startsWith(year)&&(t.canonicalFrom||t.from)!==(t.canonicalTo||t.to)&&(t.canonicalTo||t.to)===phase));
      const target=document.getElementById('aa-heat-description');
      target.innerHTML='<strong>'+E(labels[phase])+' · '+year+': '+n+' projects</strong>. '+(matches.length?'<button type="button" class="aa-button" style="margin-left:8px" id="aa-heat-go">Open documented records ('+matches.length+')</button>':'Individual transition histories are available only in the private archive preview.');
      const go=document.getElementById('aa-heat-go');if(go)go.addEventListener('click',()=>{state.filterIds=new Set(matches.map(x=>x.id));setView('explorer')});
   }));
 }
 async function init(){
   try{
    const embedded=document.getElementById('aa-embedded');
    if(embedded){state.data=JSON.parse(embedded.textContent);}
    else{const res=await fetch('./data/archive-public-v1.json',{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);state.data=await res.json();}
    if(state.data?.records?.length!==93)throw Error('Archive record count mismatch');
    document.querySelectorAll('[data-aa-main-tab]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.aaMainTab)));
    window.addEventListener('hashchange',readRoute);
    window.addEventListener('popstate',readRoute);
    readRoute();
   }catch(err){root.innerHTML='<div class="aa-error"><strong>Archive unavailable.</strong><p>Unable to load the approved public data:'+E(err.message)+'</p></div>';console.error(err);}
 }
 init();
})();
