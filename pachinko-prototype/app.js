'use strict';
const $ = id => document.getElementById(id);
const P = PachinkoPhysics;
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
let world = new P.World({random}), running=false, muted=false, speed=1, audioContext;
let spins=0,wins=0,paid=0,st=0,overflow=0,queue=[],tests=[],active=false,preview=false;
let epoch=0,clock=0,waiters=[],trails=false,accumulator=0,lastFrame=null,hitFlash=0;
let rightFlash=0,powerHold=null;
let soundscape=null,mechanicalLevel=.45,cueLevel=.6;
const lcd=$('screen');for(const [key,value] of Object.entries({left:P.screen.x/P.WIDTH,top:P.screen.y/P.HEIGHT,width:P.screen.width/P.WIDTH,height:P.screen.height/P.HEIGHT}))lcd.style[key]=(value*100)+'%';
const canvas=$('board'),c=canvas.getContext('2d');canvas.width=P.WIDTH*2;canvas.height=P.HEIGHT*2;c.scale(2,2);
function tone(f=440,d=.1,type='sine',volume=.025){
  if(!muted)soundscape?.tone(f,d,type,volume);
}
function unlockAudio(){try{if(!audioContext)audioContext=new(window.AudioContext||window.webkitAudioContext)();if(!soundscape){soundscape=new PachinkoSound(audioContext);soundscape.setLevels(mechanicalLevel,cueLevel);soundscape.mute(muted);}audioContext.resume().catch(()=>{});}catch{} }
function wait(ms,token){return new Promise((resolve,reject)=>waiters.push({end:clock+ms/1000,token,resolve,reject}));}
const eventLog=[];
function log(text){eventLog.push(text);if(eventLog.length>50)eventLog.shift();}
function render(){
  for(const [id,value] of Object.entries({spins,wins,paid:paid.toLocaleString(),st:st||'—'}))$(id).textContent=value;
  const percent=Math.round(world.power*200)/2;
  $('power-value').textContent=percent.toFixed(1)+'%';
  $('handle').style.setProperty('--angle',(-125+percent*2.5)+'deg');
  $('handle').setAttribute('aria-valuenow',String(percent));
  $('mode').textContent=preview?'PREVIEW · 통계 제외':st?'ST · 1 / 15':'NORMAL · 1 / 99';
  $('hold-label').textContent=`보류 ${queue.length} / 4`;
  $('holds').replaceChildren(...Array.from({length:4},(_,i)=>{const n=document.createElement('span');n.className='hold '+(i<queue.length?'blue':'');return n;}));
  $('start').textContent=running?'발사 정지':'발사 시작';
  $('start').setAttribute('aria-pressed',String(running));
}
function reserve(){hitFlash=.3;if(queue.length>=4){overflow++;tone(360,.05,'sine',.014);return;}
  queue.push({roll:random(),cue:random(),drama:random()});soundscape?.play('pocket');tone(810,.12,'triangle',.018);
}
function stopReel(index,value){const el=$('r'+index);el.className='reel stopped';el.textContent=String(value);}
function digits(a,b,d){[a,b,d].forEach((value,index)=>stopReel(index,value));}
function startReel(index,slow=false){
  const el=$('r'+index),track=document.createElement('span');track.className='reel-track';track.style.animationDuration=(slow?.85:.30)/speed+'s';
  for(let i=0;i<20;i++){const digit=document.createElement('span');digit.className='reel-digit';digit.textContent=String((i+index*3)%10);track.appendChild(digit);}
  el.className='reel rolling';el.replaceChildren(track);
}
async function play(q,test){
  active=true;preview=!!test;const token=epoch;
  const win=test?test!=='miss':q.roll<(st?1/15:1/99),red=q.cue<(win?.55:.03),reach=win||red||q.drama<.13,revive=test?test==='revive':win&&q.drama<.18;
  const n=1+Math.floor(random()*9);const base=st?1500:queue.length>=2?2900:4300;
  try{
    $('screen').className='screen'+(red?' hot':'');$('ship').style.transform='translateY(0)';$('caption').textContent=red?'강한 통신 신호':'달 궤도 탐색 중';
    [0,1,2].forEach(i=>startReel(i));await wait(base,token);
    stopReel(0,n);tone(330,.055,'triangle',.016);await wait(300,token);
    stopReel(2,reach?n:(n+3)%10);tone(390,.055,'triangle',.016);await wait(450,token);
    if(reach){
      $('caption').textContent='REACH · 착륙 경로 확보';tone(red?880:660,.35,'triangle');await wait(1200,token);
      $('ship').style.transform='translateY(20px) rotate(-12deg)';$('caption').textContent='착륙 시도…';
      startReel(1,true);for(let i=0;i<5;i++){tone(260+i*90,.1);await wait(400+i*100,token);}
      if(!win||revive){digits(n,(n+1)%10,n);$('caption').textContent='통신 두절';$('ship').style.transform='translateY(38px) rotate(35deg)';tone(140,.4);await wait(1300,token);}
      if(revive){$('caption').textContent='…신호 재수신!';tone(1100,.5,'triangle');await wait(1000,token);}
      if(win){digits(n,n,n);$('screen').className='screen win';$('ship').style.transform='translateY(-14px)';$('caption').textContent='착륙 성공 · +300';for(const f of [523,659,784,1047]){tone(f,.4,'triangle',.05);await wait(140,token);}await wait(1900,token);}
    }else{stopReel(1,(n+4)%10);tone(270,.055,'triangle',.014);await wait(700,token);}
    if(!test){spins++;if(st)st--;if(win){wins++;paid+=300;st=20;log(`#${spins} ${revive?'부활 ':''}대당첨 +300 · ST 20회`);}else if(reach)log(`#${spins} 리치 실패`);}
    else log('미리보기 완료 · '+({miss:'리치 실패',win:'대당첨',revive:'부활 당첨'}[test]));
  }catch(error){if(error!=='reset')throw error;}
  finally{if(token===epoch){active=false;preview=false;$('screen').className='screen';$('caption').textContent=st?'ST · 다음 착륙을 향해':'READY';}}
}
function pump(){if(active)return;if(tests.length){const t=tests.shift();play({cue:0,drama:0},t);}else if(queue.length)play(queue.shift(),null);}
function reset(wide=world.wide,stageEnabled=world.stageEnabled){
  epoch++;for(const w of waiters)w.reject('reset');waiters=[];active=false;preview=false;queue=[];tests=[];
  world=new P.World({wide,stageEnabled,power:world.power,random});spins=wins=paid=st=overflow=0;hitFlash=0;rightFlash=0;accumulator=0;
  $('screen').className='screen';$('ship').style.transform='translateY(0)';$('caption').textContent='READY';digits(0,0,0);
  stopPowerHold();eventLog.length=0;render();draw();
}
$('start').onclick=()=>{unlockAudio();running=!running;world.launchClock=0;render();};
function setPower(value){world.power=Math.round(Math.max(0,Math.min(100,Number(value)||0))*2)/200;render();}
function stopPowerHold(){powerHold=null;}
function updatePowerHold(elapsed){
  if(!powerHold)return;powerHold.elapsed+=elapsed;
  while(powerHold&&powerHold.elapsed>=powerHold.next){
    setPower(world.power*100+powerHold.direction*(powerHold.elapsed>1.3?2:.5));powerHold.next+=.07;
  }
}
for(const [id,direction] of [['power-minus',-1],['power-plus',1]]){
  const button=$(id);
  button.onpointerdown=e=>{
    if(e.button!==0||powerHold)return;e.preventDefault();unlockAudio();button.focus();
    powerHold={id:e.pointerId,direction,elapsed:0,next:.35};button.setPointerCapture(e.pointerId);setPower(world.power*100+direction*.5);
  };
  button.onpointerup=button.onpointercancel=button.onlostpointercapture=e=>{if(powerHold?.id===e.pointerId)stopPowerHold();};
  button.onclick=e=>{if(!e||e.detail===0){unlockAudio();setPower(world.power*100+direction*.5);}};
  button.oncontextmenu=e=>e.preventDefault();
}
window.addEventListener('blur',stopPowerHold);
$('handle').onkeydown=e=>{const deltas={ArrowRight:.5,ArrowUp:.5,ArrowLeft:-.5,ArrowDown:-.5};if(e.key in deltas){e.preventDefault();setPower(world.power*100+deltas[e.key]);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();setPower(e.key==='Home'?0:100);}};
$('sound').onclick=()=>{unlockAudio();muted=!muted;soundscape?.mute(muted);$('sound').textContent='소리 '+(muted?'OFF':'ON');$('sound').setAttribute('aria-pressed',String(!muted));};
$('speed').onclick=()=>{speed=speed===1?3:1;$('speed').textContent='×'+speed;for(const track of document.querySelectorAll('.reel-track'))track.style.animationDuration=(track.parentElement=== $('r1')&&$('caption').textContent==='착륙 시도…'?.85:.30)/speed+'s';};
$('reset').onclick=()=>reset();
function line(points,color,width){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function drawStage(){
  const s=P.stage;
  c.save();
  // Clear side channel with a lit rim; the curve matches the physical tube path.
  c.beginPath();c.moveTo(s.intake.x,s.intake.y);c.bezierCurveTo(...s.tube[0],...s.tube[1],s.left,P.stageY(s.left)-P.RADIUS);
  c.strokeStyle=world.stageEnabled?'#a1d8e838':'#6a789022';c.lineWidth=20;c.stroke();
  c.strokeStyle=world.stageEnabled?'#daedf7a8':'#6a789055';c.lineWidth=1.4;c.stroke();
  const half=s.intake.width/2;
  line([[s.intake.x-half,s.intake.y-3],[s.intake.x-half,s.intake.y+7]],'#b8d4df',2);
  line([[s.intake.x+half,s.intake.y-3],[s.intake.x+half,s.intake.y+7]],'#b8d4df',2);
  if(!world.stageEnabled){line([[s.intake.x-half,s.intake.y],[s.intake.x+half,s.intake.y]],'#d4b184',3);c.restore();return;}
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

  c.fillStyle='#6c95b7';
  c.beginPath();P.canopy.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineTo(454,290);c.lineTo(454,443);c.lineTo(82,443);c.lineTo(82,290);c.closePath();
  c.rect(P.screen.x,P.screen.y,P.screen.width,P.screen.height);
  const crown=c.createLinearGradient(0,58,0,230);crown.addColorStop(0,'#496178');crown.addColorStop(1,'#182b41');c.fillStyle=crown;c.fill('evenodd');
  for(const curve of [P.outerArc,P.canopy]){line(curve,'#102036',8);line(curve,'#aecbdde0',2);}
  const leaf=P.flapSegment(world.flapAngle);line([[leaf[0],leaf[1]],[leaf[2],leaf[3]]],'#162436',7);line([[leaf[0],leaf[1]],[leaf[2],leaf[3]]],'#d5c389',3);
  c.beginPath();c.arc(P.flap.x,P.flap.y,3.5,0,7);c.fillStyle='#b7c9d1';c.fill();
  for(const w of P.straightWalls){line([[w[0],w[1]],[w[2],w[3]]],'#122237',7);line([[w[0],w[1]],[w[2],w[3]]],'#aecbdda0',2);}
  const guide=P.stageGuide;line([[guide[0],guide[1]],[guide[2],guide[3]]],'#0c2030',6);line([[guide[0],guide[1]],[guide[2],guide[3]]],'#b9dce0',2.4);
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
}
let uiClock=0,traceClock=0;
function frame(timestamp){
  const elapsed=lastFrame===null?0:Math.min((timestamp-lastFrame)/1000,.08);lastFrame=timestamp;
  if(!document.hidden){
    updatePowerHold(elapsed);accumulator+=elapsed*speed;
    while(accumulator>=P.STEP){accumulator-=P.STEP;clock+=P.STEP;
      if(!preview){for(const e of world.step(P.STEP,running)){
        if(e.type==='hit')reserve();else if(e.type==='launch')soundscape?.play('launch');
        else if(e.type==='flap')soundscape?.play('stage',{x:e.x});
        else if(e.type==='stage-enter')soundscape?.play('stage',{x:P.stage.left});
        else if(e.type==='stage-center')soundscape?.play('drop');
        else if(e.type==='right-exit'){rightFlash=.3;soundscape?.play('pocket',{x:P.rightGate.x});}
        else if(e.type==='ball-contact')soundscape?.play('ball',e);
        else if(e.type==='bounce')soundscape?.play('pin',e);
      }}
      hitFlash=Math.max(0,hitFlash-P.STEP);
      rightFlash=Math.max(0,rightFlash-P.STEP);
    }
    const ready=waiters.filter(w=>clock>=w.end||w.token!==epoch);waiters=waiters.filter(w=>!ready.includes(w));for(const w of ready)w.token===epoch?w.resolve():w.reject('reset');
    pump();traceClock+=elapsed;uiClock+=elapsed;
    const rolling=world.balls.filter(b=>b.route==='stage');soundscape?.rolling(preview?0:Math.min(1,rolling.reduce((sum,b)=>sum+Math.abs(b.vx),0)/250));
    if(traceClock>.025){traceClock=0;for(const b of world.balls){b.trace.push([b.x,b.y]);if(b.trace.length>24)b.trace.shift();}}
    if(uiClock>.1){uiClock=0;render();}draw();
  }
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{lastFrame=null;accumulator=0;if(document.hidden){stopPowerHold();soundscape?.rolling(0);}});
render();draw();requestAnimationFrame(frame);
