(() => {
  'use strict';
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const overlay = $('overlay'), startBtn = $('startBtn'), callout = $('callout'), touchControls = document.querySelector('.touch-controls');
  const W=960,H=540,FLOOR=432, GRAVITY=800, FRICTION=0.85, JUMP_STRENGTH= -350;
  let playing=false, ended=false, seconds=99, last=0, elapsed=0, aiClock=0, calloutTimer=0, shake=0, soundOn=false;
  let audio, sparks=[], particles=[], footDust=[];
  // Physics state
  const playerPhysics = {vx:0, vy:0, onGround:false, fallStart:0};
  const enemyPhysics = {vx:0, vy:0, onGround:false, fallStart:0};
  const held={left:false,right:false,guard:false};
  // Enhanced fighter data with more realistic profiles
  const player=makeFighter('الصقر',292,1,'player'), enemy=makeFighter('الذئب',668,-1,'enemy');
  function makeFighter(name,x,facing,side){return{
    name,x,facing,side,
    hp:100,state:'idle',action:0,cooldown:0,hurt:0,walk:0,bob:0,
    guarding:false,flash:0,aiGuard:0,combo:0,comboTime:0,
    punchPower:1.0, kickPower:1.0, // combat multiplier
    mass:1.0, // physics mass
    footDustTimer:0
  };}
  // Physics integration
  function applyPhysics(f, dt){
    const pf = f.side==='player' ? playerPhysics : enemyPhysics;
    // Gravity
    if(!pf.onGround){
      pf.vy += GRAVITY * dt;
      // Check ground collision
      if(FLOOR - pf.vy*dt - 4 < FLOOR){
        pf.vy = FLOOR - (pf.onGround ? 0 : 4);
        pf.onGround = true;
        pf.vy = 0;
      }
    }else{
      // Friction when standing
      pf.vx *= FRICTION;
      // Foot dust particles
      f.footDustTimer -= dt;
      if(f.footDustTimer<=0 && Math.abs(f.vx)>50){
        makeFootDust(f.x + (f.facing>0?30:-30), FLOOR-4);
        f.footDustTimer = 0.15;
      }
    }
    // Apply velocity
    f.x += pf.vx * dt;
    // Keep in bounds
    f.x = Math.max(90, Math.min(870, f.x));
  }
  function makeFootDust(x,y){for(let i=0;i<3;i++){particles.push({x:x+Math.random()*20-10, y:y+Math.random()*10, vx:(Math.random()-0.5)*100, vy:(Math.random()-0.5)*100, life:0.4+Math.random()*0.3, size:2+Math.random()*3, max:0.5, color:'#c9a96b'})}}
  function updateParticles(dt){
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
  }
  function makeSparks(x,y,n,type='hit'){
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2;
      const s = type==='kick'?70+Math.random()*180:20+Math.random()*80;
      sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,life:.3+Math.random()*0.3,max:.6,size:2+Math.random()*3,color:type==='kick'?'#ff785b':'#ffd27c'});
    }
  }
  function tone(freq,duration,volume){
    try{
      audio=audio||new(window.AudioContext||window.webkitAudioContext)();
      if(audio.state==='suspended')audio.resume();
      const o=audio.createOscillator(),g=audio.createGain();
      o.type='triangle';o.frequency.setValueAtTime(freq,audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.55),audio.currentTime+duration);
      g.gain.setValueAtTime(volume,audio.currentTime);
      g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
      o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
    }catch(e){}}
  // Combat hit detection with physics push
  function damage(target,attacker,type){
    const blocked=target.guarding;
    const baseDmg = type==='kick'?20:12;
    const amount = Math.round(baseDmg * (blocked?.25:1) * (attacker.punchPower+attacker.kickPower)/2);
    target.hp = Math.max(0, target.hp - amount);
    target.flash = .35;
    target.hurt = blocked?.05:.18;
    target.state = blocked?'guard':'hurt';
    target.action = 0;
    // Physics push with mass consideration
    const pushForce = type==='kick'? (blocked? 80:150) : (blocked? 40: 80);
    const direction = attacker.facing * (target.x > attacker.x ? 1 : -1);
    const physicsSide = target.side=== 'player' ? playerPhysics : enemyPhysics;
    physicsSide.vx = direction * pushForce / target.mass;
    // If airborne, give vertical velocity too
    if(!target.guarding && Math.random()>.5){
      const vTarget = target.side==='player'?playerPhysics:enemyPhysics;
      vTarget.vy = -45; // knockup
    }
    // Visual feedback
    shake = type==='kick'?12:6;
    makeSparks((attacker.x+target.x)/2, FLOOR-104, type==='kick'?8:5, type);
    if(soundOn)tone(type==='kick'?85:110,.1,.08);
    attacker.combo++; attacker.comboTime=1.2;
    if(attacker===player&&attacker.combo>1)showCallout(attacker.combo+' ضربة!',.55);
    updateHud();
    if(target.hp<=0)finishGame(attacker.side);
  }
  function updateHUD(){
    $('playerHealth').style.width = player.hp + '%';
    $('enemyHealth').style.width = enemy.hp + '%';
    $('playerHealthText').textContent = Math.ceil(player.hp) + '%';
    $('enemyHealthText').textContent = Math.ceil(enemy.hp) + '%';
    $('timer').textContent = String(Math.max(0,seconds)).padStart(2,'0').replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
  }
  // Show callout/message
  function showCallout(text,duration=1){
    callout.textContent=text;
    callout.classList.add('show');
    calloutTimer=duration;
  }
  // Start game reset
  function startGame(){
    clearTimeout(overlayTimeout);
    overlay.classList.add('hidden');
    touchControls.classList.remove('controls-hidden');
    player.hp = enemy.hp = 100;
    player.x = 292; enemy.x = 668;
    player.state = enemy.state = 'idle';
    player.action = enemy.action = 0;
    player.cooldown = enemy.cooldown = 0;
    player.hurt = enemy.hurt = 0;
    player.combo = enemy.combo = 0;
    seconds = 99; elapsed = 0;
    aiClock = .7; ended = false;
    playing = true;
    sparks = []; particles = []; footDust = [];
    held.left = held.right = held.guard = false;
    overlay.classList.add('hidden');
    showCallout('استعدّ!',1.15);
    updateHUD();
  }
  function finishGame(winner){
    if(ended)return;
    ended = true;
    playing = false;
    touchControls.classList.add('controls-hidden');
    showCallout(winner==='player'?'فزت بالجولة!':'انتهى القتال',1.8);
    overlayTimeout = setTimeout(()=>{if(!ended)return;
      overlay.classList.remove('hidden');
      $('overlayTitle').textContent = winner==='player'?'بطل الحي!':'حاول مرة أخرى';
      $('overlayText').textContent = winner==='player'?'هزمت الذئب وأثبتّ أنك الأقوى في الحلبة.':'الذئب كان أقوى هذه المرة — عد إلى الحلبة وانتقم.';
      startBtn.querySelector('span').textContent = 'العب مرة أخرى';
    },1250);
  }
  // Attack execution with physics
  function attack(f,type){
    if(!playing||f.cooldown>0||f.hurt>0||f.guarding)return;
    f.state=type;
    f.action=0;
    // Set cooldown based on type and power
    f.cooldown = type==='punch'?.55:.88;
    f.hit = false;
    f.attackType = type;
    f.punchPower = type.includes('punch')?1.0:(f.punchPower*.95);
    f.kickPower = type.includes('kick')?1.0:(f.kickPower*.95);
    // Sound
    if(soundOn)tone(type==='kick'?125:190,.07,.05);
  }
  // Block mechanic
  function updateFighter(f,dt){
    const pf = f.side==='player' ? playerPhysics : enemyPhysics;
    // Cooldowns
    f.cooldown = Math.max(0,f.cooldown-dt);
    f.flash = Math.max(0,f.flash-dt);
    f.hurt = Math.max(0,f.hurt-dt);
    f.comboTime -= dt;
    if(f.comboTime<=0)f.combo=0;
    f.walk += dt;
    f.bob += dt;
    // Foot dust while walking on ground
    if(f.state==='walk'&&f.onGround&&pf.vx!==undefined){
      if(f.footDustTimer<=0){makeFootDust(f.x+(f.facing>0?30:-30),FLOOR-4);f.footDustTimer=0.2;}
    }
    // State machine with physics
    if(f.state==='punch'||f.state==='kick'){
      f.action += dt;
      const duration = f.state==='punch'?.45:.6;
      const hitAt = f.state==='punch'?.14:.22;
      const hitEnd = f.state==='punch'?.28:.38;
      if(!f.hit&&f.action>=hitAt&&f.action<=hitEnd){
        f.hit = true;
        const target = f===player?enemy:player;
        const distance = (target.x-f.x)*f.facing;
        // Hit range check with physics-assisted reach
        const reach = f.state==='kick'?130:100;
        if(distance>22&&distance<reach){
          damage(target,f,f.state);
        }
      }
      if(f.action>=duration){
        f.state='idle';
        f.action=0;
        // Reset physics state after attack
        const physicsSide = f.side==='player'?playerPhysics:enemyPhysics;
        physicsSide.vx *= 0.9; // slight slowdown after attack
      }
    }else if(f.hurt<=0&&f.state==='hurt'){
      f.state='idle';
      // Recovery from hurt - gradually regain ground
      const physicsSide = f.side==='player'?playerPhysics:enemyPhysics;
      if(Math.abs(physicsSide.vx)>5)physicsSide.vx *= 0.9;
    }
    // Guard state
    f.guarding = (f===player?held.guard:f.aiGuard>0);
    if(f.guarding&&f.hurt<=0&&f.state!=='punch'&&f.state!=='kick')f.state='guard';
    else if(f.state==='guard'&&!f.guarding)f.state='idle';
    // Apply physics to fighter position
    applyPhysics(f,dt);
  }
  // Game loop update
  function update(dt){
    elapsed += dt;
    if(calloutTimer>0){calloutTimer-=dt;if(calloutTimer<=0)callout.classList.remove('show')}
    if(!playing){
      player.bob += dt; enemy.bob += dt;
      return;
    }
    seconds -= dt;
    if(seconds<=0){
      seconds = 0;
      finishGame(player.hp>=enemy.hp?'player':'enemy');
    }
    // Update both fighters with physics
    updateFighter(player,dt);
    updateFighter(enemy,dt);
    // AI control for enemy
    const move = (held.right?1:0)-(held.left?1:0);
    // Player movement input
    if(player.state!=='punch'&&player.state!=='kick'&&player.hurt<=0){
      if(move){
        player.x += move*225*dt;
        player.state = 'walk';
        player.facing = move>0?1:-1;
      }else if(player.state==='walk'){
        player.state = 'idle';
      }
    }
    // Distance-based facing
    const dist = enemy.x - player.x;
    player.facing = dist>=0?1:-1;
    enemy.facing = dist>=0?-1:1;
    // AI timing
    aiClock -= dt;
    enemy.aiGuard = Math.max(0,enemy.aiGuard-dt);
    // Enemy decision making
    if(enemy.state!=='punch'&&enemy.state!=='kick'&&enemy.hurt<=0){
      const gap = Math.abs(dist);
      if(gap>100){
        // Advance distantly
        enemy.x += Math.sign(-dist)*130*dt;
        enemy.state = 'walk';
        enemy.facing = Math.sign(-dist);
      }else if(enemy.state==='walk'){
        enemy.state = 'idle';
      }
      if(aiClock<=0){
        if(gap<132){
          // Close range: mix of guard, punch, kick
          if(Math.random()<.25){
            enemy.aiGuard = .4+Math.random()*.35;
            enemy.state = 'guard';
          }else{
            attack(enemy,Math.random()<.6?'punch':'kick');
          }
        }else{
          // Far range: advance or long-range attack
          if(Math.random()<.5){
            attack(enemy,'punch');
          }else{
            enemy.x += Math.sign(-dist)*80*dt;
            enemy.state = 'walk';
          }
        }
        aiClock = .5+Math.random()*.4;
      }
    }
    // Update particles and sparks
    for(const s of sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=380*dt;s.life-=dt}sparks=sparks.filter(s=>s.life>0);
    updateParticles(dt);
    shake = Math.max(0,shake-dt*30);
    updateHUD();
  }
  // Render everything
  function draw(){
    ctx.save();
    if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
    drawBackground();
    // Atmospheric haze
    const haze = ctx.createRadialGradient(480,380,10,480,380,310);
    haze.addColorStop(0,'#e6925730');haze.addColorStop(1,'#e6925700');
    ctx.fillStyle=haze;ctx.fillRect(150,185,660,290);
    // Draw ground particles/dust
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(.4+p.life),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
    drawFighter(player);drawFighter(enemy);
    // Foreground rain streaks
    ctx.strokeStyle='#d9dce414';ctx.lineWidth=1;for(let i=0;i<35;i++){
      let x=(i*89+elapsed*39)%W,y=(i*53+elapsed*117)%390;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y+10);ctx.stroke()
    }
    // Draw sparks
    for(const s of sparks){
      ctx.globalAlpha=Math.max(0,s.life/s.max);
      ctx.fillStyle=s.color;
      ctx.shadowColor=s.color;
      ctx.shadowBlur=12;
      ctx.beginPath();ctx.arc(s.x,s.y,s.size*(.4+s.life/s.max),0,Math.PI*2);
      ctx.fill()
    }
    ctx.globalAlpha=1;ctx.shadowBlur=0;
    ctx.restore();
  }
  // Animation frame
  function frame(now){
    const dt = Math.min(.034,(now-last)/1000||0);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  // --- Controls ---
  const keyMap = {ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ShiftLeft:'guard',ShiftRight:'guard'};
  window.addEventListener('keydown',e=>{
    const control = keyMap[e.code];
    if(control){held[control]=true;e.preventDefault()}
    if(e.repeat)return;
    if(e.code==='KeyJ'||e.code==='Space')attack(player,'punch');
    if(e.code==='KeyK')attack(player,'kick');
    if(e.code==='Enter'&&!playing)startGame();
  });
  window.addEventListener('keyup',e=>{
    const control = keyMap[e.code];
    if(control){held[control]=false;e.preventDefault()}
  });
  window.addEventListener('blur',()=>{held.left=held.right=held.guard=false});
  startBtn.addEventListener('click',startGame);
  // Touch controls - make them very clear and prominent
  document.querySelectorAll('[data-control]').forEach(button=>{
    const control = button.dataset.control;
    const down = e=>{
      e.preventDefault();
      button.classList.add('pressed');
      // Visual feedback - button press sound
      if(soundOn)tone(200,.05,.03);
      if(control==='punch'||control==='kick')attack(player,control);
      else held[control]=true;
    };
    const up = e=>{
      e.preventDefault();
      button.classList.remove('pressed');
      if(control==='left'||control==='right'||control==='guard')held[control]=false;
    };
    button.addEventListener('pointerdown',down);
    button.addEventListener('pointerup',up);
    button.addEventListener('pointercancel',up);
    button.addEventListener('pointerleave',up);
  });
  // Sound toggle
  $('soundBtn').addEventListener('click',()=>{
    soundOn = !soundOn;
    $('soundBtn').innerHTML = (soundOn?'♫':'♪')+' <span>'+(soundOn?'الصوت يعمل':'الصوت')+'</span>';
    if(soundOn)tone(330,.12,.04);
  });
  document.addEventListener('contextmenu',e=>e.preventDefault());
  // Initialize
  updateHUD();
  requestAnimationFrame(frame);
})();