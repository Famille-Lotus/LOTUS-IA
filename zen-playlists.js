'use strict';
// LOTUS Zen — sons générés sans fichiers MP3.
const zenEl = id => document.getElementById(id);

const zenTracks = {
  pluie: {title:'Pluie légère', kind:'rain'},
  vagues: {title:'Vagues lentes', kind:'waves'},
  vent: {title:'Souffle de vent', kind:'wind'},
  notes: {title:'Notes claires', kind:'notes'},
  accords: {title:'Accords doux', kind:'chords'},
  nuit: {title:'Nuit tranquille', kind:'night'}
};

const zenPlaylists = {
  nature:{title:'🌿 Pause nature',tracks:['pluie','vagues','vent']},
  calme:{title:'🪷 Calme intérieur',tracks:['notes','accords','vagues']},
  soir:{title:'🌙 Soir paisible',tracks:['accords','nuit','vent']}
};

const zenPlayer = zenEl('zenAudio');
if (zenPlayer) zenPlayer.hidden = true;

let zenSelected='nature', zenIndex=0, zenPlaying=false;
let zenContext=null, zenNodes=[], zenTrackTimer=null;
let zenStartedAt=0, zenElapsed=0;
const ZEN_DURATION=90;

const zenCurrent=()=>zenTracks[zenPlaylists[zenSelected].tracks[zenIndex]];

function zenStatus(message){
  const e=zenEl('zenAudioStatus');
  if(e)e.textContent=message;
}

function zenRender(){
  const playlist=zenPlaylists[zenSelected];
  zenEl('zenPlaylistTitle').textContent=playlist.title;
  const list=zenEl('zenTrackList');
  list.replaceChildren();

  document.querySelectorAll('[data-zen-playlist]').forEach(b=>{
    b.setAttribute('aria-pressed',String(b.dataset.zenPlaylist===zenSelected));
  });

  playlist.tracks.forEach((key,i)=>{
    const li=document.createElement('li');
    li.style.margin='10px 0';
    const b=document.createElement('button');
    b.type='button';
    b.className='action';
    b.textContent=zenTracks[key].title+' · 1 min 30';
    b.setAttribute('aria-label','Écouter '+zenTracks[key].title);
    if(i===zenIndex)b.setAttribute('aria-current','true');
    b.addEventListener('click',()=>zenSetTrack(i,true));
    li.append(b);
    list.append(li);
  });

  zenEl('zenNowPlaying').textContent=
    'Piste '+(zenIndex+1)+' / '+playlist.tracks.length+
    ' — '+zenCurrent().title;

  zenEl('zenToggle').textContent=zenPlaying?'Pause':'Lire';
  zenEl('zenPrevious').disabled=zenIndex===0;
  zenEl('zenNext').disabled=zenIndex===playlist.tracks.length-1;
}

function zenCleanup(){
  if(zenTrackTimer){
    clearTimeout(zenTrackTimer);
    zenTrackTimer=null;
  }
  for(const node of zenNodes){
    try{node.stop?.();}catch{}
    try{node.disconnect?.();}catch{}
  }
  zenNodes=[];
}

function zenNoiseBuffer(ctx){
  const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  return buffer;
}

function zenNoise(ctx,kind,output){
  const source=ctx.createBufferSource();
  source.buffer=zenNoiseBuffer(ctx);
  source.loop=true;

  const filter=ctx.createBiquadFilter();
  filter.type=kind==='rain'?'highpass':'lowpass';
  filter.frequency.value=kind==='rain'?950:kind==='wind'?500:260;

  const gain=ctx.createGain();
  gain.gain.value=kind==='rain'?.055:.085;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start();
  zenNodes.push(source,filter,gain);

  if(kind==='waves'||kind==='wind'){
    const lfo=ctx.createOscillator();
    const depth=ctx.createGain();
    lfo.frequency.value=kind==='waves'?.13:.23;
    depth.gain.value=.035;
    lfo.connect(depth);
    depth.connect(gain.gain);
    lfo.start();
    zenNodes.push(lfo,depth);
  }
}

