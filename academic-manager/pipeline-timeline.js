/* Read-only research-stage Gantt. Uses only sanitized events already published
   in academic-manager/data/projects.json; no Trello text or private registry. */
(function(){
'use strict';
const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||''));
const palette={idea:'#d5e4f2',data_collection:'#89b9d8',data_analyses:'#408fc7',writing:'#226ba3',editorial_process:'#123c63'};
const labels={idea:'Initial Ideas',data_collection:'Data Collection',data_analyses:'Data Analyses',writing:'Writing',editorial_process:'Editorial'};
const day=x=>new Date(x+'T12:00:00Z').getTime();
function classify(value){
 const s=String(value||'');
 if(/Initial Ideas/i.test(s))return'idea';
 if(/Data Collection/i.test(s))return'data_collection';
 if(/Data Analyses|Empirical Design/i.test(s))return'data_analyses';
 if(/First Draft|Final Draft|Writing/i.test(s))return'writing';
 if(/Submitted|Under Review|Editorial|Out for conference/i.test(s))return'editorial_process';
 return null;
}
function stageEvidence(event){
 const label=String(event.label||'');
 if(event.type==='submission'&&/\bSubmission to\b/i.test(label))return {phase:'editorial_process',precision:'observed',label};
 if(event.type==='draft_received'||event.type==='manuscript'){
   if(/draft|manuscript/i.test(label))return {phase:'writing',precision:'observed',label};
 }
 if(event.type!=='stage_transition')return null;
 let phase=null;
 if(/(?:to|transition to|reclassified as)\s+Data Collection/i.test(label))phase='data_collection';
 else if(/(?:to|transition to|reclassified as)\s+Data Analyses/i.test(label))phase='data_analyses';
 else if(/first draft|final draft|(?:to|transition to)\s+writing/i.test(label))phase='writing';
 else if(/(?:to|transition to)\s+(?:submitted|out for conference)|editorial process/i.test(label))phase='editorial_process';
 else if(/(?:to|transition to)\s+initial ideas/i.test(label))phase='idea';
 if(!phase)return null;
 return {phase,precision:/\breclassified\b/i.test(label)?'observed':'transition',label};
}
function projectTimeline(project){
 const events=(project.events||[]).filter(e=>valid(e.date)).sort((a,b)=>a.date.localeCompare(b.date));
 const first=events.length?events[0].date:null,stamp=valid(project.snapshot?.updatedAt)?project.snapshot.updatedAt:null;
 const last=stamp||events.at(-1)?.date||first;
 const observations=events.map(e=>{const hit=stageEvidence(e);return hit?{...hit,date:e.date}:null;}).filter(Boolean);
 const created=events.some(e=>e.type==='created'&&e.date===first);
 if(created&&observations.some(x=>x.precision==='transition'&&/From Initial Ideas/i.test(x.label))){
   observations.push({date:first,phase:'idea',precision:'transition',label:'Project recorded at Initial Ideas'});
 }
 observations.sort((a,b)=>a.date.localeCompare(b.date)||a.precision.localeCompare(b.precision));
 const distinct=[];
 for(const item of observations){
   if(distinct.some(x=>x.date===item.date&&x.phase===item.phase))continue;
   distinct.push(item);
 }
 const intervals=[];
 const nowPhase=classify(project.snapshot?.stage);
 for(let i=0;i<distinct.length;i++){
   const obs=distinct[i];
   if(obs.precision!=='transition')continue;
   const next=distinct.slice(i+1).find(x=>x.phase!==obs.phase);
   if(next&&next.precision==='transition'&&next.date>obs.date){
     intervals.push({start:obs.date,end:next.date,phase:obs.phase,confidence:'two dated boundaries'});continue;
   }
   if(next)continue;
   if(nowPhase===obs.phase&&last>obs.date){
     intervals.push({start:obs.date,end:last,phase:obs.phase,confidence:'documented from stage entry to latest same-stage snapshot'});
   }
 }
 // A documented first editorial submission is an observation, not necessarily
 // a precise administrative transition. Show only with an explicit caveat.
 const submission=distinct.find(x=>x.phase==='editorial_process'&&x.precision==='observed');
 if(submission&&nowPhase==='editorial_process'&&last>submission.date&&!intervals.some(x=>x.phase==='editorial_process')){
   intervals.push({start:submission.date,end:last,phase:'editorial_process',confidence:'observed submission through latest same-stage snapshot'});
 }
 const markers=distinct.filter(item=>!intervals.some(b=>b.start===item.date&&b.phase===item.phase));
 return {project,first,last,current:nowPhase,intervals,markers};
}
function render(projects,asOf,root,note){
 const histories=projects.map(projectTimeline);
 const observedDates=histories.flatMap(x=>[x.first,x.last,...x.intervals.flatMap(y=>[y.start,y.end])]).filter(valid);
 if(!observedDates.length){root.textContent='No historical phase dates recorded.';return;}
 const minYear=Math.min(...observedDates.map(x=>Number(x.slice(0,4))));
 const maxYear=Math.max(...observedDates.map(x=>Number(x.slice(0,4))),Number(String(asOf||'').slice(0,4))||minYear);
 const left=195,right=34,rowHeight=46,top=57;
 const W=Math.max(1000,left+right+(maxYear-minYear+1)*155),H=top+histories.length*rowHeight+35;
 const first=day(minYear+'-01-01'),last=day((maxYear+1)+'-01-01');
 const x=date=>left+(day(date)-first)/(last-first)*(W-left-right);
 const years=Array.from({length:maxYear-minYear+1},(_,i)=>minYear+i);
 const grid=years.map(yr=>'<line x1="'+x(yr+'-01-01').toFixed(1)+'" x2="'+x(yr+'-01-01').toFixed(1)+'" y1="33" y2="'+(H-18)+'" stroke="#dee7ef" stroke-dasharray="3 5"/>'+
   '<text x="'+x(yr+'-07-01').toFixed(1)+'" y="23" fill="#627a91" font-size="12" text-anchor="middle">'+yr+'</text>').join('');
 let segmentCount=0,observedCount=0;
 const rows=histories.map((info,i)=>{
   const y=top+i*rowHeight,p=info.project;
   let s='<g><a href="#projects" data-open-project="'+E(p.id)+'"><text x="'+(left-12)+'" y="'+(y+5)+'" font-size="12" font-weight="650" fill="#254a68" text-anchor="end">'+E(p.title)+'</text></a>';
   s+='<line x1="'+left+'" x2="'+(W-right)+'" y1="'+y+'" y2="'+y+'" stroke="#eaf0f5"/>';
   if(info.first&&info.last&&info.last>=info.first){
     s+='<line x1="'+x(info.first).toFixed(1)+'" x2="'+x(info.last).toFixed(1)+'" y1="'+y+'" y2="'+y+'" stroke="#afbfce" stroke-width="3" stroke-dasharray="2 6">'+
       '<title>Documented activity span '+info.first+' to '+info.last+'; not necessarily continuous scientific-stage duration.</title></line>';
     s+='<circle cx="'+x(info.first).toFixed(1)+'" cy="'+y+'" r="4" fill="#adbfce"><title>First recorded event: '+info.first+'</title></circle>';
   }
   for(const b of info.intervals){
     segmentCount++;
     const color=palette[b.phase]||'#99a9b8';
     s+='<rect x="'+x(b.start).toFixed(1)+'" y="'+(y-10)+'" width="'+Math.max(3,x(b.end)-x(b.start)).toFixed(1)+'" height="20" rx="3" fill="'+color+'">'+
       '<title>'+E(labels[b.phase]||b.phase)+' · '+b.start+' to '+b.end+' · '+E(b.confidence)+'</title></rect>';
   }
   for(const m of info.markers){
     observedCount++;
     s+='<circle cx="'+x(m.date).toFixed(1)+'" cy="'+y+'" r="6.5" fill="'+(palette[m.phase]||'#839aac')+'" stroke="#fff" stroke-width="2">'+
       '<title>'+E(m.label)+' ('+m.date+'; '+m.precision+')</title></circle>';
   }
   if(info.last){s+='<circle cx="'+x(info.last).toFixed(1)+'" cy="'+y+'" r="4.5" fill="'+(palette[info.current]||'#839aac')+'" stroke="#fff" stroke-width="1.5"><title>Last known status: '+E(p.snapshot?.stage||'unspecified')+' · '+info.last+'</title></circle>';}
   return s+'</g>';
 }).join('');
 const stamp=valid(asOf)?asOf:null;
 const dateLine=stamp&&day(stamp)>=first&&day(stamp)<=last?
   '<line x1="'+x(stamp).toFixed(1)+'" x2="'+x(stamp).toFixed(1)+'" y1="34" y2="'+(H-16)+'" stroke="#ce9848" stroke-width="2" stroke-dasharray="5 4"/>'+
   '<text x="'+x(stamp).toFixed(1)+'" y="'+(H-3)+'" font-size="11" fill="#966c27" text-anchor="middle">Snapshot · '+E(stamp)+'</text>':'';
 root.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="100%" role="group" aria-label="Historical scientific-stage evidence for '+histories.length+' projects">'+grid+rows+dateLine+'</svg>';
 note.textContent=segmentCount+' stage segments and '+observedCount+' additional dated stage observations. Solid bars are based on documented phase transitions or first submission; dotted tracks show the period with recorded activity, not an inferred phase duration. Source: approved public project events, including Trello-derived dates.';
}
window.AcademicTimeline={render};
})();
