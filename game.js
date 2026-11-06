(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const ui = { score:$('score'), time:$('time'), combo:$('combo'), comboHud:$('comboHud'), lives:$('lives'), overlay:$('overlay'), title:$('overlayTitle'), text:$('overlayText'), play:$('playBtn'), playLabel:$('playLabel'), toast:$('comboToast'), delta:$('scoreDelta'), pause:$('pauseIndicator'), bestSide:$('bestSide'), bestChain:$('bestChain'), timeBlock:document.querySelector('.time-block'), sound:$('soundBtn'), soundIcon:$('soundIcon') };
  const FRUITS = [
    {name:'CITRUS',color:'#ff9f38',light:'#ffd46f',dark:'#df622e',leaf:'#7fc96d'},
    {name:'WATERMELON',color:'#ef6470',light:'#ff9c8b',dark:'#bf4059',leaf:'#65c88b'},
    {name:'LEMON',color:'#f5d84c',light:'#fff18b',dark:'#d6a82e',leaf:'#81bc69'},
    {name:'KIWI',color:'#95c66b',light:'#c9df81',dark:'#588e58',leaf:'#5eaa6e'},
    {name:'BERRY',color:'#dc577e',light:'#ff9bb5',dark:'#a83367',leaf:'#73b978'},
    {name:'PEACH',color:'#f2956d',light:'#ffd18b',dark:'#db6657',leaf:'#70b875'}
  ];
  const state = { running:false, paused:false, ended:false, score:0, best:Number(localStorage.getItem('fruitfrenzy-best')||0), lives:3, time:60, combo:1, chain:0, bestChain:0, chainUntil:0, lastSwipe:0, spawnIn:0, elapsed:0, shake:0, fruits:[], particles:[], halves:[], trails:[], popups:[], pointer:null, sound:true, lastFrame:0, screen:{w:800,h:590}, comboToastUntil:0, firstWave:true, waveId:0, lastMissedWave:-1 };
  let audio;
  ui.bestSide.textContent = String(state.best).padStart(4,'0');

  function resize(){
    const r=canvas.getBoundingClientRect(); const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(r.width*dpr)); canvas.height=Math.max(1,Math.round(r.height*dpr));
    state.screen.w=r.width; state.screen.h=r.height; ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  new ResizeObserver(resize).observe(canvas); resize();
  function sound(freq=440,duration=.08,type='sine',volume=.035){
    if(!state.sound)return;
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(100,freq*.62),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch(e){}
  }
  function rand(a,b){return a+Math.random()*(b-a)}
  function spawnWave(){
    const w=state.screen.w,h=state.screen.h; const wave=++state.waveId; const count=Math.min(5,2+Math.floor(state.elapsed/13)+Math.floor(Math.random()*2));
    const center=rand(w*.31,w*.69), direction=Math.random()<.5?-1:1;
    for(let i=0;i<count;i++){
      const bomb=!state.firstWave && Math.random()<Math.min(.2,.07+state.elapsed/500);
      const x=center+(i-(count-1)/2)*rand(39,53), y=h+rand(25,75);
      state.fruits.push({x,y,vx:direction*rand(65,145)+rand(-35,35),vy:-rand(h*.92,h*1.22),r:rand(22,29),rot:rand(-.4,.4),vr:rand(-2.2,2.2),type:bomb?'bomb':'fruit',fruit:FRUITS[Math.floor(Math.random()*FRUITS.length)],cut:false,seed:Math.random()*10,wave});
    }
    state.firstWave=false;
  }
  function start(){
    state.running=true;state.paused=false;state.ended=false;state.score=0;state.lives=3;state.time=60;state.combo=1;state.chain=0;state.bestChain=0;state.chainUntil=0;state.elapsed=0;state.fruits=[];state.particles=[];state.halves=[];state.trails=[];state.popups=[];state.spawnIn=.25;state.firstWave=true;state.waveId=0;state.lastMissedWave=-1;
    ui.score.textContent='0000';ui.time.textContent='60';ui.combo.textContent='×1';ui.bestChain.textContent='—';ui.overlay.classList.add('hidden');ui.pause.classList.remove('visible');ui.timeBlock.classList.remove('urgent');updateLives();sound(520,.12,'triangle',.04);
  }
  function endGame(){
    if(state.ended)return;state.running=false;state.ended=true;
    const newBest=state.score>state.best;
    if(newBest){state.best=state.score;localStorage.setItem('fruitfrenzy-best',state.best);ui.bestSide.textContent=String(state.best).padStart(4,'0');}
    ui.title.innerHTML=newBest?"New best!<br><em>That's juicy.</em>":"Nice slicing.<br><em>One more?</em>";
    ui.text.innerHTML=`You scored <b style="color:#d5f064">${String(state.score).padStart(4,'0')}</b> points.<br>Best chain: ${state.bestChain||1}×. The orchard awaits.`;
    ui.playLabel.textContent='PLAY AGAIN';ui.overlay.classList.remove('hidden');sound(180,.2,'triangle',.045);
  }
  function updateLives(){[...ui.lives.children].forEach((el,i)=>el.classList.toggle('lost',i>=state.lives));ui.lives.setAttribute('aria-label',`${state.lives} lives`);if(state.lives<=0)endGame();}
  function loseLife(x,y){if(state.lives<=0)return;state.lives--;state.shake=12;state.popups.push({x,y,text:'− HEART',life:.8,color:'#ff8a78'});sound(145,.18,'sawtooth',.035);updateLives();}
  function updateHud(){ui.score.textContent=String(state.score).padStart(4,'0');ui.time.textContent=String(Math.ceil(state.time)).padStart(2,'0');ui.combo.textContent=`×${state.combo}`;ui.comboHud.classList.toggle('hot',state.combo>=3);ui.timeBlock.classList.toggle('urgent',state.time<=10);}
  function slice(f,dir){
    if(f.type==='bomb'){f.cut=true;loseLife(f.x,f.y);for(let n=0;n<18;n++)particle(f.x,f.y,Math.random()<.5?'#ff8b67':'#ffce67',rand(2,5));return;}
    f.cut=true;const now=performance.now();state.chain=now<state.chainUntil?state.chain+1:1;state.chainUntil=now+1250;state.combo=Math.min(9,state.chain);state.bestChain=Math.max(state.bestChain,state.combo);ui.bestChain.textContent=state.bestChain>1?`×${state.bestChain}`:'—';
    const points=10*state.combo;state.score+=points;ui.delta.textContent=`+${points}`;ui.delta.classList.remove('show');void ui.delta.offsetWidth;ui.delta.classList.add('show');
    const fcfg=f.fruit;for(let n=0;n<13;n++)particle(f.x,f.y,[fcfg.light,fcfg.color,fcfg.dark,'#f8f2d5'][n%4],rand(1.7,4.2));
    state.halves.push({x:f.x,y:f.y,vy:f.vy*.35,vx:f.vx*.6,rot:f.rot,vr:dir*.9,life:1,r:f.r,color:fcfg.color,light:fcfg.light,seed:f.seed});
    state.popups.push({x:f.x,y:f.y-10,text:`+${points}`,life:.75,color:state.combo>=3?'#e6fb7a':'#fff4cf'});
    if(state.combo>=3){state.comboToastUntil=now+550;ui.toast.textContent=state.combo>=5?'JUICE STORM!':`${state.combo}× CHAIN!`;ui.toast.classList.add('show');}
    sound(state.combo>=3?700:530,.07,'triangle',.025);
  }
  function particle(x,y,color,s){state.particles.push({x,y,vx:rand(-220,220),vy:rand(-210,160),life:rand(.35,.8),max:.8,r:s,color});}
  function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));}
  function pointerDown(e){e.preventDefault();canvas.setPointerCapture?.(e.pointerId);const r=canvas.getBoundingClientRect();state.pointer={x:e.clientX-r.left,y:e.clientY-r.top};state.trails.push({x:state.pointer.x,y:state.pointer.y,life:.2});}
  function pointerMove(e){if(!state.pointer||!state.running||state.paused)return;e.preventDefault();const r=canvas.getBoundingClientRect(),next={x:e.clientX-r.left,y:e.clientY-r.top};const speed=Math.hypot(next.x-state.pointer.x,next.y-state.pointer.y);if(speed>2){state.trails.push({x:next.x,y:next.y,life:.24});for(const f of state.fruits){if(!f.cut&&distanceToSegment(f,state.pointer,next)<f.r*.88)slice(f,Math.sign(next.x-state.pointer.x)||1);}}state.pointer=next;}
  function pointerUp(){state.pointer=null;}
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);window.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);

  function update(dt,now){
    if(!state.running||state.paused)return;
    state.elapsed+=dt;state.time=Math.max(0,state.time-dt);if(state.time===0){endGame();return;}
    state.spawnIn-=dt;if(state.spawnIn<=0){spawnWave();state.spawnIn=Math.max(.56,rand(1.05,1.5)-state.elapsed*.006);}
    if(now>state.chainUntil){state.combo=1;}
    if(now>state.comboToastUntil)ui.toast.classList.remove('show');
    for(let i=state.fruits.length-1;i>=0;i--){const f=state.fruits[i];f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=480*dt;f.rot+=f.vr*dt;if(f.cut){state.fruits.splice(i,1);continue;}if(f.y>state.screen.h+f.r){state.fruits.splice(i,1);if(f.type==='fruit'&&state.lastMissedWave!==f.wave){state.lastMissedWave=f.wave;loseLife(f.x,state.screen.h-15);}}}
    for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;p.life-=dt;}state.particles=state.particles.filter(p=>p.life>0);
    for(const h of state.halves){h.x+=h.vx*dt;h.y+=h.vy*dt;h.vy+=450*dt;h.rot+=h.vr*dt;h.life-=dt*.72;}state.halves=state.halves.filter(h=>h.life>0);
    for(const t of state.trails)t.life-=dt;state.trails=state.trails.filter(t=>t.life>0);
    for(const p of state.popups){p.y-=27*dt;p.life-=dt;}state.popups=state.popups.filter(p=>p.life>0);
    state.shake=Math.max(0,state.shake-dt*28);updateHud();
  }
  function drawBackground(w,h){
    const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#2d4540');g.addColorStop(.52,'#304743');g.addColorStop(1,'#243936');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.globalAlpha=.12;for(let i=0;i<8;i++){const x=((i*137+34)%w),y=((i*93+80)%h);ctx.beginPath();ctx.ellipse(x,y,rand(28,66),rand(7,15),rand(-1,1),0,Math.PI*2);ctx.fillStyle=i%2?'#b9d688':'#e0e9b0';ctx.fill();}ctx.restore();
    ctx.strokeStyle='#d5e1be0b';ctx.lineWidth=1;for(let i=0;i<10;i++){ctx.beginPath();ctx.moveTo(i*w/9,0);ctx.lineTo((i*w/9)-40,h);ctx.stroke();}
    const vignette=ctx.createRadialGradient(w*.5,h*.48,h*.1,w*.5,h*.48,h*.75);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#101a1a66');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  }
  function drawFruit(f){
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot);
    if(f.type==='bomb'){
      ctx.shadowColor='#080c0d';ctx.shadowBlur=14;const g=ctx.createRadialGradient(-f.r*.35,-f.r*.4,2,0,0,f.r);g.addColorStop(0,'#59615d');g.addColorStop(.4,'#272e2c');g.addColorStop(1,'#0e1414');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,f.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#778078';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.moveTo(6,-f.r+2);ctx.quadraticCurveTo(14,-f.r-10,20,-f.r-6);ctx.strokeStyle='#c2b283';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#ffae52';ctx.shadowColor='#ff6c30';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(21,-f.r-7,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#e3e5d5';ctx.font=`bold ${Math.max(14,f.r*.78)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',0,1);
    }else{
      const c=f.fruit;const grad=ctx.createRadialGradient(-f.r*.35,-f.r*.42,2,0,0,f.r*1.2);grad.addColorStop(0,c.light);grad.addColorStop(.52,c.color);grad.addColorStop(1,c.dark);ctx.shadowColor='#14201a99';ctx.shadowBlur=12;ctx.shadowOffsetY=5;ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(0,0,f.r*.9,f.r,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      ctx.fillStyle='#f8f6dd65';ctx.beginPath();ctx.ellipse(-f.r*.38,-f.r*.42,f.r*.13,f.r*.23,-.5,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#705239';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-f.r*.87);ctx.quadraticCurveTo(3,-f.r-5,1,-f.r-9);ctx.stroke();ctx.fillStyle=c.leaf;ctx.beginPath();ctx.ellipse(7,-f.r*.9,7,3,-.4,0,Math.PI*2);ctx.fill();
      if(c.name==='WATERMELON'){ctx.strokeStyle='#a5d784';ctx.lineWidth=1.5;for(let j=-1;j<=1;j++){ctx.beginPath();ctx.moveTo(j*8,-f.r*.63);ctx.quadraticCurveTo(j*7-3,0,j*7,f.r*.66);ctx.stroke();}}
    }
    ctx.restore();
  }
  function draw(){
    const w=state.screen.w,h=state.screen.h;ctx.save();if(state.shake>0)ctx.translate(rand(-state.shake,state.shake),rand(-state.shake,state.shake));drawBackground(w,h);
    for(const part of state.halves){ctx.save();ctx.globalAlpha=Math.max(0,part.life);ctx.translate(part.x,part.y);ctx.rotate(part.rot);ctx.fillStyle=part.color;ctx.beginPath();ctx.arc(0,0,part.r,Math.PI,0);ctx.closePath();ctx.fill();ctx.fillStyle=part.light;ctx.beginPath();ctx.ellipse(0,-2,part.r*.58,part.r*.28,0,Math.PI,0);ctx.fill();ctx.strokeStyle='#fff4c9';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-part.r*.85,0);ctx.lineTo(part.r*.85,0);ctx.stroke();ctx.restore();}
    for(const f of state.fruits)drawFruit(f);
    for(const p of state.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r*Math.min(1,p.life*3),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    for(const p of state.popups){ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=p.color;ctx.textAlign='center';ctx.font='800 16px Outfit,sans-serif';ctx.shadowColor='#122020';ctx.shadowBlur=7;ctx.fillText(p.text,p.x,p.y);ctx.shadowBlur=0;}ctx.globalAlpha=1;
    if(state.trails.length>1){for(let i=1;i<state.trails.length;i++){const a=state.trails[i-1],b=state.trails[i];ctx.globalAlpha=Math.min(a.life,b.life)/.24;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#d8f78b';ctx.shadowColor='#d7ff9a';ctx.shadowBlur=14;ctx.lineWidth=8*Math.min(a.life,b.life)/.24;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#fffbdc';ctx.lineWidth=2.2*Math.min(a.life,b.life)/.24;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.globalAlpha=1;}
    ctx.restore();
  }
  function frame(t){const dt=Math.min(.034,(t-state.lastFrame)/1000||0);state.lastFrame=t;update(dt,t);draw();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  ui.play.addEventListener('click',start);
  $('pauseBtn').addEventListener('click',()=>{if(!state.running)return;state.paused=!state.paused;ui.pause.classList.toggle('visible',state.paused);});
  $('resumeBtn').addEventListener('click',()=>{state.paused=false;ui.pause.classList.remove('visible');});
  ui.sound.addEventListener('click',()=>{state.sound=!state.sound;ui.sound.classList.toggle('off',!state.sound);ui.soundIcon.textContent=state.sound?'♫':'×';ui.sound.querySelector('.sound-label').textContent=state.sound?'SOUND ON':'SOUND OFF';if(state.sound)sound(550,.08,'sine');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running){state.paused=true;ui.pause.classList.add('visible');}});
})();
