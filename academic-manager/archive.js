
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
 const state={data:null,view:'explorer',record:null,detailTab:'overview',query:'',sort:'updated',filterIds:null,returnScroll:0,
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
   root.innerHTML='<div class="aa-explorer-layout"><div class="aa-explorer-tools">'+
    '<input id="aa-search" class="aa-input aa-search" type="search" autocomplete="off" aria-label="Search the research archive" placeholder="Search titles, coauthors, keywords..." value="'+attr(state.query)+'">'+

    '<select id="aa-sort" class="aa-select aa-sort" aria-label="Sort records"><option value="updated">Last updated (newest)</option><option value="year">Year (newest)</option><option value="title">Title (A–Z)</option><option value="status">Status</option></select></div>'+
    '<aside id="aa-filter-panel" class="aa-filters" aria-label="Research filters"><div class="aa-filter-title">Filters <span id="aa-active-filter-count"></span><span class="aa-filter-sub">Refine your search</span></div><div class="aa-filtergrid">'+
    '<div class="aa-field"><label for="aa-f-type">Type</label><select class="aa-select" id="aa-f-type"><option value="all">All</option><option value="project">Projects</option><option value="article">Journal articles</option><option value="book">Books</option><option value="book_chapter">Book chapters</option></select></div>'+
    '<div class="aa-field"><label for="aa-f-status">Status</label><select class="aa-select" id="aa-f-status"><option value="all">All</option><option value="active">Active</option><option value="paused">Standby</option><option value="published">Published</option><option value="abandoned">Discontinued</option></select></div>'+
    '<div class="aa-field"><label for="aa-f-phase">Last scientific stage</label><select class="aa-select" id="aa-f-phase"><option value="all">All</option>'+steps.map(x=>'<option value="'+x+'">'+E(labels[x])+'</option>').join('')+'</select></div>'+
    '<div class="aa-field"><label for="aa-f-year">Publication year</label><select class="aa-select" id="aa-f-year"><option value="all">All</option>'+visibleYears().map(y=>'<option value="'+y+'">'+y+'</option>').join('')+'</select></div>'+
    '<div class="aa-field"><label for="aa-f-coauthors">Coauthors</label><input class="aa-input" id="aa-f-coauthors" placeholder="Coauthor name" value="'+attr(f.coauthor)+'"></div></div>'+
    '<div class="aa-row" style="margin-top:13px;justify-content:flex-end"><button class="aa-button" id="aa-clear" type="button">Clear filters</button></div></aside>'+
    '<div class="aa-explorer-foot"><strong id="aa-result-count"></strong><span>Select a record to open its detail page</span></div>'+
    '<div class="aa-list" id="aa-results" aria-live="polite"></div>'+
    '<p class="aa-statnote">Research titles and scientific stages are displayed where authorized. Private documentation, correspondence and individual historical project events are excluded.</p></div>';
   document.getElementById('aa-sort').value=state.sort;
   for(const [id,v] of [['aa-f-type',f.type],['aa-f-status',f.lifecycle],['aa-f-phase',f.phase],['aa-f-year',f.year]])document.getElementById(id).value=v;
   document.getElementById('aa-search').addEventListener('input',e=>{state.query=e.target.value;refreshRecords()});
   document.getElementById('aa-f-coauthors').addEventListener('input',e=>{state.filters.coauthor=e.target.value;refreshRecords()});
   for(const [id,key] of [['aa-f-type','type'],['aa-f-status','lifecycle'],['aa-f-phase','phase'],['aa-f-year','year']])
      document.getElementById(id).addEventListener('change',e=>{state.filters[key]=e.target.value;refreshRecords()});
   document.getElementById('aa-sort').addEventListener('change',e=>{state.sort=e.target.value;refreshRecords()});
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
     const meta=[r.authors||'',types[r.type]||r.type,r.year?String(r.year):(r.updatedAt?'Updated '+date(r.updatedAt):''),r.type==='project'&&r.phase?labels[r.phase]:''].filter(Boolean).join(' · ');
     return '<button type="button" class="aa-record" data-aa-record="'+attr(r.id)+'"><span class="aa-record-icon" aria-hidden="true">'+(r.type==='project'?'◇':'▤')+'</span>'+
      '<span class="aa-record-body"><span class="aa-record-title">'+E(r.title)+'</span><span class="aa-record-sub">'+E(meta)+'</span></span>'+
      '<span class="aa-record-badge">'+badge(r.lifecycle)+'</span><span class="aa-chevron" aria-hidden="true">›</span></button>';
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

 function renderEditorialHistory(r){
   if(r.lifecycle!=='published')return '';
   const history=r.editorialHistory;
   const journals=history&&Array.isArray(history.journals)?history.journals:[];
   const heading='<div class="aa-editorial-head"><h3 class="aa-heading">Editorial History</h3><p class="aa-caption">Journal-by-journal submissions and editorial decisions from documented historical records.</p></div>';
   if(!journals.length)return '<section class="aa-editorial">'+heading+'<p class="aa-muted">A verified journal-by-journal submission history is not available for this publication yet. No decisions or dates are inferred.</p></section>';
   const outcome={
     rejected:'Rejected',
     desk_rejected:'Desk rejected',
     reject_resubmit:'Reject and resubmit',
     revise_resubmit:'Revise and resubmit',
     accepted:'Accepted',
     conditional_acceptance:'Conditional acceptance',
     withdrawn:'Withdrawn',
     revision_requested:'Revision requested',
     minor_revision:'Minor revision',
     major_revision:'Major revision',
     transfer_suggested:'Transfer suggested',
     out_of_scope_rejection:'Rejected (out of scope)',
     unknown:'Decision not documented'
   };
   const submission={
     initial:'Initial submission',
     new_submission:'New submission',
     revised_submission:'Revised submission'
   };
   const totals=journals.reduce((a,j)=>{a.actions+=(j.rounds||[]).filter(x=>x.submissionDate).length;a.dated+=(j.rounds||[]).filter(x=>x.decisionDate).length;return a;},{actions:0,dated:0});
   const groups=journals.map((journal,i)=>{
     const rounds=Array.isArray(journal.rounds)?journal.rounds:[];
     const last=rounds[rounds.length-1]||{};
     const lastLabel=outcome[last.outcome]||'Decision unknown';
     const accepted=new Set(['accepted','conditional_acceptance']), revisions=new Set(['revise_resubmit','reject_resubmit','revision_requested','minor_revision','major_revision']), rejected=new Set(['rejected','desk_rejected','out_of_scope_rejection']);
     const statusClass=accepted.has(last.outcome)?'aa-editorial-accepted':revisions.has(last.outcome)?'aa-editorial-revision':rejected.has(last.outcome)?'aa-editorial-rejected':'aa-editorial-neutral';
     const rows=rounds.map(x=>{
       const validDecision=x.decisionDate&&/^\d{4}-\d{2}-\d{2}$/.test(x.decisionDate);
       const validSubmission=x.submissionDate&&/^\d{4}-\d{2}-\d{2}$/.test(x.submissionDate);
       const evidenceText=x.evidenceLevel==='partial'?'Partial record':x.evidenceLevel==='corroborated'?'Stage-corroborated':'Dated source record';
       return '<div class="aa-editorial-round">'+
         '<div class="aa-editorial-step"><strong>'+E(submission[x.submissionType]||'Submission event')+'</strong><small>'+E(evidenceText)+'</small></div>'+
         '<div><small>Submitted</small><strong>'+(validSubmission?'<time datetime="'+E(x.submissionDate)+'">'+E(x.submissionDate)+'</time>':'Not documented')+'</strong></div>'+
         '<div><small>Decision</small><strong>'+E(outcome[x.outcome]||'Unknown')+'</strong><span class="aa-editorial-date">'+(validDecision?'<time datetime="'+E(x.decisionDate)+'">'+E(x.decisionDate)+'</time>':'Date not documented')+'</span></div>'+
         '<div><small>Elapsed</small><strong>'+(Number.isInteger(x.elapsedDays)&&validDecision?E(x.elapsedDays)+' days':'Not estimable')+'</strong></div>'+
       '</div>';
     }).join('');
     return '<details class="aa-editorial-journal"'+(i===journals.length-1?' open':'')+'>'+
       '<summary><span class="aa-editorial-journal-name">'+E(journal.journal||'Journal not specified')+'</span>'+
       '<span class="aa-editorial-submissions">'+rounds.length+' '+(rounds.length===1?'recorded episode':'recorded episodes')+'</span>'+
       '<span class="aa-editorial-status '+statusClass+'">'+E(lastLabel)+'</span><span class="aa-editorial-chevron" aria-hidden="true">⌄</span></summary>'+
       '<div class="aa-editorial-rounds">'+rows+'</div></details>';
   }).join('');
   return '<section class="aa-editorial">'+heading+
     '<div class="aa-editorial-stats"><span><strong>'+journals.length+'</strong> journals</span><span><strong>'+totals.actions+'</strong> dated submissions</span><span><strong>'+totals.dated+'</strong> dated decisions</span></div>'+
     '<div class="aa-editorial-journals">'+groups+'</div>'+
     '<p class="aa-statnote">Journal events are reconstructed from dated historical notes and associated stage transitions. “Stage-corroborated” means that a list transition and the confirmed final publication help establish an event, rather than a standalone editorial decision letter. “Partial record” indicates missing or uncertain dates or attribution. Elapsed days are observed log intervals, not independently verified editorial processing times. Reject and resubmit is not a formal R&R. Private source notes and correspondence are not published.</p>'+
   '</section>';
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
     const canonical=e=>({date:String(e.date||'').slice(0,10),from:e.canonicalFrom||e.from,to:e.canonicalTo||e.to});
     const raw=(Array.isArray(r.events)?r.events:[]).map(canonical);
     const transitions=raw.filter(e=>e.date&&steps.includes(e.from)&&steps.includes(e.to)&&e.from!==e.to).sort((a,b)=>a.date.localeCompare(b.date));
     const visited=new Set(transitions.flatMap(e=>[e.from,e.to]));
     const progress='<div class="aa-flow" aria-label="Documented scientific journey">'+steps.map(p=>'<div class="aa-flowitem'+(visited.has(p)?' aa-visited':'')+(p===r.phase?' aa-last':'')+(p===r.maxPhase?' aa-max':'')+'"><span class="aa-dot">'+(visited.has(p)||p===r.phase||p===r.maxPhase?'●':'·')+'</span><span class="aa-flowname">'+E(labels[p])+'</span></div>').join('')+'</div>';
     const history=transitions.length?'<div class="aa-timeline">'+transitions.map(e=>'<article class="aa-event"><time datetime="'+E(e.date)+'">'+E(e.date)+'</time><strong>'+E(labels[e.from])+' → '+E(labels[e.to])+'</strong></article>').join('')+'</div>':
       (r.lifecycle==='published'?'<p class="aa-muted">No stage-by-stage project history is documented for this publication. The verified bibliographic year is '+E(r.year||'not available')+'.</p>':
       '<p class="aa-muted">Dated individual stage transitions are not available in this public view for this project.</p>');
     body.innerHTML='<div class="aa-panel"><h3 class="aa-heading">Scientific Journey</h3>'+
       (noPhase?'<p class="aa-muted">Scientific stages are not available in this public view.</p>':progress)+
       '<div class="aa-info-grid">'+info('Last scientific stage',r.phase?labels[r.phase]:null)+info('Most advanced stage reached',r.maxPhase?labels[r.maxPhase]:null)+'</div>'+
       '<p class="aa-statnote">Filled stages mark documented visits; blue and purple indicators mark the last and most advanced stages. Undocumented intermediate stages are not inferred.</p>'+
       '<div class="aa-journey"><h3 class="aa-heading">Documented stage transitions'+(transitions.length?' ('+transitions.length+')':'')+'</h3>'+history+
       (transitions.length?'<p class="aa-muted aa-timeline-foot">Only changes between canonical scientific stages are shown above. Journal-level decisions, where verified, appear below.</p>':'')+'</div>'+renderEditorialHistory(r)+'</div>';
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
