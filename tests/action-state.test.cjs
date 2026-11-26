const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..','academic-manager');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'action-state.js'),'utf8'),context);
const state=context.window.AcademicActions;
test('unverified and missing status are uncertainty, not confirmed open tasks',()=>{
 for(const action of [{status:'unverified'},{},{status:'unexpected'}])assert.equal(state.state(action).group,'unverified');
 assert.equal(state.group([{status:'unverified'}],'active').length,0);
});
test('completed and superseded actions are excluded from current work',()=>{
 const actions=['completed','superseded','open','in_progress','blocked','unverified'].map(status=>({status}));
 assert.equal(state.current(actions).length,4);
 assert.equal(state.group(actions,'completed').length,1);
 assert.equal(state.group(actions,'active').length,3);
});
test('real portfolio uses identical action counts on Home and in project groups',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(root,'data','projects.json'),'utf8'));
 const all=data.projects.flatMap(p=>p.actions);
 const projectCount=data.projects.reduce((n,p)=>n+state.current(p.actions).length,0);
 assert.equal(projectCount,state.current(all).length);
 assert.equal(all.length,['active','unverified','completed','superseded'].reduce((n,g)=>n+state.group(all,g).length,0));
});
test('Home renders known completion separately from checks and escapes source text',()=>{
 const nodes=new Map();
 const get=id=>{
   if(!nodes.has(id))nodes.set(id,{style:{},textContent:'',innerHTML:'',querySelectorAll:()=>[]});
   return nodes.get(id);
 };
 const window={AcademicActions:state};
 const document={getElementById:get};
 vm.runInNewContext(fs.readFileSync(path.join(root,'home-overview.js'),'utf8'),{window,document,Intl,Date});
 const data=JSON.parse(fs.readFileSync(path.join(root,'data','projects.json'),'utf8'));
 const p=data.projects[0];
 p.actions=[{text:'Completed sentinel',status:'completed'},{text:'Superseded sentinel',status:'superseded'},{text:'<script>check</script>',status:'unverified'},{text:'Confirmed open',status:'open'}];
 window.AcademicOverview.render(data,()=>{});
 const html=get('hm-matters').innerHTML;
 assert.ok(!html.includes('Completed sentinel'));
 assert.ok(!html.includes('Superseded sentinel'));
 assert.ok(html.includes('Status to Verify'));
 assert.ok(html.includes('To Do & In Progress'));
 assert.ok(html.includes('&lt;script&gt;check&lt;/script&gt;'));
 assert.ok(!html.includes('<script>check</script>'));
 assert.match(get('hm-action-count').textContent,/completed/);
});
test('project Actions panel separates completed history and uncertainty',async()=>{
 const nodes=new Map();
 let clickActions;
 const get=id=>{
   if(!nodes.has(id))nodes.set(id,{
     style:{},innerHTML:'',textContent:'',value:'',
     addEventListener:()=>{},setAttribute:()=>{},scrollIntoView:()=>{},
     querySelectorAll:selector=>id==='rp-detail'&&selector==='button[data-rp-tab]'?[
       {dataset:{rpTab:'actions'},addEventListener:(_,cb)=>{clickActions=cb;}}
     ]:[]
   });
   return nodes.get(id);
 };
 const document={getElementById:get,querySelector:()=>null};
 const data=JSON.parse(fs.readFileSync(path.join(root,'data','projects.json'),'utf8'));
 const window={AcademicActions:state,location:{hash:'#projects'}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'projects.js'),'utf8'),{
   window,document,Intl,Date,fetch:async()=>({ok:true,json:async()=>data})
 });
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(clickActions);
 clickActions();
 const html=get('rp-detail').innerHTML;
 assert.match(html,/Status to Verify/);
 assert.match(html,/<details class="rp-action-archive"><summary>Completed/);
 assert.match(html,/Complete the figures and tables/);
 assert.ok(!html.includes('The status of individual tasks has not yet been verified.'));
});
test('historical observations are not presented as missed milestone targets',()=>{
 const nodes=new Map();
 const get=id=>{
   if(!nodes.has(id))nodes.set(id,{style:{},textContent:'',innerHTML:'',querySelectorAll:()=>[]});
   return nodes.get(id);
 };
 const window={AcademicActions:state};
 vm.runInNewContext(fs.readFileSync(path.join(root,'home-overview.js'),'utf8'),{window,document:{getElementById:get},Intl,Date});
 const project=milestone=>({id:'example',title:'Example',actions:[],snapshot:{stage:'Data Analyses',milestone,dueDate:null}});
 for(const note of [
   'Future-paper topic decision pending; remains an option as of November 19, 2026.',
   'Initial review completed November 19, 2026; clarification pending.',
   'Data received November 19, 2026; next review date not confirmed.'
 ]){
   window.AcademicOverview.render({projects:[project(note)]},()=>{});
   assert.ok(!get('hm-milestones').innerHTML.includes('Past Targets to Verify'));
   assert.ok(get('hm-milestones').innerHTML.includes('Not scheduled'));
 }
 const meeting=project('Meeting scheduled for December 3, 2026. An earlier time requested on November 26, 2026 is unconfirmed.');
 window.AcademicOverview.render({projects:[meeting]},()=>{});
 assert.ok(get('hm-milestones').innerHTML.includes('3 Dec 2026'));
 assert.ok(!get('hm-milestones').innerHTML.includes('Not scheduled'));
 meeting.snapshot.dueDate='2026-11-19';
 window.AcademicOverview.render({projects:[meeting]},()=>{});
 assert.ok(get('hm-milestones').innerHTML.includes('19 Nov 2026'));
});
