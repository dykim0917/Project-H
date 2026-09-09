'use strict';
const $=id=>document.getElementById(id),P=PachinkoMark4;
const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
let world=new P.World({random}),running=false,muted=false,powerHold=null,audioContext,soundscape=null;
const canvas=$('board'),c=canvas.getContext('2d');canvas.width=P.WIDTH*2;canvas.height=P.HEIGHT*2;c.scale(2,2);
function audio(){try{if(!audioContext)audioContext=new(window.AudioContext||window.webkitAudioContext)();if(!soundscape){soundscape=new PachinkoRushSound(audioContext);soundscape.setLevels(.55,.5);soundscape.mute(muted);}audioContext.resume().catch(()=>{});}catch{}}
function tone(f,d=.1,type='sine',volume=.025){if(!muted)soundscape?.tone(f,d,type,volume);}
function render(){
 for(const [id,v]of Object.entries({starts:world.game.spins,wins:world.winCount,paid:world.paid.toLocaleString(),round:world.game.queue+'/4'}))$(id).textContent=v;
 $('aim').textContent=world.autoAim?'전환 자동':'전환 수동';$('aim').setAttribute('aria-pressed',String(world.autoAim));
 const percent=(world.power*100).toFixed(1);$('power-value').textContent=percent+'%';$('handle').style.setProperty('--angle',(-125+world.power*250)+'deg');$('handle').setAttribute('aria-valuenow',percent);
 $('start').textContent=running?'발사 정지':'발사 시작';$('start').setAttribute('aria-pressed',String(running));
 const state=(world.game.demo?'체험 · ':'')+({idle:running?'PLAY':'READY',spin:'SPIN',reach:'REACH',payout:world.game.roundNo+'/5R · '+world.game.roundCount+'/4 IN',result:world.game.win?'JACKPOT':'NEXT',unlock:'UNLOCK',opening:'CHAMBER OPEN',rush:'RELEASE · '+world.game.chain+'연짱', 'rush-pay':world.game.roundNo+'/5R · '+world.game.roundCount+'/4 IN',charge:'구슬 충전 '+world.game.loaded+'/3',closing:'RUSH END'}[world.game.phase]);
 const aim=world.game.rightNeeded?' · 우타 ▶':' · ◀ 좌타';
 if($('mode').textContent!==state+aim)$('mode').textContent=state+aim;
}
function setPower(value){world.setManualPower(Math.round(Math.max(0,Math.min(100,Number(value)||0))*2)/200);render();}
function stopPowerHold(){powerHold=null;}
function updatePowerHold(dt){if(!powerHold)return;powerHold.elapsed+=dt;while(powerHold&&powerHold.elapsed>=powerHold.next){setPower(world.power*100+powerHold.direction*(powerHold.elapsed>1.3?2:.5));powerHold.next+=.07;}}
$('aim').onclick=()=>{stopPowerHold();world.autoAim=!world.autoAim;world.updateAim();render();};
$('start').onclick=()=>{audio();running=!running;world.launchClock=0;render();};
$('sound').onclick=()=>{audio();muted=!muted;soundscape?.mute(muted);$('sound').textContent='소리 '+(muted?'OFF':'ON');$('sound').setAttribute('aria-pressed',String(!muted));};
$('reset').onclick=()=>{stopPowerHold();world=new P.World({random});accumulator=0;soundscape?.rolling(0);soundscape?.motion(0,false);render();draw();};
$('demo').onclick=()=>{audio();stopPowerHold();world=new P.World({random});world.game.demo=true;const events=[];world.game.startJackpot(events);running=true;world.updateAim();accumulator=0;soundscape?.motion(0,false);sounds(events);render();draw();};
for(const[id,direction]of[['power-minus',-1],['power-plus',1]]){const button=$(id);button.onpointerdown=e=>{if(e.button!==0||powerHold)return;e.preventDefault();audio();button.focus();powerHold={id:e.pointerId,direction,elapsed:0,next:.35};button.setPointerCapture(e.pointerId);setPower(world.power*100+direction*.5);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=e=>{if(powerHold?.id===e.pointerId)stopPowerHold();};button.onclick=e=>{if(!e||e.detail===0){audio();setPower(world.power*100+direction*.5);}};button.oncontextmenu=e=>e.preventDefault();}
$('handle').onkeydown=e=>{const d={ArrowLeft:-.5,ArrowDown:-.5,ArrowRight:.5,ArrowUp:.5};if(e.key in d){e.preventDefault();setPower(world.power*100+d[e.key]);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();setPower(e.key==='Home'?0:100);}};
window.addEventListener('blur',stopPowerHold);
function path(points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function circle(x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function label(text,x,y,size=11,color='#6b4d34'){c.fillStyle=color;c.font=`600 ${size}px system-ui`;c.textAlign='center';c.fillText(text,x,y);}
function star(x,y,r,color){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;i?c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=color;c.fill();}
function bulb(x,y,lit){if(lit){const g=c.createRadialGradient(x,y,2,x,y,15);g.addColorStop(0,'#ffdf8baa');g.addColorStop(1,'#ffc26400');circle(x,y,15,g);}circle(x,y,6.4,lit?'#d4a055':'#a58d66','#f0dfb8');circle(x,y,4.2,lit?'#ffe8a7':'#c9b591');circle(x-1.2,y-1.5,1.5,lit?'#fffbed':'#e8dabe');}
function digit(n,x,y){const maps=[63,6,91,79,102,109,125,7,127,111],bits=maps[n],segments=[[[3,0],[15,0]],[[18,3],[18,13]],[[18,19],[18,29]],[[3,32],[15,32]],[[0,19],[0,29]],[[0,3],[0,13]],[[3,16],[15,16]]];c.save();c.translate(x,y);segments.forEach((s,i)=>path(s,bits&(1<<i)?'#e9794f':'#3e2a24',3));c.restore();}
function drawWing(side){const w=P.wing(side,world.wingOpen),[x,y,tx,ty]=w,dx=tx-x,dy=ty-y,l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l;
 c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.lineTo(tx+nx*side*12,ty+ny*side*12);c.lineTo(x+nx*side*8,y+ny*side*8);c.closePath();const g=c.createLinearGradient(x,y,tx,ty);g.addColorStop(0,'#8f4936');g.addColorStop(1,'#c77d58');c.fillStyle=g;c.fill();path([[x,y],[tx,ty]],'#f0d394',3);path([[x+nx*side*5,y+ny*side*5],[tx+nx*side*7,ty+ny*side*7]],'#e5b37a',1);circle(x,y,8,'#c5a468','#654631');circle(x,y,3,'#786042');
 // Connecting rod follows the same hinge motion.
 path([[x+side*11,351],[x+dx*.3,y+dy*.3]],'#9b835f',4);circle(x+side*11,351,4,'#d5be8c');}
function drawRush(g){
 if(g.transform<=0)return;
 const t=g.transform;c.save();c.globalAlpha=t;
 c.fillStyle='#142e3a';c.beginPath();c.roundRect(190,289,156,166,15);c.fill();
 path([[203,301],[203,450],[333,450],[333,301]],'#91b9bf',3);
 label(g.chain+' CHAIN',268,281,15,'#285c6d');
 // Three clear storage tubes open separately; a common chute carries each capsule.
 for(let i=0;i<3;i++){
  const x=230+i*38,b=g.rushBalls[i],released=b?.released;
  c.fillStyle='#a3d3dc22';c.fillRect(x-11,301,22,35);
  path([[x-11,301],[x-11,332],[x+11,332],[x+11,301]],'#badbe0',2);
  path([[x-10,332],[x+(released?15:10),332+(released?10:0)]],released?'#d9a34e':'#efc47c',3);
  path([[x,338],[268,376]],'#7eabb5',3);
  if(!b&&i<g.loaded)circle(x,314,5.2,'#e4f5f7','#7cabb5');
  bulb(x,295,!!b?.success);
 }
 path([[268,376],[209,439]],'#647f88',10);path([[268,376],[327,439]],'#438e85',10);
 path([[268,376],[209,439]],'#bccfd1',2);path([[268,376],[327,439]],'#b4edd0',2);
 const active=g.rushBalls.find(b=>b.released&&!b.resolved);
 const gateAngle=active?(active.end<Math.PI*2*P.BALANCE.rushBallChance?-.52:.52):Math.sin(world.time*5)*.25;
 c.save();c.translate(268,376);c.rotate(gateAngle);path([[-15,0],[15,0]],'#e2af60',5);circle(0,0,5,'#f5daa1','#6c5a3c');c.restore();
 for(const [x,color,word]of [[210,'#82949f','OUT'],[326,'#9ce3bb','KEEP']]){c.fillStyle='#193540';c.fillRect(x-19,426,38,21);path([[x-19,426],[x-19,447],[x+19,447],[x+19,426]],color,2);label(word,x,458,8,color);}
 g.rushBalls.forEach((b,i)=>{const p=P.capsulePose(b,i,g.time);circle(p.x,p.y,5.2,b.resolved?(b.success?'#ffdfa0':'#78929f'):'#f0fbff','#acd3d9');});
 c.restore();
}
function draw(){
 c.clearRect(0,0,P.WIDTH,P.HEIGHT);
 const paper=c.createLinearGradient(0,30,0,635);paper.addColorStop(0,'#e1ece9');paper.addColorStop(.6,'#bcd2d0');paper.addColorStop(1,'#83a9b2');c.fillStyle=paper;c.fillRect(0,0,P.WIDTH,P.HEIGHT);
 c.save();c.globalAlpha=.14;for(let y=100;y<620;y+=32)for(let x=35;x<510;x+=32)circle(x+(y%64?16:0),y,.65,'#94774d');c.restore();
 path(P.outerArc,'#8c6744',11);path(P.outerArc,'#efe2c4',6);path(P.outerArc,'#ab956f',1.5);
 path(P.rail,'#675940',13);path(P.rail,'#ddd5b9',9);path(P.rail,'#8e8a74',1.4);
 label('황동 구슬공방',268,77,24,'#285365');label('B R A S S W O R K S   ·   M K . I V',268,97,8,'#8f7353');star(173,70,9,'#aa6346');star(363,70,9,'#aa6346');
 path(P.counterHood,'#aa8654',3);c.fillStyle='#654730';c.fillRect(208,124,120,52);c.fillStyle='#271e1c';c.fillRect(214,129,108,42);const value=world.game.digits;value.forEach((n,i)=>digit(n,225+i*30,134));
 for(let i=0;i<4;i++)circle(247+i*14,188,4,i<world.game.queue?'#ffe39c':'#8d8069','#c6ac78');
 label('1 / '+P.BALANCE.winDenominator,268,213,10,'#826044');
 for(let i=0;i<16;i++){const a=-Math.PI/2+i*Math.PI*2/16,x=268+121*Math.cos(a),y=355+146*Math.sin(a);const lit=world.mode==='bonus'?((Math.floor(world.time*6)+i)%4<2||world.flash>0):world.game.phase==='reach'&&i%4===Math.floor(world.time*8)%4;bulb(x,y,lit);}
 for(const s of P.bodyWalls){path([[s[0],s[1]],[s[2],s[3]]],'#ac9164',4);path([[s[0],s[1]],[s[2],s[3]]],'#f2e5c8',1.3);}
 c.beginPath();P.hood.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();const hood=c.createLinearGradient(0,228,0,274);hood.addColorStop(0,'#528693');hood.addColorStop(1,'#285568');c.fillStyle=hood;c.fill();path(P.hood,'#e7c58b',3);star(268,254,14,'#efd6a1');
 for(const p of P.pins){circle(p.x+1.4,p.y+2.3,p.r+1,'#8b775e55');const g=c.createRadialGradient(p.x-.8,p.y-1,.2,p.x,p.y,p.r);g.addColorStop(0,'#fff2bd');g.addColorStop(.5,'#ba9452');g.addColorStop(1,'#765730');circle(p.x,p.y,p.r,g);}
 // Brass rails cover the closed wing colliders; the wheel is an enclosed display mechanism.
 drawWing(-1);drawWing(1);
 const g=world.game,active=g.phase==='reach',won=['payout','rush-pay'].includes(g.phase);
 c.fillStyle='#263d3b';c.fillRect(222,326,92,140);
 path([[228,328],[228,460],[308,460],[308,328]],'#b69861',2);
 drawRush(g);
 // Closed pressure chambers slide outward to reveal the capsule sorter.
 for(const side of [-1,1]){
  c.save();c.translate(side*g.transform*87,0);c.globalAlpha=1-g.transform*.8;
  c.fillStyle='#31677a';c.beginPath();c.roundRect(side<0?198:269,290,69,165,12);c.fill();
  const x=268+side*35;
  path([[x-22,304],[x-22,439],[x+22,439],[x+22,304]],'#a5c7c9',2);
  c.fillStyle='#112c38';c.fillRect(x-14,325,28,98);
  const pressure=active ? .25+.65*(1-Math.pow(1-Math.min(1,g.time/5.8),2)):won?1:.2+.08*Math.sin(world.time*2);
  c.fillStyle=won?'#ffcf78':'#78bfb9';c.fillRect(x-11,420-pressure*89,22,pressure*89);
  for(let y=335;y<420;y+=14)path([[x-12,y],[x+12,y]],'#bedfe066',1);
  const piston=420-pressure*89;path([[x,306],[x,piston]],'#dbc296',5);path([[x-15,piston],[x+15,piston]],'#fff0c6',6);
  circle(x,307,9,'#17333e','#caaf7e');path([[x,307],[x+Math.cos(g.angle+side)*6,307+Math.sin(g.angle+side)*6]],'#f3d59f',2);
  c.restore();
 }
 if(g.transform<.5)label(active?'PRESSURE RISING':won?'CHARGED':'TWIN CHAMBER',268,280,10,'#315b69');
 const opening=g.door*35;
 for(const side of [-1,1]){c.fillStyle='#b77850';c.fillRect(268+side*opening+(side<0?-40:0),438,40,24);path([[268+side*opening,439],[268+side*opening,461]],'#f4d594',2);}
 if(won){
  label('+'+g.payout,268,430,13,'#fff0b9');

 }
 const at=P.ATTACKER,open=g.accepting;
 c.fillStyle=open?'#102d35':'#426875';c.fillRect(at.x-at.width/2,at.y,at.width,23);
 path([[at.x-at.width/2,at.y],[at.x-at.width/2,at.y+23],[at.x+at.width/2,at.y+23],[at.x+at.width/2,at.y]],'#f3cc87',2);
 path([[at.x-at.width/2,at.y],[at.x+at.width/2,at.y+(open?21:0)]],open?'#8ff0c1':'#d5ae73',4);
 label(open?(g.phase==='charge'?'LOAD '+g.loaded+'/3':g.roundNo+'R '+g.roundCount+'/4'):'ATTACKER',at.x,at.y-9,9,'#224853');
 for(const p of P.starters){c.fillStyle='#69513a';c.fillRect(p.x-p.width/2,p.y,p.width,20);path([[p.x-p.width/2,p.y],[p.x-p.width/2,p.y+20],[p.x+p.width/2,p.y+20],[p.x+p.width/2,p.y]],'#f0d49b',2);label('START',p.x,p.y+34,8);}
 label('OUT',268,626,8,'#89704d');path([[35,631],[501,631]],'#aa8d60',3);
 // A shallow collection tray belongs to the cabinet, outside the playing area.
 c.fillStyle='#675440';c.beginPath();c.roundRect(151,650,234,27,10);c.fill();path([[160,650],[376,650]],'#e6cb9d',3);for(const b of [...world.tray.settled,...world.tray.balls])circle(b.x,b.y,3.8,'#d7ded9','#f1f2e4');
 for(const b of world.balls){const g=c.createRadialGradient(b.x-1.2,b.y-1.6,.25,b.x,b.y,P.RADIUS);g.addColorStop(0,'#ffffff');g.addColorStop(.36,'#e0e5dc');g.addColorStop(.74,'#8b9995');g.addColorStop(1,'#4e6263');circle(b.x,b.y,P.RADIUS,g);}
}
let lastFrame=null,accumulator=0,uiClock=0,lastBell=-1,lastTooth=null;
function sounds(events){for(const e of events){if(e.type==='launch')soundscape?.play('launch');else if(e.type==='bounce')soundscape?.play('pin',e);else if(['wing','hold','capture'].includes(e.type))soundscape?.play('stage',e);else if(['drop','release'].includes(e.type))soundscape?.play('drop');else if(['attacker-in','capsule-load'].includes(e.type)){soundscape?.play('pocket');tone(820,.07,'triangle',.02);}else if(e.type==='capsule-release'){soundscape?.latch();tone(350+e.slot*130,.08,'triangle',.02);}else if(e.type==='reach'){tone(660,.4,'triangle',.025);tone(990,.5,'sine',.015);}else if(e.type==='miss')tone(220,.16,'triangle',.01);else if(e.type==='tray-hit')soundscape?.impact(e);else if(e.type==='unlock')soundscape?.latch();else if(e.type==='rush-hit'){tone(1175,.25,'sine',.04);tone(1568,.35,'sine',.025);}else if(e.type==='rush-miss')soundscape?.play('drop');else if(e.type==='start'){soundscape?.play('pocket');tone(720,.08,'triangle',.012);}else if(e.type==='payout-start'||(e.type==='win'&&world.game.phase!=='unlock')){tone(523,.7,'triangle',.05);tone(659,.8,'sine',.035);tone(784,.9,'sine',.035);}else if(e.type==='round')tone(880,.25,'triangle',.025);else if(e.type==='bonus-end')tone(260,.4,'triangle',.018);}}
function frame(timestamp){const elapsed=lastFrame===null?0:Math.min((timestamp-lastFrame)/1000,.08);lastFrame=timestamp;
 if(!document.hidden){updatePowerHold(elapsed);accumulator+=elapsed;while(accumulator>=P.STEP){accumulator-=P.STEP;sounds(world.step(P.STEP,running));}
  const tooth=Math.floor(world.game.angle/(Math.PI*2/9));if(world.game.phase==='reach'&&tooth!==lastTooth){tone(1050,.025,'square',.006);lastTooth=tooth;}
  const bell=Math.floor(world.time*2);if(world.mode==='bonus'&&bell!==lastBell){lastBell=bell;tone([523,659,784,659][bell%4],.13,'triangle',.013);}
  soundscape?.motion(Math.min(1,world.tray.balls.length/12),['opening','closing'].includes(world.game.phase));
  soundscape?.setLevels(world.game.phase==='unlock'?.12:.65,.5);
  soundscape?.rolling(Math.min(1,world.balls.filter(b=>b.route==='shelf').reduce((s,b)=>s+Math.abs(b.vx),0)/180));uiClock+=elapsed;if(uiClock>.1){uiClock=0;render();}draw();
 }
 requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{lastFrame=null;accumulator=0;if(document.hidden){stopPowerHold();soundscape?.rolling(0);soundscape?.motion(0,false);}});
render();draw();requestAnimationFrame(frame);
