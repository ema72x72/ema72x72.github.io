/* Academic Manager — project details from public, versioned GitHub JSON. */
(function () {
  'use strict';
  const section=document.getElementById('projects');
  if (!section) return;
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dateText=value=>{if(!value)return 'Non indicata';const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);return m?m[3]+'/'+m[2]+'/'+m[1]:escapeHTML(value)};
  const empty=value=>value===null||value===undefined||String(value).trim()==='';
  const display=value=>empty(value)?'<em>Da documentare</em>':escapeHTML(value);
  const statusPill=value=>'<span class="rp-pill '+(/Risk|Stalling/i.test(value)?'rp-alert':/Waiting/i.test(value)?'rp-wait':'')+'">'+escapeHTML(value)+'</span>';
  const phasePill=value=>'<span class="rp-pill">'+escapeHTML(value)+'</span>';
  const oldContent=section.innerHTML;
  let projects=[];
  let selectedId=null;
  let selectedPanel='snapshot';

  function panelContent(p,key){
    const s=p.snapshot||{}, profile=p.profile||{}, actions=p.actions||[], events=p.events||[];
    if(key==='snapshot'){
      return '<div class="rp-two"><div class="rp-field"><h4>Ultimi risultati e avanzamenti</h4><p>'+display(s.progress)+'</p></div><div class="rp-field"><h4>Criticità / questioni aperte</h4><p>'+display(s.issue)+'</p></div></div><div class="rp-field"><h4>Prossima milestone</h4><p>'+display(s.milestone)+'</p>'+(s.dueDate?'<p class="rp-muted">Scadenza indicativa: '+dateText(s.dueDate)+'</p>':'')+'</div>';
    }
    if(key==='actions'){
      return '<h4>To-do registrati</h4>'+(actions.length?'<div class="rp-todo">'+actions.map(a=>'<div><span class="rp-circle" aria-hidden="true"></span><div><div>'+display(a.text)+'</div><small>Responsabile: '+display(a.owner)+(a.dueDate?' · '+dateText(a.dueDate):'')+'</small></div></div>').join('')+'</div>':'<p>Nessuna attività immediata registrata.</p>')+'<p class="rp-muted">Lo stato delle singole attività non è ancora verificato. Il cerchio non indica che l’attività sia aperta o incompleta.</p>';
    }
    if(key==='history'){
      const sorted=[...events].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
      return '<h4>Eventi documentati</h4>'+(sorted.length?sorted.map(e=>'<div class="rp-history"><strong>'+dateText(e.date)+'</strong><p>'+display(e.label)+'</p><p>'+display(e.source)+'</p></div>').join(''):'<p>Nessun evento ancora registrato.</p>')+'<p class="rp-muted">Per ora è registrato un solo evento per progetto, relativo all’ultimo aggiornamento noto. La storia verrà ampliata con le prossime modifiche tramite GPT.</p>';
    }
    return '<h4>Profilo della ricerca</h4><div class="rp-field"><h4>Research question</h4><p>'+display(profile.researchQuestion)+'</p></div><div class="rp-field"><h4>Contributo scientifico</h4><p>'+display(profile.contribution)+'</p></div><div class="rp-field"><h4>Metodologia</h4><p>'+display(profile.methodology)+'</p></div><div class="rp-field"><h4>Risultati principali</h4><p>'+display(profile.mainFindings)+'</p></div><p class="rp-muted">I profili saranno compilati progressivamente da GPT usando fonti verificabili.</p>';
  }

  function renderDetail(id,panel='snapshot',scroll=false){
    const p=projects.find(x=>x.id===id);if(!p)return;
    selectedId=id;selectedPanel=panel;
    const s=p.snapshot||{};
    const tabs=[['snapshot','Stato e risultati'],['actions','To-do'],['history','Cronologia'],['profile','Profilo ricerca']];
    const html='<div class="rp-heading"><div><div class="rp-overline">Scheda di ricerca</div><h3>'+escapeHTML(p.title)+'</h3><p>'+display(p.coauthors)+'</p></div><div class="rp-heading-tags">'+phasePill(s.stage)+statusPill(s.status)+'</div></div>'
      +'<div class="rp-info"><div><small>Fase scientifica</small><strong>'+display(s.stage)+'</strong></div><div><small>Stato operativo</small><strong>'+display(s.status)+'</strong></div><div><small>Ultimo aggiornamento</small><strong>'+dateText(s.updatedAt)+'</strong></div></div>'
      +'<div class="rp-next"><strong>Prossima azione</strong><div>'+display(s.nextAction)+'</div><small>Responsabile: '+display(s.owner)+'</small></div>'
      +'<div class="rp-tabs" role="tablist" aria-label="Sezioni del progetto">'+tabs.map(([key,name])=>'<button type="button" role="tab" aria-selected="'+String(panel===key)+'" data-rp-tab="'+key+'">'+name+'</button>').join('')+'</div>'
      +'<div class="rp-body" role="tabpanel">'+panelContent(p,panel)+'</div><div class="rp-source">Fonte dello snapshot: '+display(s.source)+'</div>';
    const detail=document.getElementById('rp-detail');
    detail.innerHTML=html;
    section.querySelectorAll('#rp-rows tr').forEach(row=>row.classList.toggle('rp-selected',row.dataset.rpId===id));
    section.querySelectorAll('.rp-mobile-card').forEach(card=>card.classList.toggle('rp-mobile-selected',card.dataset.rpOpen===id));
    detail.querySelectorAll('button[data-rp-tab]').forEach(button=>button.addEventListener('click',()=>renderDetail(id,button.dataset.rpTab,false)));
    if(scroll)detail.scrollIntoView({behavior:'smooth',block:'start'});
  }


  // One shared ordering for desktop table and mobile cards.
  const stageOrder=['Initial Ideas','Data Collection','Data Analyses','First Draft','Final Draft','Out for conference','Submitted (1st round)','Revision','Submitted as R&R','Accepted','Proofs','Online'];
  const statusOrder=['At Risk of Stalling','At Risk','Decision Pending','Waiting for Me','Waiting for Coauthors','Under Review','On Track'];
  const collator=new Intl.Collator('it',{numeric:true,sensitivity:'base'});
  let sortKey='priority';
  let sortDirection='asc';

  function getOrderedProjects(){
    const sortNumber=(name,values)=>{const i=values.findIndex(x=>x.toLowerCase()===String(name||'').toLowerCase());return i<0?values.length:i;};
    const order=sortDirection==='asc'?1:-1;
    return projects.slice().sort((a,b)=>{
      const as=a.snapshot||{},bs=b.snapshot||{};
      let cmp=0;
      switch(sortKey){
        case 'title':cmp=collator.compare(a.title||'',b.title||'');break;
        case 'stage':cmp=sortNumber(as.stage,stageOrder)-sortNumber(bs.stage,stageOrder);break;
        case 'status':cmp=sortNumber(as.status,statusOrder)-sortNumber(bs.status,statusOrder);break;
        case 'updated':cmp=String(as.updatedAt||'').localeCompare(String(bs.updatedAt||''));break;
        default:cmp=(a.priority??999)-(b.priority??999);
      }
      return cmp*order||collator.compare(a.title||'',b.title||'');
    });
  }

  function sortProjects(key){
    if(sortKey===key)sortDirection=sortDirection==='asc'?'desc':'asc';
    else{sortKey=key;sortDirection=key==='updated'?'desc':'asc';}
    renderProjectLists();
  }

  function renderProjectLists(){
    const ordered=getOrderedProjects();
    const rows=document.getElementById('rp-rows');
    const cards=document.getElementById('rp-mobile-cards');
    if(!rows||!cards)return;
    rows.innerHTML=ordered.map(p=>{
      const s=p.snapshot||{};
      return '<tr data-rp-id="'+escapeHTML(p.id)+'" class="'+(selectedId===p.id?'rp-selected':'')+'"><td><button class="rp-project" type="button" data-rp-open="'+escapeHTML(p.id)+'">'+escapeHTML(p.title)+'</button><small class="rp-subtitle">'+display(p.coauthors)+'</small></td><td><span class="rp-stage">'+display(s.stage)+'</span></td><td>'+statusPill(s.status)+'</td><td class="rp-date">'+dateText(s.updatedAt)+'</td></tr>';
    }).join('');
    cards.innerHTML=ordered.map(p=>{
      const s=p.snapshot||{};
      return '<button type="button" class="rp-mobile-card'+(selectedId===p.id?' rp-mobile-selected':'')+'" data-rp-open="'+escapeHTML(p.id)+'"><span class="rp-mobile-title">'+escapeHTML(p.title)+'</span><span class="rp-mobile-authors">'+display(p.coauthors)+'</span><span class="rp-mobile-info"><span><small>Fase scientifica</small><strong>'+display(s.stage)+'</strong></span><span><small>Stato operativo</small>'+statusPill(s.status)+'</span></span><span class="rp-mobile-date">Aggiornato: '+dateText(s.updatedAt)+'</span></button>';
    }).join('');
    section.querySelectorAll('[data-rp-open]').forEach(button=>button.addEventListener('click',()=>renderDetail(button.dataset.rpOpen,'snapshot',true)));
    section.querySelectorAll('th[data-rp-sort-header]').forEach(th=>{
      const active=sortKey===th.dataset.rpSortHeader;
      th.setAttribute('aria-sort',active?(sortDirection==='asc'?'ascending':'descending'):'none');
      const symbol=th.querySelector('.rp-sort-indicator');
      if(symbol)symbol.textContent=active?(sortDirection==='asc'?'▲':'▼'):'↕';
    });
    const select=document.getElementById('rp-mobile-sort');
    if(select)select.value=sortKey;
    const dir=document.getElementById('rp-mobile-direction');
    if(dir){
      dir.textContent=sortDirection==='asc'?'↑ Crescente':'↓ Decrescente';
      dir.setAttribute('aria-label','Inverti ordinamento; attuale: '+(sortDirection==='asc'?'crescente':'decrescente'));
    }
  }

  function buildApp(){
    projects.sort((a,b)=>(a.priority??999)-(b.priority??999));
    const headings=[['title','Progetto'],['stage','Fase scientifica'],['status','Stato operativo'],['updated','Aggiornato']];
    section.innerHTML='<div class="rp-header"><div><div class="eyebrow">Portfolio / Current research</div><h2>Progetti attivi</h2><p>Seleziona un progetto per consultare stato, attività, cronologia e profilo di ricerca.</p></div><small class="rp-count">'+projects.length+' progetti · dati versionati su GitHub</small></div>'
      +'<div class="rp-sort-mobile"><label for="rp-mobile-sort">Ordina per</label><div class="rp-sort-controls"><select id="rp-mobile-sort"><option value="priority">Ordine di lavoro</option>'+headings.map(([k,name])=>'<option value="'+k+'">'+name+'</option>').join('')+'</select><button type="button" id="rp-mobile-direction" aria-label="Inverti ordinamento">↑ Crescente</button></div></div>'
      +'<div class="panel rp-list-panel"><div class="rp-table-wrap"><table class="rp-table"><thead><tr>'+headings.map(([k,name])=>'<th scope="col" data-rp-sort-header="'+k+'" aria-sort="none"><button class="rp-sort-head" type="button" data-rp-sort="'+k+'" aria-label="Ordina per '+name+'">'+name+' <span class="rp-sort-indicator" aria-hidden="true">↕</span></button></th>').join('')+'</tr></thead><tbody id="rp-rows"></tbody></table></div><div class="rp-mobile-cards" id="rp-mobile-cards"></div></div>'
      +'<div class="panel rp-detail" id="rp-detail" aria-live="polite"></div>';
    section.querySelectorAll('[data-rp-sort]').forEach(button=>button.addEventListener('click',()=>sortProjects(button.dataset.rpSort)));
    document.getElementById('rp-mobile-sort').addEventListener('change',e=>{sortKey=e.target.value;sortDirection=sortKey==='updated'?'desc':'asc';renderProjectLists();});
    document.getElementById('rp-mobile-direction').addEventListener('click',()=>{sortDirection=sortDirection==='asc'?'desc':'asc';renderProjectLists();});
    renderProjectLists();
    renderDetail(projects[0].id,'snapshot',false);
    // Overview uses the same live source; its visual redesign remains a separate task.
    const overview=document.getElementById('overview-cards');
    if(overview){
      overview.innerHTML=projects.map(p=>{
        const s=p.snapshot||{};
        return '<div class="card" role="button" tabindex="0" data-project-id="'+escapeHTML(p.id)+'"><b>'+escapeHTML(p.title)+'</b><div class="meta">'+display(p.coauthors)+'</div><span class="pill">'+display(s.stage)+'</span>'+statusPill(s.status)+'</div>';
      }).join('');
      const openFromCard=(e,keyboard=false)=>{
        if(keyboard&&e.key!=='Enter'&&e.key!==' ')return;
        const card=e.target.closest('[data-project-id]');
        if(!card||!overview.contains(card))return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if(typeof show==='function')show('projects');
        renderDetail(card.dataset.projectId,'snapshot',true);
      };
      overview.addEventListener('click',e=>openFromCard(e,false),true);
      overview.addEventListener('keydown',e=>openFromCard(e,true),true);
    }
    if(window.location.hash==='#projects'&&typeof show==='function')show('projects');
  }

  fetch('./data/projects.json?refresh='+Date.now(),{cache:'no-store'})
    .then(response=>{if(!response.ok)throw Error('HTTP '+response.status);return response.json()})
    .then(payload=>{
      if(payload.schemaVersion!==1||!Array.isArray(payload.projects)||!payload.projects.length)throw Error('Schema non valido');
      for(const p of payload.projects){if(!p.id||!p.title||!p.snapshot||!p.snapshot.stage)throw Error('Record di progetto incompleto')}
      projects=payload.projects;
      buildApp();
      const stamp=document.querySelector('#overview .top p');
      if(stamp)stamp.textContent=projects.length+' progetti monitorati · dati aggiornati da GitHub';
    })
    .catch(error=>{
      section.innerHTML=oldContent+'<div class="rp-error" role="alert">I dati aggiornati di GitHub non sono disponibili. Ricarica la pagina tra poco. Dettaglio tecnico: '+escapeHTML(error.message)+'</div>';
      const overview=document.getElementById('overview');
      if(overview)overview.insertAdjacentHTML('afterbegin','<p class="rp-error" role="alert">Attenzione: impossibile aggiornare i progetti da GitHub. Le schede seguenti sono una vecchia copia.</p>');
    });
})();
