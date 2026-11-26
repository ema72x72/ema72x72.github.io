/* Academic Manager — Home Overview, derived only from the approved public
   Active Projects projection. Contains no private or canonical records. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const actionState=window.AcademicActions;
const e=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||''));
const fmt=d=>valid(d)?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(d+'T12:00:00')):'Not scheduled';
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const phases=[
 {name:'Initial Ideas',test:s=>/Initial Ideas|Exploratory|Idea Stage/i.test(s)},
 {name:'Data Collection',test:s=>/Data Collection/i.test(s)},
 {name:'Data Analyses',test:s=>/Data Analyses|Empirical Design/i.test(s)},
 {name:'Writing',test:s=>/First Draft|Final Draft|Writing|Revision/i.test(s)},
 {name:'Editorial',test:s=>/Submitted|Under Review|Editorial|R&R|Out for conference/i.test(s)}
];
function links(root,open){
 root.querySelectorAll('[data-open-project]').forEach(node=>node.addEventListener('click',event=>{
   event.preventDefault();open(node.getAttribute('data-open-project'));
 }));
}
function pipeline(projects,open){
 const groups=phases.map(p=>({name:p.name,items:projects.filter(x=>p.test(x.snapshot?.stage||''))}));
 const seen=new Set(groups.flatMap(g=>g.items.map(x=>x.id)));
 const other=projects.filter(p=>!seen.has(p.id));
 if(other.length)groups.push({name:'Other stages',items:other});
 const target=$('hm-pipeline'),summary=$('hm-phase-summary');
 target.style.gridTemplateColumns='repeat('+groups.length+',minmax(0,1fr))';
 target.innerHTML=groups.map((g,i)=>'<button type="button" class="hm-phase" data-phase="'+i+'" aria-pressed="false"><span>'+e(g.name)+'</span><b>'+g.items.length+'</b><small>'+(g.items.length===1?'1 project':g.items.length+' projects')+'</small></button>').join('');
 summary.textContent='Select a stage to see its projects. The historical timeline is available below.';
 target.querySelectorAll('[data-phase]').forEach(b=>b.addEventListener('click',()=>{
   const was=b.getAttribute('aria-pressed')==='true';
   target.querySelectorAll('[data-phase]').forEach(x=>x.setAttribute('aria-pressed','false'));
   if(was){summary.textContent='Select a stage to see its projects. The historical timeline is available below.';return;}
   b.setAttribute('aria-pressed','true');
   const items=groups[Number(b.getAttribute('data-phase'))].items;
   summary.innerHTML='<strong>'+e(groups[Number(b.getAttribute('data-phase'))].name)+':</strong> '+(items.length?items.map(p=>'<a href="#projects" data-open-project="'+e(p.id)+'">'+e(p.title)+'</a>').join(' · '):'No projects recorded');
   links(summary,open);
 }));
}
function actionSection(label,projects,open){
 if(!projects.length)return '';
 const heading='<section class="hm-work-section"><h3>'+e(label)+' <span>'+projects.length+' projects</span></h3>';
 const rows=projects.map(p=>{
   const actions=actionState.current(p.actions),s=p.snapshot||{};
   const renderList=items=>'<ul class="hm-actions">'+items.map(a=>{
     const state=actionState.state(a);
     const d=valid(a.dueDate)?a.dueDate:null;
     const time=d?'<span class="hm-action-date'+(d<today()?' past':'')+'">'+e(fmt(d))+(d<today()?' · verify':'')+'</span>':'';
     return '<li><div class="hm-action-text">'+e(a.text||'Description not recorded')+'</div><div class="hm-action-meta"><strong>'+e(state.label)+'</strong><span>'+e(a.owner||'Owner not specified')+'</span>'+time+'</div></li>';
   }).join('')+'</ul>';
   const list=actions.length?[['active','To Do & In Progress'],['unverified','Status to Verify']].map(([key,label])=>{
     const items=actionState.group(actions,key);
     return items.length?'<h4>'+label+' ('+items.length+')</h4>'+renderList(items):'';
   }).join(''):'<p class="hm-muted">No current actions or status checks recorded; monitor for an editorial or project update.</p>';
   return '<div class="hm-work-project"><div class="hm-work-title"><a href="#projects" data-open-project="'+e(p.id)+'">'+e(p.title)+' <span aria-hidden="true">›</span></a><span class="hm-work-count">'+(actions.length?actions.length+' actions':'Monitoring')+'</span></div>'+
     (s.nextAction?'<p class="hm-work-summary">'+e(s.nextAction)+'</p>':'')+list+'</div>';
 }).join('');
 return heading+rows+'</section>';
}
function actions(projects,open){
 const decisions=projects.filter(p=>/Decision Pending/i.test(p.snapshot?.status||''));
 const other=projects.filter(p=>!/Decision Pending/i.test(p.snapshot?.status||''));
 const working=other.filter(p=>actionState.current(p.actions).length);
 const monitor=other.filter(p=>!actionState.current(p.actions).length);
 const all=projects.flatMap(p=>p.actions||[]);
 const active=actionState.group(all,'active').length,uncertain=actionState.group(all,'unverified').length,completed=actionState.group(all,'completed').length;
 $('hm-action-count').textContent=active+' confirmed open/in-progress · '+uncertain+' statuses to verify · '+completed+' completed. Completed actions are available in each project’s Actions tab.';
 $('hm-matters').innerHTML=actionSection('Decisions to Make',decisions,open)+actionSection('Work & Follow-ups',working,open)+actionSection('Monitoring',monitor,open);
 links($('hm-matters'),open);
}
function milestoneDate(note,due){
 if(valid(due))return due;
 const dates=/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\b/gi;
 const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
 for(const match of note.matchAll(dates)){
   const before=note.slice(Math.max(0,match.index-100),match.index).split(/[.;\n]/).at(-1);
   // A dated observation or completed event is not a due date.
   if(/\b(?:as of|completed|recorded|sent|received|reported|updated)\b/i.test(before))continue;
   if(!/\b(?:scheduled|due|deadline|target(?:ed)?|planned|meeting|catch-up)\b/i.test(before)&&!/\bby\s*$/i.test(before))continue;
   const iso=match[3]+'-'+String(months.indexOf(match[1].toLowerCase())+1).padStart(2,'0')+'-'+String(match[2]).padStart(2,'0');
   const date=new Date(iso+'T12:00:00Z');
   if(!Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===iso)return iso;
 }
 return null;
}
function milestones(projects,open){
 const now=today(),items=projects.map(p=>{
   const note=String(p.snapshot?.milestone||'').trim()||'No milestone recorded';
   const date=milestoneDate(note,p.snapshot?.dueDate);
   const group=date?(date<now?1:0):2;
   const meeting=group===0&&/\b(meeting|scheduled|catch-up|call)\b/i.test(note);
   const label=group===1?'Past target · verify':group===0?(meeting?'Scheduled meeting':'Dated target'):(/\b(indicative|tentative|planned|targeted)\b/i.test(note)?'Indicative':'Date not confirmed');
   return {p,note,date,group,label};
 });
 const labels=['Scheduled & Dated','Past Targets to Verify','Indicative or Undated'];
 $('hm-milestones').innerHTML=labels.map((label,i)=>{
   const list=items.filter(x=>x.group===i).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||(a.p.priority||99)-(b.p.priority||99));
   if(!list.length)return '';
   return '<section class="hm-milestone-group"><h3>'+e(label)+' <span>'+list.length+'</span></h3>'+
     list.map(x=>'<a class="hm-milestone-row" href="#projects" data-open-project="'+e(x.p.id)+'"><div class="hm-milestone-date'+(i===1?' past':'')+'">'+e(fmt(x.date))+'</div><div class="hm-milestone-copy"><strong>'+e(x.p.title)+'</strong><p>'+e(x.note)+'</p><span class="hm-milestone-label'+(i===1?' past':'')+'">'+e(x.label)+'</span></div></a>').join('')+'</section>';
 }).join('');
 links($('hm-milestones'),open);
}
function render(data,open){
 if(!data||!Array.isArray(data.projects))throw Error('Invalid public Active Projects source');
 const projects=data.projects;
 const exploratory=projects.filter(p=>/Initial Ideas/i.test(p.snapshot?.stage||'')).length;
 $('hm-active-count').textContent=(projects.length-exploratory)+' active · '+exploratory+' exploratory';
 pipeline(projects,open);
 actions(projects,open);
 milestones(projects,open);
 if(window.AcademicTimeline){
   window.AcademicTimeline.render(projects,data.generatedAt,$('hm-research-timeline'),$('hm-research-timeline-note'));
   links($('hm-research-timeline'),open);
 }else $('hm-research-timeline').textContent='Historical timeline currently unavailable.';
 $('hm-overview-source').textContent='Source: public GitHub Active Projects · Projection updated '+(data.generatedAt||'undated')+' · Individual project dates indicate the last documented change, not a complete review of all sources.';
}
window.AcademicOverview={render};
})();
