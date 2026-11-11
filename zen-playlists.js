'use strict';
const zenEl=id=>document.getElementById(id);
const zenTracks={
 pluie:{title:'Pluie légère',src:'./audio/pluie-legere.mp3'},
 vagues:{title:'Vagues lentes',src:'./audio/vagues-lentes.mp3'},
 vent:{title:'Souffle de vent',src:'./audio/souffle-vent.mp3'},
 notes:{title:'Notes claires',src:'./audio/notes-claires.mp3'},
 accords:{title:'Accords doux',src:'./audio/accords-doux.mp3'},
 nuit:{title:'Nuit tranquille',src:'./audio/nuit-tranquille.mp3'}
};
const zenPlaylists={
 nature:{title:'🌿 Pause nature',tracks:['pluie','vagues','vent']},
 calme:{title:'🪷 Calme intérieur',tracks:['notes','accords','vagues']},
 soir:{title:'🌙 Soir paisible',tracks:['accords','nuit','vent']}
};
const zenPlayer=zenEl('zenAudio');
let zenSelected='nature',zenIndex=0,zenGeneration=0,zenReady=false;
try{zenPlayer.volume=.25;}catch{}
function zenCurrent(){return zenTracks[zenPlaylists[zenSelected].tracks[zenIndex]];}
function zenNextChoice(index,count,repeat){return index+1<count?index+1:repeat?0:null;}
function zenRender(){
 const playlist=zenPlaylists[zenSelected];
 zenEl('zenPlaylistTitle').textContent=playlist.title;zenEl('zenTrackList').replaceChildren();
 document.querySelectorAll('[data-zen-playlist]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.zenPlaylist===zenSelected)));
 playlist.tracks.forEach((key,index)=>{
 const li=document.createElement('li');li.style.margin='10px 0';
 const button=document.createElement('button');button.className='action';button.type='button';button.textContent=zenTracks[key].title+' · 1 min 30';
 button.setAttribute('aria-label','Écouter '+zenTracks[key].title);if(index===zenIndex)button.setAttribute('aria-current','true');
 button.addEventListener('click',()=>zenSetTrack(index,true));li.append(button);zenEl('zenTrackList').append(li);
 });
 zenEl('zenNowPlaying').textContent='Piste '+(zenIndex+1)+' / '+playlist.tracks.length+' — '+zenCurrent().title+' (ambiance synthétique)';
 zenEl('zenToggle').textContent=zenPlayer.paused?'Lire':'Pause';
 zenEl('zenPrevious').disabled=zenIndex===0;zenEl('zenNext').disabled=zenIndex===playlist.tracks.length-1;
}
async function zenStart(generation=zenGeneration){
 try{await zenPlayer.play();if(generation===zenGeneration){zenEl('zenAudioStatus').textContent='Lecture : '+zenCurrent().title+'.';zenEl('zenToggle').textContent='Pause';}}
 catch(error){if(generation!==zenGeneration)return;zenEl('zenToggle').textContent='Lire';zenEl('zenAudioStatus').textContent=error.name==='NotAllowedError'?'Touchez le bouton Lecture du lecteur pour autoriser le son.':'Lecture indisponible. Vérifiez votre connexion puis réessayez.';}
}
function zenSetTrack(index,play=false){
 if(index<0||index>=zenPlaylists[zenSelected].tracks.length)return;
 zenGeneration++;zenPlayer.pause();zenIndex=index;zenReady=true;zenPlayer.src=zenCurrent().src;zenPlayer.load();zenRender();
 zenEl('zenAudioStatus').textContent='Piste prête : '+zenCurrent().title+'. Touchez Lire pour écouter.';
 if(play)void zenStart(zenGeneration);
}
document.querySelectorAll('[data-zen-playlist]').forEach(button=>button.addEventListener('click',()=>{
 zenSelected=button.dataset.zenPlaylist;zenSetTrack(0,false);
}));
zenEl('zenToggle').addEventListener('click',()=>{
 if(!zenReady)zenSetTrack(zenIndex,false);
 if(zenPlayer.paused)void zenStart();else zenPlayer.pause();
});
zenEl('zenPrevious').addEventListener('click',()=>zenSetTrack(zenIndex-1,!zenPlayer.paused));
zenEl('zenNext').addEventListener('click',()=>zenSetTrack(zenIndex+1,!zenPlayer.paused));
zenEl('zenStop').addEventListener('click',()=>{
 zenGeneration++;zenPlayer.pause();if(zenReady)try{zenPlayer.currentTime=0;}catch{}zenEl('zenToggle').textContent='Lire';zenEl('zenAudioStatus').textContent='Lecture arrêtée.';
});
zenPlayer.addEventListener('play',()=>{zenEl('zenToggle').textContent='Pause';zenEl('zenAudioStatus').textContent='Lecture : '+zenCurrent().title+'.';});
zenPlayer.addEventListener('pause',()=>{zenEl('zenToggle').textContent='Lire';if(!zenPlayer.ended&&zenPlayer.currentTime>0)zenEl('zenAudioStatus').textContent='En pause : '+zenCurrent().title+'.';});
zenPlayer.addEventListener('ended',()=>{
 const next=zenNextChoice(zenIndex,zenPlaylists[zenSelected].tracks.length,zenEl('zenRepeat').checked);
 if(next!==null)zenSetTrack(next,true);else{zenSetTrack(0,false);zenEl('zenAudioStatus').textContent='Playlist terminée. Touchez Lire pour la recommencer.';}
});
zenPlayer.addEventListener('error',()=>{zenEl('zenToggle').textContent='Lire';zenEl('zenAudioStatus').textContent='Cette piste ne peut pas être chargée. Vérifiez votre connexion, puis choisissez à nouveau une piste.';});
zenSetTrack(0,false);
