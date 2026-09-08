'use strict';
const $=id=>document.getElementById(id),P=PachinkoMark25;
const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
let world=new P.World({random}),running=false,muted=false,speed=1,powerHold=null,audioContext,soundscape=null;
const canvas=$('board'),c=canvas.getContext('2d');canvas.width=P.WIDTH*2;canvas.height=P.HEIGHT*2;c.scale(2,2);
function audio(){try{if(!audioContext)audioContext=new(window.AudioContext||window.webkitAudioContext)();if(!soundscape){soundscape=new PachinkoSound(audioContext);soundscape.setLevels(.55,.5);soundscape.mute(muted);}audioContext.resume().catch(()=>{});}catch{}}
function tone(f,d=.1,type='sine',volume=.025){if(!muted)soundscape?.tone(f,d,type,volume);}
function render(){
 for(const [id,v]of Object.entries({starts:world.game.spins,wins:world.winCount,paid:world.paid.toLocaleString(),round:world.game.queue+'/4'}))$(id).textContent=v;
 const percent=(world.power*100).toFixed(1);$('power-value').textContent=percent+'%';$('handle').style.setProperty('--angle',(-125+world.power*250)+'deg');$('handle').setAttribute('aria-valuenow',percent);
 $('start').textContent=running?'발사 정지':'발사 시작';$('start').setAttribute('aria-pressed',String(running));
 const state={idle:running?'PLAY':'READY',spin:'SPIN',reach:'REACH',payout:'JACKPOT +'+world.game.payout,result:world.game.win?'JACKPOT':'NEXT'}[world.game.phase];
 if($('mode').textContent!==state)$('mode').textContent=state;
}
function setPower(value){world.power=Math.round(Math.max(0,Math.min(100,Number(value)||0))*2)/200;render();}
function stopPowerHold(){powerHold=null;}
function updatePowerHold(dt){if(!powerHold)return;powerHold.elapsed+=dt;while(powerHold&&powerHold.elapsed>=powerHold.next){setPower(world.power*100+powerHold.direction*(powerHold.elapsed>1.3?2:.5));powerHold.next+=.07;}}
$('start').onclick=()=>{audio();running=!running;world.launchClock=0;render();};
$('sound').onclick=()=>{audio();muted=!muted;soundscape?.mute(muted);$('sound').textContent='소리 '+(muted?'OFF':'ON');$('sound').setAttribute('aria-pressed',String(!muted));};
$('speed').onclick=()=>{speed=speed===1?3:1;$('speed').textContent='×'+speed;};
$('reset').onclick=()=>{stopPowerHold();world=new P.World({random,power:world.power});accumulator=0;soundscape?.rolling(0);render();draw();};
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
function draw(){
 c.clearRect(0,0,P.WIDTH,P.HEIGHT);
 const paper=c.createLinearGradient(0,30,0,635);paper.addColorStop(0,'#f0e4c8');paper.addColorStop(.6,'#e5d1a8');paper.addColorStop(1,'#cbaa7a');c.fillStyle=paper;c.fillRect(0,0,P.WIDTH,P.HEIGHT);
 c.save();c.globalAlpha=.14;for(let y=100;y<620;y+=32)for(let x=35;x<510;x+=32)circle(x+(y%64?16:0),y,.65,'#94774d');c.restore();
 path(P.outerArc,'#8c6744',11);path(P.outerArc,'#efe2c4',6);path(P.outerArc,'#ab956f',1.5);
 path(P.rail,'#675940',13);path(P.rail,'#ddd5b9',9);path(P.rail,'#8e8a74',1.4);
 label('별빛 회전극장',268,77,24,'#984d3b');label('S T A R L I G H T   ·   2 . 5',268,97,8,'#8f7353');star(173,70,9,'#aa6346');star(363,70,9,'#aa6346');
 path(P.counterHood,'#aa8654',3);c.fillStyle='#654730';c.fillRect(208,124,120,52);c.fillStyle='#271e1c';c.fillRect(214,129,108,42);const value=world.game.digits;value.forEach((n,i)=>digit(n,225+i*30,134));
 for(let i=0;i<4;i++)circle(247+i*14,188,4,i<world.game.queue?'#ffe39c':'#8d8069','#c6ac78');
 label('1 / '+P.BALANCE.winDenominator,268,213,10,'#826044');
 for(let i=0;i<16;i++){const a=-Math.PI/2+i*Math.PI*2/16,x=268+121*Math.cos(a),y=355+146*Math.sin(a);const lit=world.mode==='bonus'?((Math.floor(world.time*6)+i)%4<2||world.flash>0):world.game.phase==='reach'&&i%4===Math.floor(world.time*8)%4;bulb(x,y,lit);}
 for(const s of P.bodyWalls){path([[s[0],s[1]],[s[2],s[3]]],'#ac9164',4);path([[s[0],s[1]],[s[2],s[3]]],'#f2e5c8',1.3);}
 c.beginPath();P.hood.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();const hood=c.createLinearGradient(0,228,0,274);hood.addColorStop(0,'#b66d4b');hood.addColorStop(1,'#8c4737');c.fillStyle=hood;c.fill();path(P.hood,'#e7c58b',3);star(268,254,14,'#efd6a1');
 for(const p of P.pins){circle(p.x+1.4,p.y+2.3,p.r+1,'#8b775e55');const g=c.createRadialGradient(p.x-.8,p.y-1,.2,p.x,p.y,p.r);g.addColorStop(0,'#fff2bd');g.addColorStop(.5,'#ba9452');g.addColorStop(1,'#765730');circle(p.x,p.y,p.r,g);}
 // Brass rails cover the closed wing colliders; the wheel is an enclosed display mechanism.
 drawWing(-1);drawWing(1);
 const g=world.game,active=g.phase==='reach',won=g.phase==='payout';
 c.fillStyle='#263d3b';c.fillRect(222,326,92,140);
 path([[228,328],[228,460],[308,460],[308,328]],'#b69861',2);
 circle(268,377,44,'#624e32','#e9c991');circle(268,377,40,'#1f3433');
 c.save();c.translate(268,377);c.rotate(g.angle);
 for(let i=0;i<9;i++){
  const a=-Math.PI/2+i*Math.PI*2/9,r=32;
  c.beginPath();c.moveTo(0,0);c.arc(0,0,39,a-Math.PI/9,a+Math.PI/9);c.closePath();
  c.fillStyle=active&&i+1===g.number?'#b96042':i%2?'#39534d':'#304740';c.fill();
  c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r);c.rotate(a+Math.PI/2);label(String(i+1),0,4,12,'#fae3ad');c.restore();
 }
 c.restore();circle(268,377,10,'#cfab68','#f8e1a5');circle(268,377,4,'#81603c');
 path([[259,322],[268,339],[277,322]],won?'#fff0a7':'#bc674c',4);
 label(active?g.number+' · ? · '+g.number:won?'JACKPOT':'LUCKY WHEEL',268,303,active?14:9,active?'#a13f2b':'#826044');
 const opening=g.door*35;
 for(const side of [-1,1]){c.fillStyle='#b77850';c.fillRect(268+side*opening+(side<0?-40:0),438,40,24);path([[268+side*opening,439],[268+side*opening,461]],'#f4d594',2);}
 if(won){
  label('+'+g.payout,268,430,13,'#fff0b9');
  // Payout shower is a visual meter, separate from balls on the pin board.
  for(let i=0;i<22;i++){const t=(g.time*1.2+i/22)%1,x=268+Math.sin(i*8.3)*(8+t*62),y=463+t*190;circle(x,y,3.8,'#e6dcbd','#8e9a90');}
 }
 for(const p of P.starters){c.fillStyle='#69513a';c.fillRect(p.x-p.width/2,p.y,p.width,20);path([[p.x-p.width/2,p.y],[p.x-p.width/2,p.y+20],[p.x+p.width/2,p.y+20],[p.x+p.width/2,p.y]],'#f0d49b',2);label('START',p.x,p.y+34,8);}
 label('OUT',268,626,8,'#89704d');path([[35,631],[501,631]],'#aa8d60',3);
 // A shallow collection tray belongs to the cabinet, outside the playing area.
 c.fillStyle='#675440';c.beginPath();c.roundRect(151,650,234,27,10);c.fill();path([[160,650],[376,650]],'#e6cb9d',3);for(let i=0;i<18;i++)circle(170+i*11,664,4,'#acae9d','#d5dac8');
 for(const b of world.balls){const g=c.createRadialGradient(b.x-1.2,b.y-1.6,.25,b.x,b.y,P.RADIUS);g.addColorStop(0,'#ffffff');g.addColorStop(.36,'#e0e5dc');g.addColorStop(.74,'#8b9995');g.addColorStop(1,'#4e6263');circle(b.x,b.y,P.RADIUS,g);}
}
let lastFrame=null,accumulator=0,uiClock=0,lastBell=-1,lastTooth=null;
function sounds(events){for(const e of events){if(e.type==='launch')soundscape?.play('launch');else if(e.type==='bounce')soundscape?.play('pin',e);else if(['wing','hold','capture'].includes(e.type))soundscape?.play('stage',e);else if(['drop','release'].includes(e.type))soundscape?.play('drop');else if(e.type==='reach'){tone(660,.4,'triangle',.025);tone(990,.5,'sine',.015);}else if(e.type==='miss')tone(220,.16,'triangle',.01);else if(e.type==='payout')soundscape?.play('pocket');else if(e.type==='start'){soundscape?.play('pocket');tone(720,.08,'triangle',.012);}else if(e.type==='win'){tone(523,.7,'triangle',.05);tone(659,.8,'sine',.035);tone(784,.9,'sine',.035);}else if(e.type==='round')tone(880,.25,'triangle',.025);else if(e.type==='bonus-end')tone(260,.4,'triangle',.018);}}
function frame(timestamp){const elapsed=lastFrame===null?0:Math.min((timestamp-lastFrame)/1000,.08);lastFrame=timestamp;
 if(!document.hidden){updatePowerHold(elapsed);accumulator+=elapsed*speed;while(accumulator>=P.STEP){accumulator-=P.STEP;sounds(world.step(P.STEP,running));}
  const tooth=Math.floor(world.game.angle/(Math.PI*2/9));if(world.game.phase==='reach'&&tooth!==lastTooth){tone(1050,.025,'square',.006);lastTooth=tooth;}
  const bell=Math.floor(world.time*2);if(world.mode==='bonus'&&bell!==lastBell){lastBell=bell;tone([523,659,784,659][bell%4],.13,'triangle',.013);}
  soundscape?.rolling(Math.min(1,world.balls.filter(b=>b.route==='shelf').reduce((s,b)=>s+Math.abs(b.vx),0)/180));uiClock+=elapsed;if(uiClock>.1){uiClock=0;render();}draw();
 }
 requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{lastFrame=null;accumulator=0;if(document.hidden){stopPowerHold();soundscape?.rolling(0);}});
render();draw();requestAnimationFrame(frame);
