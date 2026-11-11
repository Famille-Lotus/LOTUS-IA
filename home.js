'use strict';
const hm=id=>document.getElementById(id),HM_KEY='lotus_home_projects_v1';
const hmStates={todo:'À faire',doing:'En cours',done:'Terminée'},hmPriorities={normal:'Normale',high:'Prioritaire',low:'À mon rythme'};
let hmTasks=[],hmEditing=null,hmDeleted=null;
function hmDateValid(value){if(value==='')return true;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value&&value>='1900-01-01'&&value<='2100-12-31';}
function hmValid(task){return task&&typeof task==='object'&&typeof task.id==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(task.id)&&typeof task.text==='string'&&task.text.trim()&&task.text.length<=200&&['project','room','person'].every(k=>typeof task[k]==='string'&&task[k].length<=100)&&typeof task.notes==='string'&&task.notes.length<=3000&&typeof task.date==='string'&&hmDateValid(task.date)&&Object.hasOwn(hmStates,task.state)&&Object.hasOwn(hmPriorities,task.priority);}
function hmValidBackup(data){return data&&data.version===1&&data.scope==='home'&&Array.isArray(data.tasks)&&data.tasks.length<=1000&&data.tasks.every(hmValid)&&new Set(data.tasks.map(x=>x.id)).size===data.tasks.length;}
try{const saved=JSON.parse(localStorage.getItem(HM_KEY)||'null');if(saved){if(!hmValidBackup(saved))throw Error();hmTasks=saved.tasks;}}catch{hm('hmStatus').textContent='La sauvegarde est illisible ou inaccessible. Elle n’a pas été remplacée ; une nouvelle saisie enregistrera une nouvelle liste.';}
function hmPersist(message){let saved=false;try{localStorage.setItem(HM_KEY,JSON.stringify({version:1,scope:'home',tasks:hmTasks}));saved=true;}catch{}hm('hmStatus').textContent=message+(saved?' Enregistré sur cet appareil.':' Sauvegarde indisponible : exportez votre liste avant de fermer cette page.');hmRender();}
function hmProjectSummary(tasks){
 const names=[...new Set(tasks.filter(x=>x.project).map(x=>x.project))].sort((a,b)=>a.localeCompare(b,'fr'));
 return names.map(name=>{const group=tasks.filter(x=>x.project===name);return {name,total:group.length,done:group.filter(x=>x.state==='done').length};});
}
function hmOpen(task=null,idea=null,project=''){
 hmEditing=task?.id||null;hm('hmFormTitle').textContent=task?'Modifier la tâche':'Nouvelle tâche';
 hm('hmTask').value=task?.text||idea||'';hm('hmProject').value=task?.project||project;hm('hmRoom').value=task?.room||'';hm('hmPerson').value=task?.person||'';hm('hmPriority').value=task?.priority||'normal';hm('hmDate').value=task?.date||'';hm('hmState').value=task?.state||'todo';hm('hmNotes').value=task?.notes||'';
 hm('hmForm').hidden=false;hm('hmTask').focus();hm('hmStatus').textContent='';
}
function hmRender(){
 const projects=hmProjectSummary(hmTasks),filter=hm('hmProjectFilter').value;
 hm('hmProjectFilter').replaceChildren();const all=document.createElement('option');all.value='';all.textContent='Tous les projets';hm('hmProjectFilter').append(all);
 const none=document.createElement('option');none.value='__none__';none.textContent='Sans projet';hm('hmProjectFilter').append(none);
 hm('hmProjectNames').replaceChildren();hm('hmProjects').replaceChildren();
 for(const project of projects){
 const option=document.createElement('option');option.value='project:'+project.name;option.textContent=project.name;hm('hmProjectFilter').append(option);
 const hint=document.createElement('option');hint.value=project.name;hm('hmProjectNames').append(hint);
 const button=document.createElement('button');button.type='button';button.className='tile';const title=document.createElement('strong');title.textContent=project.name;
 const summary=document.createElement('span');summary.textContent=project.done+' / '+project.total+' tâche(s) terminée(s)';button.append(title,summary);button.addEventListener('click',()=>{hm('hmProjectFilter').value='project:'+project.name;hmRender();hm('hmProjectFilter').focus();});hm('hmProjects').append(button);
 }
 if(!projects.length){const p=document.createElement('p');p.textContent='Aucun projet pour le moment. Vous pouvez ajouter des tâches avec ou sans projet.';hm('hmProjects').append(p);}
 hm('hmProjectFilter').value=filter==='__none__'||projects.some(x=>'project:'+x.name===filter)?filter:'';
 hm('hmProgress').textContent=hmTasks.filter(x=>x.state==='done').length+' / '+hmTasks.length+' tâche(s) terminée(s) — '+projects.length+' projet(s).';
 const projectFilter=hm('hmProjectFilter').value,state=hm('hmStateFilter').value,search=hm('hmSearch').value.trim().toLocaleLowerCase('fr'),priorityOrder={high:0,normal:1,low:2};
 const tasks=hmTasks.filter(x=>(!projectFilter||(projectFilter==='__none__'?!x.project:'project:'+x.project===projectFilter))&&(!state||x.state===state)&&(!search||[x.text,x.project,x.room,x.person,x.notes].join(' ').toLocaleLowerCase('fr').includes(search))).sort((a,b)=>(a.state==='done')-(b.state==='done')||(a.date||'9999').localeCompare(b.date||'9999')||priorityOrder[a.priority]-priorityOrder[b.priority]||a.text.localeCompare(b.text,'fr'));
 hm('hmCount').textContent=tasks.length+' tâche(s) affichée(s).';hm('hmList').replaceChildren();
 if(!tasks.length){const p=document.createElement('p');p.textContent='Aucune tâche pour cette sélection. Ajoutez-en une ou modifiez les filtres.';hm('hmList').append(p);}
 for(const task of tasks){
 const article=document.createElement('article'),title=document.createElement('h4');title.textContent=task.text;article.append(title);
 const info=document.createElement('p');info.textContent=[hmStates[task.state],'Priorité : '+hmPriorities[task.priority],task.project?'Projet : '+task.project:'Sans projet',task.room?'Espace : '+task.room:'',task.person?'Responsable : '+task.person:'',task.date?'Date prévue : '+task.date.split('-').reverse().join('/'):'Sans date prévue',task.notes].filter(Boolean).join('\n');article.append(info);
 const actions=document.createElement('div');actions.className='agenda-toolbar';
 const labels=[['Modifier',()=>hmOpen(task)],[task.state==='done'?'Rouvrir':'Marquer terminée',()=>{task.state=task.state==='done'?'todo':'done';hmPersist('Avancement mis à jour.');hm('hmNew').focus();}],['Retirer',()=>{hmDeleted=task;hmTasks=hmTasks.filter(x=>x.id!==task.id);if(hmEditing===task.id){hmEditing=null;hm('hmForm').hidden=true;}hm('hmUndo').hidden=false;hmPersist('Tâche retirée. La suppression peut être annulée pendant cette visite.');hm('hmUndo').focus();}]];
 for(const [label,action] of labels){const button=document.createElement('button');button.type='button';button.className='action';button.textContent=label;button.setAttribute('aria-label',label+' : '+task.text);button.addEventListener('click',action);actions.append(button);}article.append(actions);hm('hmList').append(article);
 }
}
function hmText(){return 'LOTUS — Maison, projets et tâches\n\n'+hmTasks.map(task=>[task.text,hmStates[task.state]+' — '+hmPriorities[task.priority],task.project?'Projet : '+task.project:'Sans projet',task.room,task.person,task.date?task.date.split('-').reverse().join('/'):'',task.notes].filter(Boolean).join('\n')).join('\n\n');}
function hmDownload(text,type,name){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
hm('openHome').addEventListener('click',()=>{showModule('homePanel');hm('homePanel').focus({preventScroll:true});});
hm('hmNew').addEventListener('click',()=>hmOpen());hm('hmCancel').addEventListener('click',()=>{hmEditing=null;hm('hmForm').hidden=true;hm('hmNew').focus();});
hm('hmForm').addEventListener('submit',event=>{
 event.preventDefault();const text=hm('hmTask').value.trim();
 if(!text){hm('hmStatus').textContent='Indiquez la tâche à réaliser.';return;}
 if(!hmEditing&&hmTasks.length>=1000){hm('hmStatus').textContent='Limite de 1 000 tâches atteinte. Sauvegardez vos projets avant de retirer les anciennes tâches.';return;}
 const task={id:hmEditing||crypto.randomUUID(),text,project:hm('hmProject').value.trim(),room:hm('hmRoom').value.trim(),person:hm('hmPerson').value.trim(),priority:hm('hmPriority').value,state:hm('hmState').value,date:hm('hmDate').value,notes:hm('hmNotes').value.trim()};
 if(!hmValid(task)){hm('hmStatus').textContent='Vérifiez les champs et la date (années 1900 à 2100).';return;}
 const index=hmTasks.findIndex(x=>x.id===task.id);if(index<0)hmTasks.push(task);else hmTasks[index]=task;
 hmEditing=null;hm('hmForm').hidden=true;hm('hmProjectFilter').value='';hm('hmStateFilter').value='';hm('hmSearch').value='';hmPersist(index<0?'Tâche ajoutée.':'Tâche modifiée.');hm('hmNew').focus();
});
for(const id of ['hmSearch','hmProjectFilter','hmStateFilter'])hm(id).addEventListener('input',hmRender);
document.querySelectorAll('[data-home-idea]').forEach(button=>button.addEventListener('click',()=>hmOpen(null,button.dataset.homeIdea,button.dataset.homeProject)));
hm('hmUndo').addEventListener('click',()=>{if(!hmDeleted)return;if(hmTasks.length>=1000){hm('hmStatus').textContent='Retirez une tâche avant d’annuler cette suppression.';return;}hmTasks.push(hmDeleted);hmDeleted=null;hm('hmUndo').hidden=true;hmPersist('Suppression annulée.');hm('hmNew').focus();});
hm('hmExport').addEventListener('click',()=>{hmDownload(hmText(),'text/plain;charset=utf-8','LOTUS-Maison.txt');hm('hmStatus').textContent='Téléchargement de toutes vos tâches demandé.';});
hm('hmBackup').addEventListener('click',()=>{hmDownload(JSON.stringify({version:1,scope:'home',tasks:hmTasks},null,2),'application/json','LOTUS-Maison-sauvegarde.json');hm('hmStatus').textContent='Sauvegarde de tous les projets et tâches demandée.';});
hm('hmImport').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
 if(file.size>5000000)throw Error('Fichier trop volumineux : maximum 5 Mo.');
 const data=JSON.parse(await file.text());if(!hmValidBackup(data))throw Error('Ce fichier n’est pas une sauvegarde Maison valide. Aucun changement effectué.');
 const ids=new Set(hmTasks.map(x=>x.id)),added=data.tasks.filter(x=>!ids.has(x.id));if(hmTasks.length+added.length>1000)throw Error('L’import dépasserait la limite de 1 000 tâches.');
 hmTasks.push(...added);hmPersist(added.length+' tâche(s) importée(s). Les tâches déjà présentes ont été conservées.');
 }catch(error){hm('hmStatus').textContent=error instanceof SyntaxError?'Sauvegarde JSON illisible. Aucun changement effectué.':error.message;}finally{event.target.value='';}
});
hmRender();