function zenTones(ctx,kind,output){
  const frequencies=kind==='notes'
    ?[261.63,329.63,392]
    :kind==='chords'
    ?[196,246.94,293.66]
    :[174.61,261.63,349.23];

  frequencies.forEach((freq,i)=>{
    const osc=ctx.createOscillator();
    osc.type='sine';
    osc.frequency.value=freq;

    const gain=ctx.createGain();
    gain.gain.value=.018;
    osc.connect(gain);
    gain.connect(output);
    osc.start();
    zenNodes.push(osc,gain);

    const lfo=ctx.createOscillator();
    const depth=ctx.createGain();
    lfo.frequency.value=.07+i*.025;
    depth.gain.value=.009;
    lfo.connect(depth);
    depth.connect(gain.gain);
    lfo.start();
    zenNodes.push(lfo,depth);
  });
}

async function zenStart(){
  try{
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)throw new Error('AudioContext indisponible');

    if(!zenContext)zenContext=new AudioContextClass();
    await zenContext.resume();
    zenCleanup();

    const master=zenContext.createGain();
    master.gain.value=.55;
    master.connect(zenContext.destination);
    zenNodes.push(master);

    const kind=zenCurrent().kind;
    if(['rain','waves','wind'].includes(kind)){
      zenNoise(zenContext,kind,master);
    }else{
      zenTones(zenContext,kind,master);
    }

    zenPlaying=true;
    zenStartedAt=Date.now();
    zenRender();
    zenStatus('Lecture : '+zenCurrent().title+'.');

    zenTrackTimer=setTimeout(()=>{
      zenElapsed=0;
      const count=zenPlaylists[zenSelected].tracks.length;
      const repeat=zenEl('zenRepeat')?.checked;
      const next=zenIndex+1<count?zenIndex+1:repeat?0:null;
      if(next===null){
        zenStop();
        zenStatus('Playlist terminée.');
      }else{
        zenSetTrack(next,true);
      }
    },Math.max(1,ZEN_DURATION-zenElapsed)*1000);

  }catch(error){
    zenPlaying=false;
    zenCleanup();
    zenRender();
    zenStatus('Son indisponible. Vérifiez le volume puis réessayez.');
  }
}

function zenPause(){
  if(zenPlaying){
    zenElapsed=Math.min(ZEN_DURATION,
      zenElapsed+(Date.now()-zenStartedAt)/1000);
  }
  zenPlaying=false;
  zenCleanup();
  zenRender();
  zenStatus('En pause : '+zenCurrent().title+'.');
}

function zenStop(){
  zenPlaying=false;
  zenElapsed=0;
  zenCleanup();
  zenRender();
  zenStatus('Lecture arrêtée.');
}

function zenSetTrack(index,play=false){
  if(index<0||index>=zenPlaylists[zenSelected].tracks.length)return;
  zenPlaying=false;
  zenElapsed=0;
  zenCleanup();
  zenIndex=index;
  zenRender();
  zenStatus('Piste prête : '+zenCurrent().title+'.');
  if(play)void zenStart();
}

document.querySelectorAll('[data-zen-playlist]').forEach(b=>{
  b.addEventListener('click',()=>{
    zenSelected=b.dataset.zenPlaylist;
    zenSetTrack(0,false);
  });
});

zenEl('zenToggle').addEventListener('click',()=>{
  if(zenPlaying)zenPause();
  else void zenStart();
});

zenEl('zenPrevious').addEventListener('click',()=>{
  zenSetTrack(zenIndex-1,zenPlaying);
});

zenEl('zenNext').addEventListener('click',()=>{
  zenSetTrack(zenIndex+1,zenPlaying);
});

zenEl('zenStop').addEventListener('click',zenStop);

zenSetTrack(0,false);
