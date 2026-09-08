'use strict';
const $ = id => document.getElementById(id);
const P = PachinkoPhysics;
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
let world = new P.World({random}), running=false, muted=false, speed=1, audioContext;
let spins=0,wins=0,paid=0,st=0,overflow=0,queue=[],tests=[],active=false,preview=false;
let epoch=0,clock=0,waiters=[],trails=false,accumulator=0,lastFrame=null,hitFlash=0,lastBounce=-10;
const canvas=$('board'),c=canvas.getContext('2d');canvas.width=P.WIDTH*2;canvas.height=P.HEIGHT*2;c.scale(2,2);
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
  $('mode').textContent=preview?'PREVIEW · 통계 제외':st?'ST · 1 / 15':'NORMAL · 1 / 99';
  $('hold-label').textContent=`보류 ${queue.length} / 4`;
  $('holds').replaceChildren(...Array.from({length:4},(_,i)=>{const n=document.createElement('span');n.className='hold '+(i<queue.length?'blue':'');return n;}));
  $('start').textContent=running?'발사 멈추기':'발사 시작';
  $('status').textContent=preview?'연출 미리보기 · 구슬 진행 잠시 멈춤':running?(active?'발사 중 · 도안 회전':'발사 중 · 헤소 입상을 기다려요'):(active||queue.length||world.balls.length?'발사 정지 · 남은 구슬과 보류 처리 중':'발사 정지 · 구슬을 관찰해 보세요');
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
function reset(wide=world.wide){
  epoch++;for(const w of waiters)w.reject('reset');waiters=[];active=false;preview=false;queue=[];tests=[];
  world=new P.World({wide,random});spins=wins=paid=st=overflow=0;hitFlash=0;accumulator=0;
  $('screen').className='screen';$('ship').style.transform='translateY(0)';$('caption').textContent='새 비교를 시작해 보세요';digits(0,0,0);
  $('log').textContent='';$('log').dataset.started='1';log((wide?'넓은':'일반')+' 헤소 · 비교 기록 초기화');render();draw();
}
$('start').onclick=()=>{unlockAudio();running=!running;world.launchClock=0;render();};
$('sound').onclick=()=>{unlockAudio();muted=!muted;$('sound').textContent='소리 '+(muted?'OFF':'ON');};
$('speed').onclick=()=>{speed=speed===1?3:1;$('speed').textContent='전체 속도 ×'+speed;};
$('normal').onclick=()=>{if(world.wide)reset(false);};$('wide').onclick=()=>{if(!world.wide)reset(true);};$('reset').onclick=()=>reset();
$('trail').onclick=()=>{trails=!trails;$('trail').textContent='구슬 궤적 '+(trails?'ON':'OFF');$('trail').setAttribute('aria-pressed',String(trails));};
for(const b of document.querySelectorAll('[data-test]'))b.onclick=()=>{unlockAudio();if(tests.length>=3)return;tests.push(b.dataset.test);log('미리보기 예약 · '+b.textContent);pump();render();};
function line(points,color,width){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function draw(){
  c.clearRect(0,0,P.WIDTH,P.HEIGHT);
  line(P.rail,'#121f35',14);line(P.rail,'#607994',1.5);
  for(const w of P.walls)line([[w[0],w[1]],[w[2],w[3]]],'#91b7d17a',3);
  for(const p of P.pins){c.beginPath();c.arc(p.x+1,p.y+2,p.r+1,0,7);c.fillStyle='#091429';c.fill();c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fillStyle='#ccb987';c.fill();c.fillStyle='#fff1c1';c.fillRect(p.x-1,p.y-1,1.5,1.5);}
  const p=world.pocket,l=p.x-p.width/2;
  c.fillStyle='#0b1729';c.fillRect(l,p.y,p.width,21);
  line([[l,p.y],[l,p.y+20],[l+p.width,p.y+20],[l+p.width,p.y]],hitFlash>0?'#9ce9d2':'#d9c78e',3);
  c.fillStyle='#adbed3';c.font='10px system-ui';c.textAlign='center';c.fillText(world.wide?'WIDE START':'START',p.x,p.y+37);
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
    accumulator+=elapsed*speed;
    while(accumulator>=P.STEP){accumulator-=P.STEP;clock+=P.STEP;
      if(!preview){for(const e of world.step(P.STEP,running)){
        if(e.type==='hit')reserve();else if(e.type==='launch')tone(1550,.025,'triangle',.014);
        else if(e.type==='bounce'&&clock-lastBounce>.045){lastBounce=clock;tone(1800+Math.min(e.strength,500)*2,.025,'sine',.006);}
      }}
      hitFlash=Math.max(0,hitFlash-P.STEP);
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
