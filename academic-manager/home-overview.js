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
/* Only confirmed next actions or genuine decision/follow-up states belong here.
   Full tasks and uncertain completion states remain in the project details. */
function compactPhrase(text){
 const value=String(text||'').trim();
 const first=value.match(/^.*?[.!?](?:\s|$)/);
 return first?first[0].trim():value;
}
function priorityItems(projects){
 const rows=projects.map(p=>{
   const s=p.snapshot||{};
   const status=String(s.status||'');
   const active=actionState.group(p.actions,'active');
   if(/Decision Pending/i.test(status))return {p,kind:'decision',tag:'Decision',weight:0};
   if(/Waiting for Me|Waiting for Coauthors/i.test(status))return {p,kind:'waiting',tag:/Waiting for Me/i.test(status)?'Your follow-up':'Awaiting coauthors',weight:1};
   if(active.length)return {p,kind:'active',tag:active.some(a=>a.status==='blocked')?'Blocked':'In progress',weight:2};
   return null;
 }).filter(Boolean);
 rows.sort((a,b)=>a.weight-b.weight||(a.p.priority||99)-(b.p.priority||99));
 return rows;
}
function actions(projects,open){
 const rows=priorityItems(projects);
 $('hm-action-count').textContent=rows.length+' projects needing a decision, follow-up or confirmed active work. Individual task histories remain in Active Projects.';
 $('hm-matters').innerHTML='<div class="hm-focus-list">'+rows.map(({p,kind,tag})=>{
   const next=compactPhrase(p.snapshot?.nextAction||'See the project’s current status.');
   return '<a class="hm-focus-row" href="#projects" data-open-project="'+e(p.id)+'">'+
    '<span class="hm-focus-main"><strong>'+e(p.title)+'</strong><span class="hm-focus-detail">'+e(next)+'</span></span>'+
    '<span class="hm-focus-tag '+kind+'">'+e(tag)+'</span></a>';
 }).join('')+'</div>'+
 '<a class="hm-overview-more" href="#projects">Open Active Projects for detailed tasks and status checks <span aria-hidden="true">›</span></a>';
 links($('hm-matters'),open);
}
/* Only dates explicitly attached to future scheduling/targets qualify.
   Past completed events and 'as of' observations are not milestones. */
function milestoneDate(note,due){
 if(valid(due))return due;
 const dates=/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\b/gi;
 const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
 for(const match of String(note||'').matchAll(dates)){
   const before=note.slice(Math.max(0,match.index-100),match.index).split(/[.;\n]/).at(-1);
   if(/\b(?:as of|completed|recorded|sent|received|reported|updated|requested)\b/i.test(before))continue;
   if(!/\b(?:scheduled|due|deadline|target(?:ed)?|planned|meeting|catch-up)\b/i.test(before)&&!/\bby\s*$/i.test(before))continue;
   const iso=match[3]+'-'+String(months.indexOf(match[1].toLowerCase())+1).padStart(2,'0')+'-'+String(match[2]).padStart(2,'0');
   const date=new Date(iso+'T12:00:00Z');
   if(!Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===iso)return iso;
 }
 return null;
}
function meaningfulMilestones(projects){
 const now=today(),months=['january','february','march','april','may','june','july','august','september','october','november','december'];
 const rows=[];
 for(const p of projects){
   const s=p.snapshot||{},note=String(s.milestone||'').trim();
   if(!note)continue;
   const date=milestoneDate(note,s.dueDate);
   if(date&&date>=now){
     const isMeeting=/\b(meeting|scheduled|catch-up|call)\b/i.test(note);
     let description=compactPhrase(note);
     // A completed historical clause is not part of a future milestone.
     if(/^\b(?:FIRS|earlier|original|completed|recorded)\b/i.test(description)){
       const match=note.match(/(?:Next planned work|Next scheduled|Next target)\s*:\s*([^.;]+)/i);
       if(match)description=match[1].trim();
     }
     rows.push({p,date,tag:isMeeting?'Meeting':'Dated target',description,weight:0});
     continue;
   }
   // Explicit forward-looking month or year goals without a fixed day.
   const plan=note.match(/\b(?:next planned work|next target|planned for)\s*:\s*([^;.]*)/i);
   const target=note.match(/\b(?:targeted|due|expected|planned)\s+by\s+end[- ](?:of[- ])?(20\d{2})\b/i);
   const month=plan&&plan[1].match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
   if(target&&Number(target[1])>=Number(now.slice(0,4))){
     rows.push({p,date:null,tag:'Indicative target',description:compactPhrase(note),sortDate:target[1]+'-12-31',when:'End '+target[1],weight:1});
   }else if(month){
     const year=Number(now.slice(0,4));
     const monthNumber=months.indexOf(month[1].toLowerCase())+1;
     if(monthNumber>=Number(now.slice(5,7))){
       rows.push({p,date:null,tag:'Planned · date TBD',description:plan[1].trim(),sortDate:year+'-'+String(monthNumber).padStart(2,'0')+'-99',when:month[1]+' '+year,weight:2});
     }
   }
 }
 return rows.sort((a,b)=>String(a.date||a.sortDate||'9999').localeCompare(String(b.date||b.sortDate||'9999'))||a.weight-b.weight||(a.p.priority||99)-(b.p.priority||99));
}
function milestones(projects,open){
 const rows=meaningfulMilestones(projects);
 $('hm-milestones').innerHTML='<div class="hm-compact-milestones">'+(rows.length?rows.map(r=>
   '<a class="hm-compact-milestone" href="#projects" data-open-project="'+e(r.p.id)+'">'+
   '<span class="hm-compact-when">'+e(r.date?fmt(r.date):r.when||'To be scheduled')+'</span>'+
   '<span class="hm-compact-what"><strong>'+e(r.p.title)+'</strong><span>'+e(r.description)+'</span></span>'+
   '<span class="hm-focus-tag '+(r.tag==='Meeting'?'scheduled':'tentative')+'">'+e(r.tag)+'</span></a>'
 ).join(''):'<p class="hm-empty">No upcoming dated or explicitly planned milestones in the current records.</p>')+'</div>'+
 '<a class="hm-overview-more" href="#projects">Open Active Projects for all milestones and undated plans <span aria-hidden="true">›</span></a>';
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
