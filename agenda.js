'use strict';
function setupLotusAgenda({opener,panel,prefix,storageKey,scope,categories,calendarLabel,fileStem}){
const ag=id=>document.getElementById(id==='openFamily'?opener:id==='familyPanel'?panel:id.replace(/^ag/,prefix));
const AG_KEY=storageKey;
const AG_CATEGORIES=categories;
const AG_REMINDERS=['','10','30','60','1440'];
let agEvents=[],agEditing=null,agDeleted=null,agSelection='',agShowAll=false,agLoadWarning='';
function agLocalDate(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
function agLocalTime(date){return String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0');}
function agValidDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value&&value>='1900-01-01'&&value<='2100-12-31';}
function agLocalInstant(date,time){
 if(!agValidDate(date)||!/^\d{2}:\d{2}$/.test(time))throw Error('Vérifiez les dates et les heures.');
 const value=new Date(date+'T'+time+':00');
 if(!Number.isFinite(value.getTime())||agLocalDate(value)!==date||agLocalTime(value)!==time)throw Error('Cette heure locale est invalide, notamment lors d’un changement d’heure. Choisissez une autre heure.');
 return value.toISOString();
}
function agValidate(event){
 if(!event||typeof event!=='object'||typeof event.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(event.id)||typeof event.title!=='string'||!event.title.trim()||event.title.length>160||!AG_CATEGORIES.includes(event.category)||!AG_REMINDERS.includes(event.reminder)||typeof event.allDay!=='boolean')return false;
 if(!['people','location','notes','zone'].every(key=>typeof event[key]==='string'))return false;
 if(event.people.length>200||event.location.length>300||event.notes.length>4000||event.zone.length>100)return false;
 if(event.allDay)return agValidDate(event.start)&&agValidDate(event.end)&&event.end>=event.start;
 return typeof event.start==='string'&&typeof event.end==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(event.start)&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(event.end)&&Number.isFinite(Date.parse(event.start))&&Number.isFinite(Date.parse(event.end))&&new Date(event.start).toISOString()===event.start&&new Date(event.end).toISOString()===event.end&&event.end>event.start&&event.start.slice(0,4)>='1900'&&event.end.slice(0,4)<='2100';
}
function agBackupScope(data){return !!data&&data.version===1&&(data.scope===scope||(scope==='family'&&!('scope' in data)));}
try{const saved=JSON.parse(localStorage.getItem(AG_KEY)||'null');if(saved){if(!agBackupScope(saved)||!Array.isArray(saved.events)||saved.events.length>1000||!saved.events.every(agValidate))throw Error();agEvents=saved.events;}}catch{agLoadWarning='La sauvegarde locale est illisible ou inaccessible. Elle n’a pas été écrasée ; exportez toute liste affichée avant d’enregistrer un nouvel événement.';}
function agPersist(){
 try{localStorage.setItem(AG_KEY,JSON.stringify({version:1,scope,events:agEvents}));return true;}catch{return false;}
}
function agChanged(message){const saved=agPersist();ag('agStatus').textContent=message+(saved?' Enregistré sur cet appareil.':' Attention : sauvegarde indisponible. Les données restent seulement dans cette page ; exportez-les avant de fermer.');agRender();}
function agBounds(event){
 if(event.allDay)return {start:event.start,end:event.end};
 const start=new Date(event.start),end=new Date(Date.parse(event.end)-1);return {start:agLocalDate(start),end:agLocalDate(end)};
}
function agFormatDate(value){return value.split('-').reverse().join('/');}
function agReadable(event){
 if(event.allDay)return agFormatDate(event.start)+(event.end!==event.start?' au '+agFormatDate(event.end):'')+' — Toute la journée';
 const options={dateStyle:'short',timeStyle:'short'};return new Date(event.start).toLocaleString('fr-BE',options)+' → '+new Date(event.end).toLocaleString('fr-BE',options);
}
function agMatches(event){const query=ag('agSearch').value.trim().toLocaleLowerCase('fr');return (!ag('agFilter').value||ag('agFilter').value===event.category)&&(!query||[event.title,event.people,event.location,event.notes].join(' ').toLocaleLowerCase('fr').includes(query));}
function agSaveForm(event){
 event.preventDefault();ag('agStatus').textContent='';
 try{
 const title=ag('agTitle').value.trim();if(!title)throw Error('Indiquez le titre de l’événement.');
 const allDay=ag('agAllDay').checked,startDate=ag('agStartDate').value,endDate=ag('agEndDate').value||startDate;
 if(!agValidDate(startDate)||!agValidDate(endDate)||endDate<startDate)throw Error('Vérifiez les dates : la fin ne peut pas précéder le début (années 1900 à 2100).');
 const start=allDay?startDate:agLocalInstant(startDate,ag('agStartTime').value),end=allDay?endDate:agLocalInstant(endDate,ag('agEndTime').value);
 if(!allDay&&end<=start)throw Error('L’heure de fin doit être postérieure au début. Pour un événement de nuit, précisez la date de fin.');
 if(!agEditing&&agEvents.length>=1000)throw Error('L’agenda est limité à 1 000 événements. Exportez une sauvegarde avant de retirer les anciens événements.');
 const item={id:agEditing||crypto.randomUUID(),title,allDay,start,end,category:ag('agCategory').value,people:ag('agPeople').value.trim(),location:ag('agLocation').value.trim(),notes:ag('agNotes').value.trim(),reminder:ag('agReminder').value,zone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Local'};
 if(!agValidate(item))throw Error('Vérifiez les informations saisies.');
 const index=agEvents.findIndex(x=>x.id===item.id);if(index<0)agEvents.push(item);else agEvents[index]=item;
 ag('agMonth').value=startDate.slice(0,7);agSelection='';agShowAll=false;agEditing=null;ag('agForm').hidden=true;
 agChanged(index<0?'Événement ajouté.':'Événement modifié.');ag('agNew').focus();
 }catch(error){ag('agStatus').textContent=error.message;}
}
function agTimeMode(){ag('agTimeFields').hidden=ag('agAllDay').checked;ag('agStartTime').disabled=ag('agAllDay').checked;ag('agEndTime').disabled=ag('agAllDay').checked;}
function agOpenForm(item=null){
 agEditing=item?.id||null;ag('agFormTitle').textContent=item?'Modifier l’événement':'Nouvel événement';
 const start=item?(item.allDay?item.start:agLocalDate(new Date(item.start))):(agSelection||agLocalDate());
 const end=item?(item.allDay?item.end:agLocalDate(new Date(item.end))):start;
 ag('agTitle').value=item?.title||'';ag('agCategory').value=item?.category||categories[0];ag('agPeople').value=item?.people||'';ag('agAllDay').checked=item?.allDay||false;
 ag('agStartDate').value=start;ag('agEndDate').value=end;ag('agStartTime').value=item&&!item.allDay?agLocalTime(new Date(item.start)):'09:00';ag('agEndTime').value=item&&!item.allDay?agLocalTime(new Date(item.end)):'10:00';
 ag('agLocation').value=item?.location||'';ag('agNotes').value=item?.notes||'';ag('agReminder').value=item?.reminder||'';
 ag('agZone').textContent='Heures dans le fuseau de cet appareil : '+(Intl.DateTimeFormat().resolvedOptions().timeZone||'local')+'.';
 agTimeMode();ag('agForm').hidden=false;ag('agTitle').focus();ag('agStatus').textContent='';
}
function agRender(){
 const month=ag('agMonth').value;if(!/^\d{4}-\d{2}$/.test(month))return;
 const [year,mon]=month.split('-').map(Number),first=new Date(year,mon-1,1,12),last=new Date(year,mon,0,12),end=agLocalDate(last),start=month+'-01';
 const matches=agEvents.filter(agMatches),grid=ag('agMonthGrid');grid.replaceChildren();
 ag('agMonthTitle').textContent=first.toLocaleDateString('fr-BE',{month:'long',year:'numeric'});
 for(const weekday of ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']){const div=document.createElement('div');div.className='agenda-weekday';div.textContent=weekday;grid.append(div);}
 for(let i=0;i<(first.getDay()+6)%7;i++){const blank=document.createElement('div');blank.setAttribute('aria-hidden','true');grid.append(blank);}
 for(let day=1;day<=last.getDate();day++){
 const date=month+'-'+String(day).padStart(2,'0'),count=matches.filter(event=>{const b=agBounds(event);return b.start<=date&&b.end>=date;}).length;
 const button=document.createElement('button');button.type='button';button.dataset.date=date;button.className='agenda-day'+(date===agLocalDate()?' agenda-today':'');button.textContent=String(day);button.setAttribute('aria-pressed',String(agSelection===date));button.setAttribute('aria-label',agFormatDate(date)+' : '+count+' événement(s)');
 if(date===agLocalDate())button.setAttribute('aria-current','date');
 if(count){const badge=document.createElement('span');badge.textContent=count+' év.';button.append(badge);}
 button.addEventListener('click',()=>{agSelection=date;agShowAll=false;agRender();ag('agMonthGrid').querySelector('[data-date="'+date+'"]').focus();});grid.append(button);
 }
 const selected=matches.filter(event=>{if(agShowAll)return true;const b=agBounds(event);return agSelection?b.start<=agSelection&&b.end>=agSelection:b.start<=end&&b.end>=start;}).sort((a,b)=>a.start.localeCompare(b.start)||a.title.localeCompare(b.title,'fr'));
 ag('agListTitle').textContent=agShowAll?'Tous les événements':agSelection?'Événements du '+agFormatDate(agSelection):'Événements du mois';
 ag('agCount').textContent=selected.length+' événement(s) affiché(s).';ag('agList').replaceChildren();
 if(!selected.length){const p=document.createElement('p');p.textContent='Aucun événement pour cette sélection. Ajoutez-en un ou changez les filtres.';ag('agList').append(p);}
 for(const event of selected){
 const article=document.createElement('article'),title=document.createElement('h4');title.textContent=event.title;
 const info=document.createElement('p');info.textContent=agReadable(event)+'\n'+event.category+(event.people?' — '+event.people:'');
 article.append(title,info);
 for(const [label,value] of [['Lieu',event.location],['Notes',event.notes],['Rappel à exporter',event.reminder?event.reminder+' minutes avant':'']])if(value){const p=document.createElement('p');p.textContent=label+' : '+value;article.append(p);}
 const controls=document.createElement('div');controls.className='agenda-toolbar';
 for(const [label,action] of [['Modifier',()=>agOpenForm(event)],['Retirer',()=>{agDeleted=event;agEvents=agEvents.filter(x=>x.id!==event.id);if(agEditing===event.id){agEditing=null;ag('agForm').hidden=true;}ag('agUndo').hidden=false;agChanged('Événement retiré. Vous pouvez annuler cette suppression pendant cette visite.');ag('agUndo').focus();}]]){
 const b=document.createElement('button');b.type='button';b.className='action';b.textContent=label;b.setAttribute('aria-label',label+' : '+event.title);b.addEventListener('click',action);controls.append(b);
 }
 article.append(controls);ag('agList').append(article);
 }
}
function agEscapeICS(text){return String(text).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
function agFold(line){let out='',part='';for(const char of line){if(new TextEncoder().encode(part+char).length>75){out+=part+'\r\n';part=' '+char;}else part+=char;}return out+part;}
function agNextDate(value){const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
function agICS(events,now=new Date()){
 const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LOTUS IA//Agenda '+calendarLabel+'//FR','CALSCALE:GREGORIAN'];
 for(const event of events){
 lines.push('BEGIN:VEVENT','UID:'+event.id+(scope==='family'?'@lotus-agenda':'@lotus-friends-agenda'),'DTSTAMP:'+stamp);
 if(event.allDay)lines.push('DTSTART;VALUE=DATE:'+event.start.replace(/-/g,''),'DTEND;VALUE=DATE:'+agNextDate(event.end).replace(/-/g,''));
 else lines.push('DTSTART:'+event.start.replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),'DTEND:'+event.end.replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'));
 lines.push('SUMMARY:'+agEscapeICS(event.title),'DESCRIPTION:'+agEscapeICS([event.category,event.people?'Personnes : '+event.people:'',event.notes].filter(Boolean).join('\n')));
 if(event.location)lines.push('LOCATION:'+agEscapeICS(event.location));
 if(event.reminder)lines.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+agEscapeICS(event.title),'TRIGGER:-PT'+event.reminder+'M','END:VALARM');
 lines.push('END:VEVENT');
 }
 lines.push('END:VCALENDAR');return lines.map(agFold).join('\r\n')+'\r\n';
}
function agDownload(content,type,name){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
ag('openFamily').addEventListener('click',()=>{showModule(panel);ag('familyPanel').focus({preventScroll:true});});
ag('agMonth').value=agLocalDate().slice(0,7);ag('agMonth').min='1900-01';ag('agMonth').max='2100-12';
ag('agNew').addEventListener('click',()=>agOpenForm());ag('agForm').addEventListener('submit',agSaveForm);ag('agAllDay').addEventListener('change',agTimeMode);
ag('agCancel').addEventListener('click',()=>{ag('agForm').hidden=true;agEditing=null;ag('agNew').focus();});
for(const id of ['agSearch','agFilter'])ag(id).addEventListener('input',agRender);
ag('agMonth').addEventListener('change',()=>{agSelection='';agShowAll=false;agRender();});
function agMoveMonth(delta){const [year,mon]=ag('agMonth').value.split('-').map(Number),d=new Date(year,mon-1+delta,1,12);if(d.getFullYear()<1900||d.getFullYear()>2100)return;ag('agMonth').value=agLocalDate(d).slice(0,7);agSelection='';agShowAll=false;agRender();}
ag('agPrevious').addEventListener('click',()=>agMoveMonth(-1));ag('agNext').addEventListener('click',()=>agMoveMonth(1));
ag('agToday').addEventListener('click',()=>{ag('agMonth').value=agLocalDate().slice(0,7);agSelection='';agShowAll=false;agRender();});
ag('agWholeMonth').addEventListener('click',()=>{agSelection='';agShowAll=false;agRender();});
ag('agAllEvents').addEventListener('click',()=>{agSelection='';agShowAll=true;agRender();});
ag('agUndo').addEventListener('click',()=>{if(agDeleted){if(agEvents.length>=1000){ag('agStatus').textContent='Retirez un événement avant d’annuler cette suppression : limite de 1 000 événements.';return;}agEvents.push(agDeleted);agDeleted=null;ag('agUndo').hidden=true;agChanged('Suppression annulée.');ag('agNew').focus();}});
ag('agICS').addEventListener('click',()=>{if(!agEvents.length){ag('agStatus').textContent='Ajoutez un événement avant d’exporter.';return;}agDownload(agICS(agEvents),'text/calendar;charset=utf-8',fileStem+'.ics');ag('agStatus').textContent='Export de tous les événements demandé. Importez le fichier dans votre calendrier et vérifiez les dates, les heures et les rappels.';});
ag('agBackup').addEventListener('click',()=>{agDownload(JSON.stringify({version:1,scope,events:agEvents},null,2),'application/json',fileStem+'-sauvegarde.json');ag('agStatus').textContent='Sauvegarde de tous les événements demandée. Ce fichier contient vos informations personnelles.';});
ag('agImport').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
 if(file.size>5000000)throw Error('Fichier trop volumineux : maximum 5 Mo.');
 const data=JSON.parse(await file.text());
 if(!agBackupScope(data)||!Array.isArray(data.events)||data.events.length>1000||!data.events.every(agValidate)||new Set(data.events.map(x=>x.id)).size!==data.events.length)throw Error('Ce fichier n’est pas une sauvegarde valide pour cet agenda ('+calendarLabel+'). Aucun événement n’a été importé.');
 const ids=new Set(agEvents.map(x=>x.id)),added=data.events.filter(x=>!ids.has(x.id));if(added.length+agEvents.length>1000)throw Error('L’import dépasserait la limite de 1 000 événements.');
 agEvents.push(...added);agChanged(added.length+' événement(s) importé(s). Les événements déjà présents ont été conservés.'); 
 }catch(error){ag('agStatus').textContent=error instanceof SyntaxError?'Fichier JSON illisible. Aucun événement n’a été importé.':error.message;}
 finally{event.target.value='';}
});
ag('agStatus').textContent=agLoadWarning;agRender();

}
setupLotusAgenda({opener:'openFamily',panel:'familyPanel',prefix:'ag',storageKey:'lotus_family_agenda_v1',scope:'family',categories:['Famille','École','Travail','Santé','Loisirs','Administratif','Tâche','Autre'],calendarLabel:'Famille',fileStem:'LOTUS-Agenda-Famille'});
setupLotusAgenda({opener:'openFriends',panel:'friendsPanel',prefix:'frAg',storageKey:'lotus_friends_agenda_v1',scope:'friends',categories:['Amis','Sortie','Anniversaire','Repas','Voyage','Appel ou rencontre','Projet','Autre'],calendarLabel:'Amis',fileStem:'LOTUS-Agenda-Amis'});
