'use strict';
const mu=id=>document.getElementById(id),MU_KEY='lotus_music_playlists_v1';
const muSeeds=[
 {id:'piano',name:'🎹 Piano & douceur',description:'Une sélection instrumentale à retrouver sur votre plateforme.',tracks:[{title:'River Flows In You',artist:'Yiruma'},{title:'Nuvole bianche',artist:'Rogerio Tutti'},{title:'Watermark',artist:'Rogerio Tutti'}]},
 {id:'aznavour',name:'💛 Souvenirs — Charles Aznavour',description:'Trois chansons de Charles Aznavour pour commencer.',tracks:[{title:'La bohème',artist:'Charles Aznavour'},{title:'Emmenez-moi',artist:'Charles Aznavour'},{title:'Hier encore',artist:'Charles Aznavour'}]},
 {id:'energie',name:'☀️ Sourires & énergie',description:'Des titres à découvrir ou à retrouver, selon vos goûts.',tracks:[{title:'Lovely Day',artist:'Bill Withers'},{title:'Happy',artist:'Pharrell Williams'},{title:'September',artist:'Earth, Wind & Fire'}]}
];
let muLists=structuredClone(muSeeds),muSelected='piano';
function muValid(lists){
 return Array.isArray(lists)&&lists.length>0&&lists.length<=30&&new Set(lists.map(x=>x?.id)).size===lists.length&&lists.every(x=>x&&typeof x.id==='string'&&x.id.length<=100&&typeof x.name==='string'&&x.name.trim()&&x.name.length<=100&&typeof x.description==='string'&&x.description.length<=500&&Array.isArray(x.tracks)&&x.tracks.length<=100&&x.tracks.every(t=>t&&typeof t.title==='string'&&t.title.trim()&&t.title.length<=200&&typeof t.artist==='string'&&t.artist.length<=200));
}
try{const saved=JSON.parse(localStorage.getItem(MU_KEY)||'null');if(saved&&muValid(saved))muLists=saved;}catch{mu('musicPlaylistStatus').textContent='Sauvegarde inaccessible. Les sélections de départ sont affichées.';}
muSelected=muLists[0].id;
function muCurrent(){return muLists.find(x=>x.id===muSelected);}
function muSearchURL(provider,title,artist){
 const query=[title,artist].filter(Boolean).join(' '),encoded=encodeURIComponent(query);
 if(provider==='apple')return 'https://music.apple.com/be/search?term='+encoded;
 if(provider==='spotify')return 'https://open.spotify.com/search/'+encoded;
 if(provider==='deezer')return 'https://www.deezer.com/search/'+encoded;
 return 'https://music.youtube.com/search?q='+encoded;
}
function muPersist(message){try{localStorage.setItem(MU_KEY,JSON.stringify(muLists));mu('musicPlaylistStatus').textContent=message+' Enregistré sur cet appareil.';}catch{mu('musicPlaylistStatus').textContent=message+' Sauvegarde indisponible : téléchargez vos playlists avant de fermer.';}}
function muRender(){
 const select=mu('musicPlaylistSelect');select.replaceChildren();
 muLists.forEach(list=>{const option=document.createElement('option');option.value=list.id;option.textContent=list.name;select.append(option);});select.value=muSelected;
 const current=muCurrent();mu('musicPlaylistTitle').textContent=current.name;mu('musicPlaylistDescription').textContent=current.description;
 mu('musicTrackList').replaceChildren();const provider=mu('musicProvider').value,providerName={apple:'Apple Music',spotify:'Spotify',deezer:'Deezer',youtube:'YouTube Music'}[provider];
 if(!current.tracks.length){const p=document.createElement('p');p.textContent='Ajoutez votre premier titre avec le formulaire ci-dessous.';mu('musicTrackList').append(p);}
 current.tracks.forEach((track,index)=>{
 const li=document.createElement('li');li.style.cssText='margin:16px 0;overflow-wrap:anywhere';
 const text=document.createElement('p');text.textContent=track.title+(track.artist?' — '+track.artist:'');
 const link=document.createElement('a');link.href=muSearchURL(provider,track.title,track.artist);link.target='_blank';link.rel='noopener noreferrer';link.textContent='Rechercher ce titre sur '+providerName;
 const remove=document.createElement('button');remove.type='button';remove.className='action';remove.style.margin='8px';remove.textContent='Retirer';remove.setAttribute('aria-label','Retirer : '+track.title);
 remove.addEventListener('click',()=>{current.tracks.splice(index,1);muRender();muPersist('Titre retiré.');mu('musicAddTrack').focus();});
 li.append(text,link,remove);mu('musicTrackList').append(li);
 });
}
mu('musicPlaylistSelect').addEventListener('change',()=>{muSelected=mu('musicPlaylistSelect').value;muRender();});
mu('musicProvider').addEventListener('change',muRender);
mu('musicCreate').addEventListener('click',()=>{
 const name=mu('musicNewName').value.trim();if(!name){mu('musicPlaylistStatus').textContent='Donnez un nom à la playlist.';return;}
 if(muLists.length>=30){mu('musicPlaylistStatus').textContent='Vous pouvez créer jusqu’à 30 playlists dans cette version.';return;}
 const id=crypto.randomUUID();muLists.push({id,name,description:'Ma playlist personnelle LOTUS.',tracks:[]});muSelected=id;mu('musicNewName').value='';muRender();muPersist('Playlist créée.');mu('musicTrackTitle').focus();
});
mu('musicAddTrack').addEventListener('click',()=>{
 const title=mu('musicTrackTitle').value.trim(),artist=mu('musicTrackArtist').value.trim(),current=muCurrent();
 if(!title){mu('musicPlaylistStatus').textContent='Indiquez le titre du morceau.';mu('musicTrackTitle').focus();return;}
 if(current.tracks.length>=100){mu('musicPlaylistStatus').textContent='Cette playlist contient déjà 100 titres.';return;}
 current.tracks.push({title,artist});mu('musicTrackTitle').value='';mu('musicTrackArtist').value='';muRender();muPersist('Titre ajouté.');
});
function muListText(list){return list.name+'\n'+list.tracks.map((track,index)=>(index+1)+'. '+track.title+(track.artist?' — '+track.artist:'')).join('\n');}
mu('musicCopyList').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(muListText(muCurrent()));mu('musicPlaylistStatus').textContent='Liste copiée. Vous pouvez vous en servir pour recréer la playlist sur votre plateforme.';}catch{mu('musicPlaylistStatus').textContent='Copie indisponible dans ce navigateur. Utilisez le téléchargement des playlists.';}});
mu('musicDownloadList').addEventListener('click',()=>{
 const content=muLists.map(muListText).join('\n\n');const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='LOTUS-Mes-playlists.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);mu('musicPlaylistStatus').textContent='Téléchargement des playlists demandé.';
});
muRender();
