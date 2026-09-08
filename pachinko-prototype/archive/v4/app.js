'use strict';
const $ = id => document.getElementById(id);
const P = PachinkoPhysics;
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
let world = new P.World({random}), running=false, muted=false, speed=1, audioContext;
let spins=0,wins=0,paid=0,st=0,overflow=0,queue=[],tests=[],active=false,preview=false;
let epoch=0,clock=0,waiters=[],trails=false,accumulator=0,lastFrame=null,hitFlash=0,lastBounce=-10;
let rightFlash=0,handleDrag=null;
const canvas=$('board'),c=canvas.getContext('2d');canvas.width=P.WIDTH*2;canvas.height=P.HEIGHT*2;c.scale(2,2);
const detail=$('detail'),dc=detail.getContext('2d');detail.width=850;detail.height=630;
function tone(f=440,d=.1,type='sine',volume=.025){
  if(muted||!audioContext||audioContext.state!=='running')return;
  const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(volume,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+d);
  o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+d);
}
function unlockAudio(){try{if(!audioContext)audioContext=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});}catch{} }
function wait(ms,token){return new Promise((resolve,reject)=>waiters.push({end:clock+ms/1000,token,resolve,reject}));}
function log(text){if(!$('log').dataset.started){$('log').textContent='';$('log').dataset.started=1;}const d=document.createElement('div');d.className='entry';d.textContent=text;$('log').prepend(d);while($('log').children.length>50)$('log').lastChild.remove();}
function render(){
  for(const [id,value] of Object.entries({spins,wins,paid:paid.toLocaleString(),st:st||'—',shots:world.shots,hits:world.hits,overflow}))$(id).textContent=value;
  $('hit-rate').textContent=world.shots?(100*world.hits/world.shots).toFixed(1)+'%':'—';
  $('flight').textContent=`판면 위 ${world.balls.length}개 · 배출 ${world.misses}개`;
  $('stage-entries').textContent=world.stageEntries;
  $('stage-drops').textContent=world.stageCenters;
  $('stage-sides').textContent=world.stageSides;
  $('right-exits').textContent=world.rightExits;
  $('ball-contacts').textContent=world.ballContacts;
  const percent=Math.round(world.power*100);
  $('power-value').textContent=percent+'%';$('power').value=String(percent);
  $('handle').style.setProperty('--angle',(-125+percent*2.5)+'deg');
  $('handle').setAttribute('aria-valuenow',String(percent));
  $('stage-switch').textContent='스테이지 '+(world.stageEnabled?'ON':'OFF');
  $('stage-switch').setAttribute('aria-pressed',String(world.stageEnabled));
  $('mode').textContent=preview?'PREVIEW · 통계 제외':st?'ST · 1 / 15':'NORMAL · 1 / 99';
  $('hold-label').textContent=`보류 ${queue.length} / 4`;
  $('holds').replaceChildren(...Array.from({length:4},(_,i)=>{const n=document.createElement('span');n.className='hold '+(i<queue.length?'blue':'');return n;}));
  $('start').textContent=running?'발사 멈추기':'발사 시작';
  $('status').textContent=preview?'연출 미리보기 · 구슬 진행 잠시 멈춤':running?(world.power===0?'핸들 0% · 발사 대기':active?'발사 중 · 도안 회전':'발사 중 · 구슬 경로를 관찰해 보세요'):(active||queue.length||world.balls.length?'발사 정지 · 남은 구슬과 보류 처리 중':'발사 정지 · 구슬을 관찰해 보세요');
  $('normal').setAttribute('aria-pressed',String(!world.wide));$('wide').setAttribute('aria-pressed',String(world.wide));
}
function reserve(){hitFlash=.3;if(queue.length>=4){overflow++;tone(360,.05,'sine',.014);return;}
  queue.push({roll:random(),cue:random(),drama:random()});tone(810,.12,'triangle',.035);
}
function digits(a,b,d){$('r0').textContent=a;$('r1').textContent=b;$('r2').textContent=d;}
async function play(q,test){
  active=true;preview=!!test;const token=epoch;
  const win=test?test!=='miss':q.roll<(st?1/15:1/99),red=q.cue<(win?.55:.03),reach=win||red||q.drama<.13,revive=test?test==='revive':win&&q.drama<.18;
  const n=1+Math.floor(random()*9);const base=st?1800:queue.length>=2?3000:4400;
  try{
    $('screen').className='screen'+(red?' hot':'');$('ship').style.transform='translateY(0)';$('caption').textContent=red?'강한 통신 신호':'달 궤도 탐색 중';
    for(let i=0;i<22;i++){digits((n+i)%10,(n+i+4)%10,(n+i+7)%10);await wait(base/22,token);}
    digits(n,(n+4)%10,reach?n:(n+3)%10);tone(330,.12);
    if(reach){
      $('caption').textContent='REACH · 착륙 경로 확보';tone(red?880:660,.35,'triangle');await wait(1200,token);
      $('ship').style.transform='translateY(20px) rotate(-12deg)';$('caption').textContent='착륙 시도…';
      for(let i=0;i<5;i++){$('r1').textContent=(n+i+1)%10;tone(260+i*90,.1);await wait(400+i*100,token);}
      if(!win||revive){digits(n,(n+1)%10,n);$('caption').textContent='통신 두절';$('ship').style.transform='translateY(38px) rotate(35deg)';tone(140,.4);await wait(1300,token);}
      if(revive){$('caption').textContent='…신호 재수신!';tone(1100,.5,'triangle');await wait(1000,token);}
      if(win){digits(n,n,n);$('screen').className='screen win';$('ship').style.transform='translateY(-14px)';$('caption').textContent='착륙 성공 · +300';for(const f of [523,659,784,1047]){tone(f,.4,'triangle',.05);await wait(140,token);}await wait(1900,token);}
    }else{await wait(800,token);}
    if(!test){spins++;if(st)st--;if(win){wins++;paid+=300;st=20;log(`#${spins} ${revive?'부활 ':''}대당첨 +300 · ST 20회`);}else if(reach)log(`#${spins} 리치 실패`);}
    else log('미리보기 완료 · '+({miss:'리치 실패',win:'대당첨',revive:'부활 당첨'}[test]));
  }catch(error){if(error!=='reset')throw error;}
  finally{if(token===epoch){active=false;preview=false;$('screen').className='screen';$('caption').textContent=st?'ST · 다음 착륙을 향해':'다음 입상을 기다려요';}}
}
function pump(){if(active)return;if(tests.length){const t=tests.shift();play({cue:0,drama:0},t);}else if(queue.length)play(queue.shift(),null);}
function reset(wide=world.wide,stageEnabled=world.stageEnabled){
  epoch++;for(const w of waiters)w.reject('reset');waiters=[];active=false;preview=false;queue=[];tests=[];
  world=new P.World({wide,stageEnabled,power:world.power,random});spins=wins=paid=st=overflow=0;hitFlash=0;rightFlash=0;accumulator=0;
  $('screen').className='screen';$('ship').style.transform='translateY(0)';$('caption').textContent='새 비교를 시작해 보세요';digits(0,0,0);
  $('log').textContent='';$('log').dataset.started='1';log((wide?'넓은':'일반')+' 헤소 · 비교 기록 초기화');render();draw();
}
$('start').onclick=()=>{unlockAudio();running=!running;world.launchClock=0;render();};
function setPower(value){world.power=Math.max(0,Math.min(100,Number(value)||0))/100;render();}
$('power').oninput=e=>setPower(e.target.value);
$('power-left').onclick=()=>setPower(36);$('power-right').onclick=()=>setPower(90);
$('handle').onpointerdown=e=>{unlockAudio();handleDrag={id:e.pointerId,x:e.clientX,y:e.clientY,power:world.power*100};$('handle').setPointerCapture(e.pointerId);};
$('handle').onpointermove=e=>{if(handleDrag&&handleDrag.id===e.pointerId)setPower(handleDrag.power+(e.clientX-handleDrag.x-(e.clientY-handleDrag.y))*.45);};
$('handle').onpointerup=$('handle').onpointercancel=()=>{handleDrag=null;};
$('handle').onlostpointercapture=()=>{handleDrag=null;};
$('handle').onkeydown=e=>{const deltas={ArrowRight:2,ArrowUp:2,ArrowLeft:-2,ArrowDown:-2};if(e.key in deltas){e.preventDefault();setPower(world.power*100+deltas[e.key]);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();setPower(e.key==='Home'?0:100);}};
$('sound').onclick=()=>{unlockAudio();muted=!muted;$('sound').textContent='소리 '+(muted?'OFF':'ON');};
$('speed').onclick=()=>{speed=speed===1?3:1;$('speed').textContent='전체 속도 ×'+speed;};
$('normal').onclick=()=>{if(world.wide)reset(false);};$('wide').onclick=()=>{if(!world.wide)reset(true);};$('reset').onclick=()=>reset();
$('stage-switch').onclick=()=>reset(world.wide,!world.stageEnabled);
$('trail').onclick=()=>{trails=!trails;$('trail').textContent='구슬 궤적 '+(trails?'ON':'OFF');$('trail').setAttribute('aria-pressed',String(trails));};
for(const b of document.querySelectorAll('[data-test]'))b.onclick=()=>{unlockAudio();if(tests.length>=3)return;tests.push(b.dataset.test);log('미리보기 예약 · '+b.textContent);pump();render();};
function line(points,color,width){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function drawStage(){
  const s=P.stage;
  c.save();
  // Clear side channel with a lit rim; the curve matches the physical tube path.
  c.beginPath();c.moveTo(s.intake.x,s.intake.y);c.bezierCurveTo(124,435,152,456,s.left,P.stageY(s.left)-P.RADIUS);
  c.strokeStyle=world.stageEnabled?'#a1d8e838':'#6a789022';c.lineWidth=20;c.stroke();
  c.strokeStyle=world.stageEnabled?'#daedf7a8':'#6a789055';c.lineWidth=1.4;c.stroke();
  line([[s.intake.x-12,s.intake.y-3],[s.intake.x-12,s.intake.y+7]],'#b8d4df',2);
  line([[s.intake.x+12,s.intake.y-3],[s.intake.x+12,s.intake.y+7]],'#b8d4df',2);
  if(!world.stageEnabled){line([[104,396],[128,396]],'#d4b184',3);c.restore();return;}
  const floor=[];for(let x=s.left;x<=s.right;x+=2)floor.push([x,P.stageY(x)]);
  // Shelf thickness and rear edge give the 2.5D rolling lane a readable depth.
  c.beginPath();floor.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  for(let i=floor.length-1;i>=0;i--)c.lineTo(floor[i][0],floor[i][1]+19);c.closePath();
  const glass=c.createLinearGradient(0,482,0,527);glass.addColorStop(0,'#b6e2ef66');glass.addColorStop(.55,'#638ba846');glass.addColorStop(1,'#c7f2ff18');c.fillStyle=glass;c.fill();
  line(floor.map(([x,y])=>[x,y+19]),'#bee7f594',1.5);
  line(floor.map(([x,y])=>[x,y-10]),'#b6dce453',1);
  const hole=s.hole/2;
  line(floor.filter(([x])=>x<s.center-hole),'#e4f3f7db',2.2);
  line(floor.filter(([x])=>x>s.center+hole),'#e4f3f7db',2.2);
  c.fillStyle='#08121f';c.beginPath();c.ellipse(s.center,P.stageY(s.center)+1,hole,4,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#cfb775';c.lineWidth=1.6;c.stroke();
  line([[s.center-hole,P.stageY(s.center)+3],[s.center-5,519]],'#cae3ed88',1);
  line([[s.center+hole,P.stageY(s.center)+3],[s.center+5,519]],'#cae3ed88',1);
  for(const x of [s.left+7,s.right-7]){c.fillStyle='#d8c396';c.beginPath();c.arc(x,P.stageY(x)+14,2.1,0,7);c.fill();}
  c.font='8px system-ui';c.textAlign='center';c.fillStyle='#d4e8f0';c.fillText('LUNAR STAGE',344,529);
  c.restore();
}
function draw(){
  c.clearRect(0,0,P.WIDTH,P.HEIGHT);
  line(P.rail,'#121f35',14);line(P.rail,'#607994',1.5);
  // The shared outlet points into open space above the LCD. No preset right route.
  c.fillStyle='#bbcdda';c.font='8px system-ui';c.textAlign='center';c.fillText('↗',79,124);
  c.fillStyle='#6c95b7';c.fillText('상단 통과 → 우타',376,171);
  for(const w of P.walls){line([[w[0],w[1]],[w[2],w[3]]],'#122237',7);line([[w[0],w[1]],[w[2],w[3]]],'#aecbdda0',2);}
  // Raised brass shafts and round caps preserve the same collision centres.
  for(const p of P.pins){
    c.beginPath();c.ellipse(p.x+2,p.y+3,p.r+1.7,p.r+.9,.5,0,7);c.fillStyle='#07132085';c.fill();
    line([[p.x+2,p.y+4],[p.x,p.y]],'#8d713c',2.4);
    const brass=c.createRadialGradient(p.x-.9,p.y-1,.3,p.x,p.y,p.r);brass.addColorStop(0,'#fff3ba');brass.addColorStop(.45,'#d5bc76');brass.addColorStop(1,'#745021');
    c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fillStyle=brass;c.fill();
  }
  drawStage();
  const p=world.pocket,l=p.x-p.width/2;
  c.fillStyle='#0b1729';c.fillRect(l,p.y,p.width,21);
  line([[l,p.y],[l,p.y+20],[l+p.width,p.y+20],[l+p.width,p.y]],hitFlash>0?'#9ce9d2':'#d9c78e',3);
  c.fillStyle='#adbed3';c.font='10px system-ui';c.textAlign='center';c.fillText(world.wide?'WIDE START':'START',p.x,p.y+37);
  const gate=P.rightGate,left=gate.x-gate.width/2;
  c.fillStyle=rightFlash>0?'#386e79':'#102338';c.fillRect(left,gate.y,gate.width,20);
  line([[left,gate.y],[left,gate.y+20],[left+gate.width,gate.y+20],[left+gate.width,gate.y]],rightFlash>0?'#8de6d6':'#80b6ce',2);
  c.fillStyle='#a9d0df';c.font='8px system-ui';c.fillText('우타 통과구',gate.x,gate.y+34);
  c.fillStyle='#101c2b';c.fillRect(22,620,492,4);c.fillStyle='#91a4bd';c.font='8px system-ui';c.fillText('OUT',268,634);
  for(const b of world.balls){
    if(trails&&b.trace.length>1)line(b.trace,'#93dafc80',1.5);
    const g=c.createRadialGradient(b.x-1.3,b.y-1.6,.5,b.x,b.y,P.RADIUS);g.addColorStop(0,'#ffffff');g.addColorStop(.35,'#dce8f0');g.addColorStop(.7,'#8199b2');g.addColorStop(1,'#34465f');
    c.beginPath();c.arc(b.x,b.y,P.RADIUS,0,7);c.fillStyle=g;c.fill();
  }
  if(preview){c.fillStyle='#142036';c.fillRect(144,170,280,24);c.fillStyle='#e8ca85';c.font='11px system-ui';c.fillText('연출 미리보기 · 구슬 잠시 멈춤',284,186);}
  dc.clearRect(0,0,detail.width,detail.height);dc.drawImage(canvas,90*2,366*2,340*2,252*2,0,0,detail.width,detail.height);
}
let uiClock=0,traceClock=0;
function frame(timestamp){
  const elapsed=lastFrame===null?0:Math.min((timestamp-lastFrame)/1000,.08);lastFrame=timestamp;
  if(!document.hidden){
    accumulator+=elapsed*speed;
    while(accumulator>=P.STEP){accumulator-=P.STEP;clock+=P.STEP;
      if(!preview){for(const e of world.step(P.STEP,running)){
        if(e.type==='hit')reserve();else if(e.type==='launch')tone(1550,.025,'triangle',.014);
        else if(e.type==='stage-enter')tone(610,.11,'triangle',.02);
        else if(e.type==='stage-center')tone(980,.08,'sine',.018);
        else if(e.type==='right-exit'){rightFlash=.3;tone(520,.09,'triangle',.02);}
        else if(e.type==='ball-contact'&&clock-lastBounce>.035){lastBounce=clock;tone(2600,.022,'sine',.012);}
        else if(e.type==='bounce'&&clock-lastBounce>.045){lastBounce=clock;tone(1800+Math.min(e.strength,500)*2,.025,'sine',.006);}
      }}
      hitFlash=Math.max(0,hitFlash-P.STEP);
      rightFlash=Math.max(0,rightFlash-P.STEP);
    }
    const ready=waiters.filter(w=>clock>=w.end||w.token!==epoch);waiters=waiters.filter(w=>!ready.includes(w));for(const w of ready)w.token===epoch?w.resolve():w.reject('reset');
    pump();traceClock+=elapsed;uiClock+=elapsed;
    if(traceClock>.025){traceClock=0;for(const b of world.balls){b.trace.push([b.x,b.y]);if(b.trace.length>24)b.trace.shift();}}
    if(uiClock>.1){uiClock=0;render();}draw();
  }
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{lastFrame=null;accumulator=0;});
render();draw();requestAnimationFrame(frame);
