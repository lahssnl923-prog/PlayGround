(() => {
  'use strict';
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const overlay = $('overlay'), startBtn = $('startBtn'), callout = $('callout'), touchControls = document.querySelector('.touch-controls');
  const W=960,H=540,FLOOR=432, held={left:false,right:false,guard:false};
  let playing=false,ended=false,seconds=99,last=0,elapsed=0,aiClock=0,calloutTimer=0,shake=0,soundOn=false,audio,sparks=[],overlayTimeout;
  const player=makeFighter('الصقر',292,1,'player'), enemy=makeFighter('الذئب',668,-1,'enemy');
  function makeFighter(name,x,facing,side){return{name,x,facing,side,hp:100,state:'idle',action:0,cooldown:0,hurt:0,walk:0,bob:0,guarding:false,flash:0,aiGuard:0,combo:0,comboTime:0};}
  function rr(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.stroke()}}
  function drawBackground(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#1b202b');sky.addColorStop(.52,'#39404a');sky.addColorStop(.72,'#665044');sky.addColorStop(1,'#11151b');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // Distant city skyline
    for(let i=0;i<18;i++){const x=260+i*26,h=75+(i*37%85),w=21+(i*11%18);ctx.fillStyle='#242830';ctx.fillRect(x,240-h,w,h+115);for(let j=0;j<4;j++)if((i+j)%3!==0){ctx.fillStyle='#d8a56a';ctx.globalAlpha=.22;ctx.fillRect(x+4+(j%2)*9,260-h+j*20,5,7);ctx.globalAlpha=1}}
    const wallL=ctx.createLinearGradient(0,70,300,0);wallL.addColorStop(0,'#171c24');wallL.addColorStop(.6,'#30313a');wallL.addColorStop(1,'#66534b');ctx.fillStyle=wallL;ctx.beginPath();ctx.moveTo(0,32);ctx.lineTo(310,152);ctx.lineTo(330,425);ctx.lineTo(0,425);ctx.closePath();ctx.fill();
    const wallR=ctx.createLinearGradient(W,70,650,0);wallR.addColorStop(0,'#171a22');wallR.addColorStop(.58,'#303039');wallR.addColorStop(1,'#60504a');ctx.fillStyle=wallR;ctx.beginPath();ctx.moveTo(W,20);ctx.lineTo(650,150);ctx.lineTo(630,425);ctx.lineTo(W,425);ctx.closePath();ctx.fill();
    // Brickwork, pipes and fire escapes
    ctx.strokeStyle='#a5a09a17';ctx.lineWidth=1;
    for(let side=0;side<2;side++){ctx.save();if(side){ctx.translate(W,0);ctx.scale(-1,1)}for(let y=90;y<390;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(285-(y-90)*.26,y+((y-90)*.45));ctx.stroke();for(let x=side%2?40:0;x<280;x+=48){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+24);ctx.stroke()}}ctx.strokeStyle='#11151c';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(68,53);ctx.lineTo(68,376);ctx.bezierCurveTo(68,398,96,398,96,375);ctx.lineTo(96,210);ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#aaa39a55';ctx.beginPath();ctx.moveTo(31,130);ctx.lineTo(175,185);ctx.lineTo(175,201);ctx.lineTo(31,146);ctx.stroke();ctx.restore()}
    // Windows and lit signs
    for(const [x,y,w,h] of [[43,92,42,58],[112,122,44,55],[778,86,52,66],[866,117,43,59]]){ctx.fillStyle='#11151b';ctx.fillRect(x-4,y-4,w+8,h+8);ctx.fillStyle='#343b43';ctx.fillRect(x,y,w,h);ctx.fillStyle='#d69b58';ctx.globalAlpha=.36;ctx.fillRect(x+4,y+4,w-8,h-8);ctx.globalAlpha=1;ctx.strokeStyle='#161b22';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(x+w/2,y+h);ctx.moveTo(x,y+h/2);ctx.lineTo(x+w,y+h/2);ctx.stroke()}
    // Graffiti and street poster
    ctx.save();ctx.translate(205,260);ctx.rotate(-.08);ctx.fillStyle='#d95d4c';ctx.globalAlpha=.65;ctx.font='900 29px sans-serif';ctx.fillText('FIGHT',0,0);ctx.fillStyle='#f0bd72';ctx.font='bold 11px sans-serif';ctx.fillText('YOUR BLOCK',9,17);ctx.globalAlpha=1;ctx.restore();
    rr(ctx,726,242,65,112,3,'#22232a','#56545a');ctx.fillStyle='#f0b879';ctx.globalAlpha=.65;ctx.font='bold 19px sans-serif';ctx.fillText('NO',744,280);ctx.fillText('FEAR',736,304);ctx.globalAlpha=1;
    // Dumpster / trash and street props
    rr(ctx,60,355,124,62,7,'#252b2e','#4b5352');ctx.fillStyle='#394142';ctx.fillRect(53,350,139,9);ctx.strokeStyle='#596260';ctx.lineWidth=3;for(let x=72;x<178;x+=22){ctx.beginPath();ctx.moveTo(x,367);ctx.lineTo(x,407);ctx.stroke()}ctx.fillStyle='#1b1d21';ctx.beginPath();ctx.ellipse(82,419,10,5,0,0,Math.PI*2);ctx.ellipse(164,419,10,5,0,0,Math.PI*2);ctx.fill();
    rr(ctx,813,362,49,56,4,'#39383a','#6a6056');ctx.fillStyle='#d28751';ctx.globalAlpha=.6;ctx.fillRect(824,355,20,7);ctx.globalAlpha=1;
    // Ground plane
    const ground=ctx.createLinearGradient(0,397,0,H);ground.addColorStop(0,'#303039');ground.addColorStop(.3,'#20232c');ground.addColorStop(1,'#10131b');ctx.fillStyle=ground;ctx.beginPath();ctx.moveTo(0,408);ctx.lineTo(W,408);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    ctx.strokeStyle='#b9a58b2a';ctx.lineWidth=1;for(let i=0;i<12;i++){let y=415+i*i*1.1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}for(let x=40;x<W;x+=95){ctx.beginPath();ctx.moveTo(480+(x-480)*.18,410);ctx.lineTo(x,H);ctx.stroke()}
    // Wet pavement reflections
    const glow=ctx.createRadialGradient(480,423,5,480,423,360);glow.addColorStop(0,'#e28d5330');glow.addColorStop(1,'#d77d3200');ctx.fillStyle=glow;ctx.fillRect(100,400,760,140);ctx.fillStyle='#f5c27b';ctx.globalAlpha=.12;ctx.fillRect(427,440,108,3);ctx.fillRect(458,452,70,2);ctx.fillRect(394,464,48,2);ctx.globalAlpha=1;
    // overhead practical lights
    for(const x of [115,845]){ctx.fillStyle='#211f20';ctx.fillRect(x-22,53,45,7);ctx.fillStyle='#ffc979';ctx.globalAlpha=.8;ctx.beginPath();ctx.ellipse(x,63,14,4,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.08;const g=ctx.createRadialGradient(x,65,5,x,65,160);g.addColorStop(0,'#ffb85b');g.addColorStop(1,'#ffb85b00');ctx.fillStyle=g;ctx.fillRect(x-160,65,320,300);ctx.globalAlpha=1}
    const vignette=ctx.createRadialGradient(480,260,170,480,260,620);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#090b13b8');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  }
  function segment(x1,y1,x2,y2,width,color,outline='#11151a'){ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=outline;ctx.lineWidth=width+4;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
  function drawFighter(f){
    const t=elapsed, walking=f.state==='walk', guard=f.guarding||f.state==='guard', attack=f.state==='punch'||f.state==='kick';
    const bob=Math.sin(t*7+(f.side==='enemy'?1:0))*(walking?2.3:1.2);let lean=0,frontArm=[23,-105],frontHand=[40,-87],backArm=[-21,-105],backHand=[-35,-87],kickLeg=null;
    const phase=f.action;
    if(f.state==='punch'){const p=Math.sin(Math.min(1,phase/.34)*Math.PI);lean=5*p;frontArm=[26+p*35,-112-p*5];frontHand=[47+p*72,-101-p*9]}
    else if(f.state==='kick'){const p=Math.sin(Math.min(1,phase/.42)*Math.PI);lean=-4*p;kickLeg=[15+p*81,-17-p*41]}
    else if(guard){lean=-3;frontArm=[26,-125];frontHand=[34,-153];backArm=[-20,-121];backHand=[-2,-148]}
    else if(walking){const s=Math.sin(f.walk*9);frontHand=[38+s*7,-84+Math.max(0,s)*8];backHand=[-33-s*7,-84+Math.max(0,-s)*8]}
    if(f.hurt>0)lean=-7;
    ctx.save();ctx.translate(f.x,FLOOR+bob);ctx.scale(f.facing,1);ctx.translate(lean,0);
    // grounded shadow
    ctx.save();ctx.scale(1,.26);const sh=ctx.createRadialGradient(0,0,8,0,0,66);sh.addColorStop(0,'#05070bd9');sh.addColorStop(1,'#05070b00');ctx.fillStyle=sh;ctx.beginPath();ctx.ellipse(0,0,66,23,0,0,Math.PI*2);ctx.fill();ctx.restore();
    const isP=f.side==='player', shirt=isP?'#355a68':'#74443d', light=isP?'#56818a':'#a65d4b', pants=isP?'#262e3b':'#30303a', skin=isP?'#bb8061':'#d29a72', skinLight=isP?'#dda586':'#edb68d', trim=isP?'#e7a969':'#e4b760';
    const stride=walking?Math.sin(f.walk*9)*13:0;
    // rear leg, shoe and trouser silhouette
    segment(-10,-62,-22+stride,-27,22,pants);segment(-22+stride,-27,-25+stride,-8,17,isP?'#1b232b':'#202027');
    ctx.fillStyle=isP?'#bb754d':'#d6a957';ctx.beginPath();ctx.moveTo(-37+stride,-9);ctx.quadraticCurveTo(-31+stride,-18,-17+stride,-11);ctx.lineTo(-8+stride,-3);ctx.quadraticCurveTo(-7+stride,1,-17+stride,2);ctx.lineTo(-39+stride,1);ctx.closePath();ctx.fill();
    // front leg or kicking leg
    if(kickLeg){segment(8,-66,kickLeg[0],kickLeg[1],23,pants);segment(kickLeg[0],kickLeg[1],kickLeg[0]+35,kickLeg[1]-1,15,skin);ctx.fillStyle='#25242a';ctx.beginPath();ctx.ellipse(kickLeg[0]+40,kickLeg[1]-2,18,8,-.08,0,Math.PI*2);ctx.fill();ctx.fillStyle=trim;ctx.fillRect(kickLeg[0]+34,kickLeg[1]-8,12,3)}
    else {segment(11,-64,21-stride,-27,24,pants);segment(21-stride,-27,24-stride,-8,17,isP?'#202832':'#23232a');ctx.fillStyle=isP?'#d18a58':'#e0b566';ctx.beginPath();ctx.moveTo(12-stride,-9);ctx.quadraticCurveTo(20-stride,-17,32-stride,-9);ctx.lineTo(44-stride,-3);ctx.quadraticCurveTo(46-stride,1,35-stride,2);ctx.lineTo(12-stride,1);ctx.closePath();ctx.fill();}
    // back arm
    segment(-20,-119,backArm[0],backArm[1],17,shirt);segment(backArm[0],backArm[1],backHand[0],backHand[1],13,skin);ctx.fillStyle=skinLight;ctx.beginPath();ctx.ellipse(backHand[0],backHand[1],10,9,-.15,0,Math.PI*2);ctx.fill();
    // torso, detailed fitted top
    const torso=ctx.createLinearGradient(-24,-130,28,-76);torso.addColorStop(0,light);torso.addColorStop(.5,shirt);torso.addColorStop(1,isP?'#233d4b':'#502f31');ctx.fillStyle=torso;ctx.beginPath();ctx.moveTo(-24,-130);ctx.quadraticCurveTo(-10,-139,9,-132);ctx.lineTo(24,-121);ctx.lineTo(21,-78);ctx.quadraticCurveTo(0,-69,-23,-78);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#e7d0ac33';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-10,-127);ctx.lineTo(-7,-94);ctx.moveTo(11,-123);ctx.lineTo(8,-91);ctx.stroke();
    if(isP){ctx.fillStyle='#f1c47d';ctx.beginPath();ctx.moveTo(6,-128);ctx.lineTo(16,-124);ctx.lineTo(5,-105);ctx.closePath();ctx.fill();rr(ctx,-7,-107,14,9,3,'#25323a','#c8a47a55')}
    else{ctx.strokeStyle='#f3c26b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-17,-126);ctx.lineTo(-3,-111);ctx.lineTo(16,-129);ctx.stroke();}
    // belt
    ctx.fillStyle='#171c22';ctx.fillRect(-21,-79,42,8);ctx.fillStyle=trim;ctx.fillRect(-3,-79,8,8);
    // front arm + glove/fist
    segment(19,-119,frontArm[0],frontArm[1],18,shirt);segment(frontArm[0],frontArm[1],frontHand[0],frontHand[1],14,skin);
    ctx.fillStyle=skinLight;ctx.beginPath();ctx.ellipse(frontHand[0],frontHand[1],11,10,-.14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff25';ctx.beginPath();ctx.ellipse(frontHand[0]-2,frontHand[1]-3,5,2,-.3,0,Math.PI*2);ctx.fill();
    // neck and realistic head profile, nose points toward opponent
    ctx.fillStyle=skin;ctx.fillRect(-7,-142,15,19);const hg=ctx.createLinearGradient(-16,-190,15,-143);hg.addColorStop(0,skinLight);hg.addColorStop(.72,skin);hg.addColorStop(1,isP?'#87553f':'#9e674d');ctx.fillStyle=hg;ctx.beginPath();ctx.moveTo(1,-190);ctx.quadraticCurveTo(22,-188,19,-169);ctx.lineTo(25,-161);ctx.quadraticCurveTo(27,-157,19,-155);ctx.lineTo(17,-147);ctx.quadraticCurveTo(8,-137,-7,-146);ctx.quadraticCurveTo(-19,-155,-17,-170);ctx.quadraticCurveTo(-17,-185,1,-190);ctx.fill();
    // ear, brow, eye, nose highlight and jaw
    ctx.fillStyle=skinLight;ctx.beginPath();ctx.ellipse(-13,-164,5,7,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#895840';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(-13,-164,2,Math.PI*1.2,Math.PI*1.8);ctx.stroke();
    ctx.fillStyle='#262128';ctx.beginPath();ctx.moveTo(5,-174);ctx.lineTo(15,-172);ctx.lineTo(8,-170);ctx.closePath();ctx.fill();ctx.fillStyle='#18191c';ctx.beginPath();ctx.ellipse(9,-168,2.1,1.3,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#80543e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(23,-159);ctx.lineTo(14,-157);ctx.stroke();
    // hair and brow silhouette
    ctx.fillStyle=isP?'#171a20':'#241b1b';ctx.beginPath();ctx.moveTo(-17,-170);ctx.quadraticCurveTo(-24,-186,-11,-193);ctx.quadraticCurveTo(4,-202,16,-191);ctx.lineTo(20,-178);ctx.lineTo(9,-182);ctx.lineTo(2,-187);ctx.lineTo(-4,-180);ctx.lineTo(-11,-181);ctx.lineTo(-14,-172);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffffff26';ctx.beginPath();ctx.ellipse(4,-187,9,2,-.25,0,Math.PI*2);ctx.fill();
    // facial stubble and fighter-specific detail
    ctx.strokeStyle='#37282266';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(5,-148);ctx.quadraticCurveTo(12,-144,18,-150);ctx.stroke();
    if(!isP){ctx.strokeStyle='#743e36';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-167);ctx.lineTo(-3,-160);ctx.lineTo(-7,-157);ctx.stroke()}
    // top shoulder seams
    ctx.strokeStyle='#ffffff28';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-19,-124);ctx.quadraticCurveTo(-8,-134,1,-130);ctx.stroke();
    // hurt flash overlay
    if(f.flash>0){ctx.globalCompositeOperation='screen';ctx.globalAlpha=Math.min(.38,f.flash*.5);ctx.fillStyle='#ffe1c9';ctx.beginPath();ctx.ellipse(0,-116,35,76,0,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1}
    ctx.restore();
    // block shield shimmer
    if(guard){ctx.save();ctx.globalAlpha=.2+Math.sin(elapsed*18)*.06;ctx.strokeStyle=isP?'#8dcfff':'#ffe19a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.x+f.facing*16,FLOOR-111,51,-1.15,1.15);ctx.stroke();ctx.restore()}
  }

  function updateHud(){
    $('playerHealth').style.width=player.hp+'%';$('enemyHealth').style.width=enemy.hp+'%';
    $('playerHealthText').textContent=Math.ceil(player.hp)+'%';$('enemyHealthText').textContent=Math.ceil(enemy.hp)+'%';
    $('timer').textContent=String(Math.max(0,seconds)).padStart(2,'0').replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
  }
  function showCallout(text,duration=1){callout.textContent=text;callout.classList.add('show');calloutTimer=duration}
  function startGame(){
    clearTimeout(overlayTimeout);overlay.classList.add('hidden');touchControls.classList.remove('controls-hidden');
    player.hp=enemy.hp=100;player.x=292;enemy.x=668;player.state=enemy.state='idle';player.action=enemy.action=0;player.cooldown=enemy.cooldown=0;player.hurt=enemy.hurt=0;player.combo=enemy.combo=0;seconds=99;elapsed=0;aiClock=.7;ended=false;playing=true;sparks=[];held.left=held.right=held.guard=false;overlay.classList.add('hidden');showCallout('استعدّ!',1.15);updateHud();
  }
  function finishGame(winner){
    if(ended)return;ended=true;playing=false;touchControls.classList.add('controls-hidden');showCallout(winner==='player'?'فزت بالجولة!':'انتهى القتال',1.8);
    overlayTimeout=setTimeout(()=>{if(!ended)return;overlay.classList.remove('hidden');$('overlayTitle').textContent=winner==='player'?'بطل الحي!':'حاول مرة أخرى';$('overlayText').textContent=winner==='player'?'هزمت الذئب وأثبتّ أنك الأقوى في الحلبة.':'الذئب كان أقوى هذه المرة — عد إلى الحلبة وانتقم.';startBtn.querySelector('span').textContent='العب مرة أخرى';},1250);
  }
  function attack(f,type){
    if(!playing||f.cooldown>0||f.hurt>0||f.guarding)return;
    f.state=type;f.action=0;f.cooldown=type==='punch'?.52:.82;f.hit=false;f.attackType=type;
    if(soundOn)tone(type==='kick'?125:190,.07,.045);
  }
  function damage(target,attacker,type){
    const blocked=target.guarding;
    const amount=(type==='kick'?17:10)*(blocked?.22:1);
    target.hp=Math.max(0,target.hp-amount);target.flash=.32;target.hurt=blocked?.06:.22;target.state=blocked?'guard':'hurt';target.action=0;
    if(!blocked){target.x+=attacker.facing*(type==='kick'?31:17);shake=type==='kick'?8:4;makeSparks((attacker.x+target.x)/2,FLOOR-104,type==='kick'?8:5);if(soundOn)tone(type==='kick'?76:105,.11,.08);attacker.combo++;attacker.comboTime=1.1;if(attacker===player&&attacker.combo>1)showCallout(attacker.combo+' ضربة!',.55)}
    else{makeSparks(target.x,FLOOR-112,3);if(soundOn)tone(240,.04,.025)}
    updateHud();if(target.hp<=0)finishGame(attacker.side);
  }
  function makeSparks(x,y,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=80+Math.random()*240;sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-50,life:.25+Math.random()*.25,max:.5,size:2+Math.random()*4,color:Math.random()>.35?'#ffd27c':'#ff785b'})}}
  function tone(freq,duration,volume){try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.55),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch(e){}}

  function updateFighter(f,dt){
    f.cooldown=Math.max(0,f.cooldown-dt);f.flash=Math.max(0,f.flash-dt);f.hurt=Math.max(0,f.hurt-dt);f.comboTime-=dt;if(f.comboTime<=0)f.combo=0;f.walk+=dt;f.bob+=dt;
    if(f.state==='punch'||f.state==='kick'){
      f.action+=dt;const duration=f.state==='punch'?.42:.58,hitAt=f.state==='punch'?.16:.24,hitEnd=f.state==='punch'?.25:.37;
      if(!f.hit&&f.action>=hitAt&&f.action<=hitEnd){f.hit=true;const target=f===player?enemy:player;const distance=(target.x-f.x)*f.facing;if(distance>22&&distance<(f.state==='kick'?143:112))damage(target,f,f.state)}
      if(f.action>=duration){f.state='idle';f.action=0}
    }else if(f.hurt<=0&&f.state==='hurt')f.state='idle';
    f.guarding=(f===player?held.guard:f.aiGuard>0);
    if(f.guarding&&f.hurt<=0&&f.state!=='punch'&&f.state!=='kick')f.state='guard';else if(f.state==='guard'&&!f.guarding)f.state='idle';
  }
  function update(dt){
    elapsed+=dt;
    if(calloutTimer>0){calloutTimer-=dt;if(calloutTimer<=0)callout.classList.remove('show')}
    if(!playing){player.bob+=dt;enemy.bob+=dt;return}
    seconds-=dt;if(seconds<=0){seconds=0;finishGame(player.hp>=enemy.hp?'player':'enemy')}
    updateFighter(player,dt);updateFighter(enemy,dt);
    const move=(held.right?1:0)-(held.left?1:0);
    if(player.state!=='punch'&&player.state!=='kick'&&player.hurt<=0){if(move){player.x+=move*225*dt;player.state='walk'}else if(player.state==='walk')player.state='idle'}
    const dist=enemy.x-player.x;player.facing=dist>=0?1:-1;enemy.facing=dist>=0?-1:1;
    // Opponent reads distance, advances, then mixes punches, kicks, and occasional blocks.
    aiClock-=dt;enemy.aiGuard=Math.max(0,enemy.aiGuard-dt);
    if(enemy.state!=='punch'&&enemy.state!=='kick'&&enemy.hurt<=0){
      const gap=Math.abs(dist);
      if(gap>100){enemy.x+=Math.sign(-dist)*132*dt;enemy.state='walk'}else if(enemy.state==='walk')enemy.state='idle';
      if(aiClock<=0){if(gap<132){if(Math.random()<.23){enemy.aiGuard=.38+Math.random()*.34;enemy.state='guard'}else attack(enemy,Math.random()<.62?'punch':'kick');aiClock=.65+Math.random()*.6}else aiClock=.32+Math.random()*.35}
    }
    player.x=Math.max(90,Math.min(870,player.x));enemy.x=Math.max(90,Math.min(870,enemy.x));
    if(Math.abs(enemy.x-player.x)<56){const sign=Math.sign(enemy.x-player.x)||1;player.x-=sign*.7;enemy.x+=sign*.7}
    for(const s of sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=380*dt;s.life-=dt}sparks=sparks.filter(s=>s.life>0);shake=Math.max(0,shake-dt*25);
    updateHud();
  }
  function draw(){
    ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
    drawBackground();
    // atmospheric haze behind the fighters
    const haze=ctx.createRadialGradient(480,380,10,480,380,310);haze.addColorStop(0,'#e6925730');haze.addColorStop(1,'#e6925700');ctx.fillStyle=haze;ctx.fillRect(150,185,660,290);
    drawFighter(player);drawFighter(enemy);
    // foreground rain streaks
    ctx.strokeStyle='#d9dce414';ctx.lineWidth=1;for(let i=0;i<35;i++){let x=(i*89+elapsed*39)%W,y=(i*53+elapsed*117)%390;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y+10);ctx.stroke()}
    for(const s of sparks){ctx.globalAlpha=Math.max(0,s.life/s.max);ctx.fillStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(s.x,s.y,s.size*(.4+s.life/s.max),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.restore();
  }
  function frame(now){const dt=Math.min(.034,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(frame)}

  const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ShiftLeft:'guard',ShiftRight:'guard'};
  window.addEventListener('keydown',e=>{
    const control=keyMap[e.code];if(control){held[control]=true;e.preventDefault()}
    if(e.repeat)return;
    if(e.code==='KeyJ'||e.code==='Space')attack(player,'punch');
    if(e.code==='KeyK')attack(player,'kick');
    if(e.code==='Enter'&&!playing)startGame();
  });
  window.addEventListener('keyup',e=>{const control=keyMap[e.code];if(control){held[control]=false;e.preventDefault()}});
  window.addEventListener('blur',()=>{held.left=held.right=held.guard=false});
  startBtn.addEventListener('click',startGame);
  document.querySelectorAll('[data-control]').forEach(button=>{
    const control=button.dataset.control;
    const down=e=>{e.preventDefault();button.classList.add('pressed');if(control==='punch'||control==='kick')attack(player,control);else held[control]=true};
    const up=e=>{e.preventDefault();button.classList.remove('pressed');if(control==='left'||control==='right'||control==='guard')held[control]=false};
    button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('pointerleave',up);
  });
  $('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').innerHTML=(soundOn?'♫':'♪')+' <span>'+(soundOn?'الصوت يعمل':'الصوت')+'</span>';if(soundOn)tone(330,.12,.04)});
  document.addEventListener('contextmenu',e=>e.preventDefault());
  updateHud();requestAnimationFrame(frame);
})();
