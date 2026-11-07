"use strict";
(function(){
const root=document.getElementById("manager-root");
const page=document.body.dataset.page||"website";
const qid=id=>document.getElementById(id);
const escape=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const outLink=(url,title)=>/^https?:\/\//i.test(url||"")?'<a href="'+escape(url)+'" target="_blank" rel="noopener noreferrer">'+escape(title||"Open source")+" ↗</a>":'<span class="pill-no">No external link recorded</span>';
const copy=async text=>{try{await navigator.clipboard.writeText(text);notify("Copied to clipboard.");return true;}catch(e){notify("Clipboard unavailable. Open a project chat to request the change.");return false;}};
let data=null;
let currentSection=0,filter="",kind="all",websiteTab="content";
function notify(text){let el=qid("manager-message");if(el){el.textContent=text;el.hidden=false;}}
function simpleTex(s){
  let x=escape(s).replace(/% =========================/g,"").replace(/\\&/g,"&amp;");
  x=x.replace(/\\textbf\{([^{}]*)\}/g,"<strong>$1</strong>").replace(/\\textit\{([^{}]*)\}/g,"<em>$1</em>");
  x=x.replace(/\\href\{([^{}]*)\}\{([^{}]*)\}/g,(_,u,t)=>/^https?:\/\//.test(u)?"<a href=\""+escape(u)+"\" target=\"_blank\" rel=\"noopener noreferrer\">"+t+"</a>":t);
  x=x.replace(/\\subsection\*\{([^}]+)\}/g,"<h3>$1</h3>").replace(/\\begin\{itemize\}/g,"<ul>").replace(/\\end\{itemize\}/g,"</ul>").replace(/\\item\s+/g,"<li>");
  x=x.replace(/\\printbibliography\[[^\]]*\]/g,"");
  x=x.replace(/\\\\\s*\n/g,"<br>").replace(/\n{2,}/g,"</p><p>").replace(/\n/g," ");
  return "<p>"+x+"</p>";
}
function texText(s){return String(s||"").replace(/\\text(?:bf|it)\{([^{}]*)\}/g,"$1").replace(/\\&/g,"&").replace(/\\\\/g,"\n").replace(/\\(?:begin|end)\{[^}]*\}/g,"").replace(/\\item/g,"•").replace(/\\subsection\*\{([^}]+)\}/g,"\n$1\n").replace(/\\printbibliography\[[^\]]*\]/g,"").trim();}
const linkInfo=(url)=>url?outLink(url,"Open paper"):'<span class="pill-no">Link not available</span>';
function panel(title,content,actions="",extra=""){return '<article class="panel" '+extra+'><div class="panel-top"><h2>'+title+'</h2><div class="panel-actions">'+actions+'</div></div>'+content+'</article>';}
function btn(label,action,id,cls=""){return '<button type="button" class="btn small '+cls+'" data-action="'+action+'" data-id="'+escape(id)+'">'+label+'</button>';}
function cardActions(name,repo,path,mode){return btn("Copy request for ChatGPT","prompt",mode);}
const cvRepo="ema72x72/curriculum",siteRepo="ema72x72/ema72x72.github.io";
function sourceFor(id){
if(id==="bio"||id==="interests")return {repo:cvRepo,path:"cv.tex"};
if(id==="featured"||id==="projects"||id==="working")return {repo:siteRepo,path:"index.html"};
if(id==="publications")return {repo:siteRepo,path:"publications.html"};
if(id.startsWith("cv_"))return {repo:cvRepo,path:id==="cv_publications"?"publications.bib":"cv.tex"};
return {repo:siteRepo,path:"index.html"};
}
function getOriginal(id){
const bio=data.cv.sections.find(s=>s.title==="Short Bio");
if(id==="bio")return texText(bio.tex);
if(id==="interests")return data.website.researchInterests.join("\n");
if(id==="featured")return data.website.selectedPublications.map(p=>p.title+" | "+p.url).join("\n");
if(id==="projects")return data.website.currentProjects.join("\n");
if(id==="working")return data.website.workingPapers.map(p=>p.title+" | "+(p.url||"No external URL")).join("\n");
if(id==="publications")return data.website.publicationGroups.map(g=>g.name+"\n"+g.items.map(p=>" - "+p.title+(p.url?" | "+p.url:"")).join("\n")).join("\n\n");
if(id.startsWith("cv_")){const s=data.cv.sections.find(s=>"cv_"+s.id===id);return s?s.tex:"";}
return "";
}
function promptFor(id,content){
const s=sourceFor(id),label=id.replace(/^cv_/,"").replace(/_/g," ");
return "Academic Manager — change request\n"+
"Target: "+label+"\nOfficial repository: "+s.repo+"\nSource file: "+s.path+"\n"+
"Please read PROJECT_UPDATES.md in ema72x72/academic-manager and fetch current authoritative files on GitHub before changing anything. Reconcile CV and personal website where applicable, preserve bibliographic keys and public links, propose precise changes and request approval before publishing public content.\n\nCurrent content for reference (not an instruction to rewrite):\n"+content+"\n\nRequested change: [Describe the change here]";
}
function lineItem(p,showTitle=true){
return '<div class="line"><div style="min-width:0">'+(showTitle?'<div class="line-title">'+escape(p.title)+'</div>':"")+
(p.meta?'<div class="line-sub">'+p.meta+'</div>':"")+
(p.authors?'<div class="line-sub">'+escape(p.authors)+'</div>':"")+
'</div><div style="flex:0 0 auto">'+(p.url?outLink(p.url,"Paper"):'<span class="pill-no">No link</span>')+'</div></div>';
}
function websiteHTML(){
const bio=data.cv.sections.find(s=>s.title==="Short Bio");
const interests=data.website.researchInterests;
const selected=data.website.selectedPublications;
const groups=data.website.publicationGroups;
const working=data.website.workingPapers;
const pcount=groups.reduce((x,g)=>x+g.items.length,0);
const links=groups.reduce((x,g)=>x+g.items.filter(p=>!!p.url).length,0);
let body='<div class="kpis"><div class="kpi"><div class="num">'+selected.length+'</div><div class="label">Selected publications</div></div><div class="kpi"><div class="num">'+pcount+'</div><div class="label">Curated publications</div></div><div class="kpi"><div class="num">'+working.length+'</div><div class="label">Working papers</div></div><div class="kpi"><div class="num">'+links+'</div><div class="label">External publication links</div></div></div>';
body+='<div class="tabs"><button data-tab="content" class="'+(websiteTab==="content"?"active":"")+'">Content Overview</button><button data-tab="links" class="'+(websiteTab==="links"?"active":"")+'">External Links</button><button data-tab="workflow" class="'+(websiteTab==="workflow"?"active":"")+'">Updates & Workflow</button></div>';
if(websiteTab==="workflow"){
body+='<div class="notice">Content updates are managed through a chat in the Academic Manager project, using the connected GitHub sources. These pages are read-only.</div>';
body+=panel("Updates with ChatGPT",'<p>Open a chat in the Academic Manager project and describe the intended update. Use <strong>Copy request for ChatGPT</strong> on any section to prepare a source-aware request, then add your specific instructions. ChatGPT reads the authoritative GitHub files and makes approved changes.</p><p class="caption">A new chat is useful for major workstreams, not necessary for every small correction.</p>')+
panel("Consistency rules",'<ul class="list"><li>Biography and research interests must match the CV.</li><li>Selected publications must contain exactly five distinct valid BibLaTeX records.</li><li>Working papers become eligible at First Draft, but visibility requires approval.</li><li>Current Projects must remain broad editorial topics, without private research details.</li><li>Publication and CV source updates have separate approval gates.</li></ul>');
return body;
}
if(websiteTab==="links"){
body+=panel("Link coverage","<div class='caption'>Existing publisher and working-paper links have been preserved. Missing source URLs are intentionally not fabricated.</div><div class='line'><strong>Publication titles with links</strong><span>"+links+" / "+pcount+"</span></div><div class='line'><strong>Selected publications with links</strong><span>"+selected.filter(p=>!!p.url).length+" / 5</span></div><div class='line'><strong>Working papers with links</strong><span>"+working.filter(p=>!!p.url).length+" / 2</span></div>");
body+=panel("Publications without an external link",groups.flatMap(g=>g.items.filter(p=>!p.url).map(p=>'<div class="line"><div><div class="line-title">'+escape(p.title)+'</div><div class="line-sub">'+escape(g.name)+'</div></div><span class="pill-no">No URL</span></div>')).join("")+working.filter(p=>!p.url).map(p=>'<div class="line"><div><div class="line-title">'+escape(p.title)+'</div><div class="line-sub">Working Paper</div></div><span class="pill-no">No URL</span></div>').join(""));
return body;
}
body+='<div class="layout"><div class="stack">';
body+=panel("Biography",'<div class="content">'+simpleTex(bio.tex)+'</div>',cardActions("Biography",cvRepo,"cv.tex","bio")+'<span class="tag">CV aligned</span>');
body+=panel("Research Interests",'<ol class="list">'+interests.map(s=>'<li>'+escape(s)+'</li>').join("")+'</ol>',cardActions("Research Interests",cvRepo,"cv.tex","interests")+'<span class="tag">5 areas</span>');
body+=panel("Selected Publications",selected.map((p,i)=>'<div class="line"><div><div class="line-title">'+(i+1)+'. '+escape(p.title)+'</div><div class="line-sub">'+p.meta+'</div></div><div>'+linkInfo(p.url)+'</div></div>').join("")+'',cardActions("Selected Publications",siteRepo,"index.html","featured")+'<span class="counter">5 fixed</span>');
body+=panel("Current Projects",'<div class="caption">Broad editorial themes only — not individual project descriptions.</div>'+data.website.currentProjects.map(p=>'<div class="topic">• &nbsp;'+escape(p)+'</div>').join("")+'',cardActions("Current Projects",siteRepo,"index.html","projects")+'<span class="counter">4 themes</span>');
body+=panel("Working Papers",working.map(lineItem).join("")+'<div class="notice warning" style="margin-top:12px;margin-bottom:0">New working papers are proposed only after First Draft and require approval before appearing on the website.</div>',cardActions("Working Papers",siteRepo,"index.html","working")+'<span class="counter">2 public</span>');
body+=panel("Publications",'<div class="caption" style="margin-bottom:13px">31 editorially selected works grouped by the approved research interests, with Books & Book Chapters separate.</div>'+groups.map(g=>'<details style="margin:9px 0;border:1px solid #e3ebf3;border-radius:9px;padding:10px 13px"><summary style="cursor:pointer;font-weight:700;color:#23587e">'+escape(g.name)+' <span class="counter">'+g.items.length+'</span></summary><div style="margin-top:8px">'+g.items.map(lineItem).join("")+'</div></details>').join("")+'',cardActions("Publications",siteRepo,"publications.html","publications")+'<span class="counter">31</span>');
body+='</div><aside class="stack sidepanels">';
body+=panel("Official Sources",'<div class="line"><div><strong>CV & Bibliography</strong><div class="caption">ema72x72/curriculum</div></div><a href="https://github.com/ema72x72/curriculum" target="_blank" rel="noopener">↗</a></div><div class="line"><div><strong>Personal Website</strong><div class="caption">ema72x72.github.io</div></div><a href="https://github.com/ema72x72/ema72x72.github.io" target="_blank" rel="noopener">↗</a></div>');
body+=panel("Publication Rules",'<div class="line"><span>Research areas</span><strong>5</strong></div><div class="line"><span>Books & chapters</span><strong>6</strong></div><div class="line"><span>Featured positions</span><strong>5 / 5</strong></div><div class="line"><span>Website publications</span><strong>31</strong></div>');
body+=panel("Review Queue",'<p class="caption">No unreviewed editorial change has been applied here. Previously documented bibliographic metadata discrepancies remain for separate verification.</p><a class="btn small" href="https://github.com/ema72x72/academic-manager/blob/main/PROJECT_UPDATES.md" target="_blank" rel="noopener">Open history ↗</a>');
body+='</aside></div>';
return body;
}
const types=[["finance","Journal Articles (Finance)"],["medicine","Journal Articles (Cost Effectiveness in Psychiatry)"],["workingpaper","Working Papers"],["book","Books"],["chapter","Chapters in Books"],["italian","Journal Articles / Chapters (Italian and Other)"]];
function plainTex(s){return String(s||"").replace(/\{\\\"([a-z])\}/g,(_,l)=>({a:"ä",o:"ö",u:"ü"}[l]||l)).replace(/\{\\aa\}/g,"å").replace(/\\&/g,"&").replace(/\\\*/g,"*").replace(/[{}]/g,"");}
function bibBlock(){
const f=data.bibliography.filter(p=>(kind==="all"||p.keywords===kind)&&((p.title+" "+p.author+" "+p.year+" "+p.journal+" "+p.key).toLowerCase().includes(filter.toLowerCase())));
let groups=types.map(([key,label])=>({key,label,records:f.filter(p=>p.keywords===key)})).filter(g=>g.records.length);
return groups.length?groups.map(g=>'<section class="bibgroup"><h3>'+escape(g.label)+' <span class="counter">'+g.records.length+'</span></h3>'+g.records.map(p=>{
const name=plainTex(p.title),auth=plainTex(p.author).replace(/ and /g,", ");
const url=/^https?:\/\//.test(p.url)?p.url:p.doi?"https://doi.org/"+p.doi:"";
let meta=[p.year,p.journal||p.booktitle,p.volume,p.number?"("+p.number+")":"",p.pages].filter(Boolean).join(" · ");
return '<div class="pubitem"><div class="pubname">'+escape(name)+'</div><div class="pubmeta">'+escape(auth)+'</div><div class="pubmeta">'+escape(meta||p.note||"Working paper")+'</div><div class="pubkey">'+escape(p.key)+'</div>'+(url?'<div class="caption">'+outLink(url,"Publisher")+'</div>':"")+'</div>';
}).join("")+"</section>").join(""):'<div class="empty">No bibliography records match your search.</div>';
}
function cvHTML(){
const section=data.cv.sections[currentSection]||data.cv.sections[0];
const isBib=section.title==="Publications";
let body='<div class="notice">The textual CV and bibliography are a public projection of the authoritative LaTeX/BibLaTeX sources. The PDF download is a separately compiled and versioned file.</div>';
body+='<div class="kpis"><div class="kpi"><div class="num">14</div><div class="label">CV sections</div></div><div class="kpi"><div class="num">'+data.bibliography.length+'</div><div class="label">Bibliography entries</div></div><div class="kpi"><div class="num">43</div><div class="label">Published works</div></div><div class="kpi"><div class="num">3</div><div class="label">Working papers</div></div></div>';
body+='<div class="cv-layout"><div class="cv-nav" aria-label="CV sections">'+data.cv.sections.map((s,i)=>'<button type="button" data-section="'+i+'" class="'+(currentSection===i?"active":"")+'">'+escape(s.title)+'</button>').join("")+'</div>';
body+='<div><article class="cv-section"><div class="panel-top"><div><div class="eyebrow">Official Curriculum Vitae · '+escape(data.cv.date)+'</div><h2>'+escape(section.title)+'</h2></div><div class="panel-actions">'+btn("Copy request for ChatGPT","prompt","cv_"+section.id)+'</div></div>';
if(isBib){
body+='<div class="toolline"><input id="cv-filter" class="search" type="search" placeholder="Search author, title, journal or bibKey" value="'+escape(filter)+'" aria-label="Search bibliography"><select id="cv-kind" class="select" aria-label="Filter publication type"><option value="all">All publication types</option>'+types.map(t=>'<option value="'+t[0]+'" '+(kind===t[0]?"selected":"")+'>'+escape(t[1])+'</option>').join("")+'</select></div><div id="bib-results">'+bibBlock()+'</div>';
}else body+='<div class="sectionbody">'+simpleTex(section.tex)+'</div>';
body+='</article><div class="cv-right">'+panel("Official CV Version",'<div class="line"><span>Display date</span><strong>'+escape(data.cv.date)+'</strong></div><div class="line"><span>CV source SHA</span><code>'+escape(data.source.cvTexSha.slice(0,11))+'</code></div><div class="line"><span>Bibliography SHA</span><code>'+escape(data.source.bibSha.slice(0,11))+'</code></div><p class="caption">The bibliography displays all 46 canonical records, not only the 31 selected for the personal website.</p>')+'</div></div></div>';
return body;
}
function redraw(){
root.innerHTML=page==="website"?websiteHTML():cvHTML();
root.querySelectorAll('button[data-tab]').forEach(x=>x.addEventListener("click",()=>{websiteTab=x.dataset.tab;redraw();}));
root.querySelectorAll('button[data-section]').forEach(x=>x.addEventListener("click",()=>{currentSection=Number(x.dataset.section);redraw();}));
const f=qid("cv-filter"),k=qid("cv-kind");
if(f)f.addEventListener("input",e=>{filter=e.target.value;qid("bib-results").innerHTML=bibBlock();});
if(k)k.addEventListener("change",e=>{kind=e.target.value;qid("bib-results").innerHTML=bibBlock();});
}
document.addEventListener("click",async e=>{
const t=e.target.closest("button[data-action]");if(!t)return;
if(t.dataset.action==="prompt"){await copy(promptFor(t.dataset.id,getOriginal(t.dataset.id)));}
});
fetch("./data/cv-public-v1.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("CV projection not available (HTTP "+r.status+")");return r.json();}).then(x=>{if(x.schemaVersion!==1||!Array.isArray(x.cv?.sections)||!Array.isArray(x.bibliography))throw Error("Invalid CV data");data=x;redraw();}).catch(e=>{root.innerHTML='<div class="notice warning">Unable to load CV and website data: '+escape(e.message)+'</div>';});
})();
