/* Original mechanical-wing machine. All wins come from a physical V crossing. */
(function(root){
'use strict';
const Base=typeof module!=='undefined'&&module.exports?require('../physics.js'):root.PachinkoPhysics;
const {WIDTH,HEIGHT,STEP,RADIUS:R,rail,railLength,railPoint,outerArc}=Base;
const pins=[];
const rows=[
 [[90,185],[120,192],[150,199],[180,206],[206,213]],
 [[446,185],[416,192],[386,199],[356,206],[330,213]],
 [[80,231],[107,242],[134,253],[161,264],[188,275]],
 [[456,231],[429,242],[402,253],[375,264],[348,275]],
 [[58,280],[80,300],[106,315],[131,332],[156,347]],
 [[478,280],[456,300],[430,315],[405,332],[380,347]],
 [[52,349],[75,367],[102,385],[130,403],[158,421],[186,439]],
 [[484,349],[461,367],[434,385],[406,403],[378,421],[350,439]],
 [[76,424],[101,443],[124,460],[148,477],[172,494]],
 [[460,424],[435,443],[412,460],[388,477],[364,494]],
 [[60,481],[85,501],[110,521]],[[476,481],[451,501],[426,521]],
 [[224,492],[245,506],[268,517],[291,506],[312,492]],
 [[213,559],[240,576],[268,585],[296,576],[323,559]]
];
rows.forEach(row=>row.forEach(([x,y])=>pins.push({x,y,r:2.65})));
const arc=(cx,cy,rx,ry)=>Array.from({length:33},(_,i)=>{const a=Math.PI+i*Math.PI/32;return[cx+rx*Math.cos(a),cy+ry*Math.sin(a)];});
const hood=arc(268,274,66,46),counterHood=arc(268,151,64,35);
const segs=a=>a.slice(1).map((p,i)=>[...a[i],...p]);
const bodyWalls=[[20,230,20,622],[516,230,516,622],[202,274,220,322],[334,274,316,322],[220,322,220,468],[316,322,316,468],[220,468,316,468],
 [128,511,161,548],[222,513,190,548],[314,513,346,548],[408,511,375,548]];
const walls=[...bodyWalls,...segs(outerArc),...segs(hood),...segs(counterHood)];
// The housing is a solid silhouette. A rotating wing or another ball must
// not push a free ball through its thin edge into the separate internal depth.
const casing=[...hood,[316,322],[316,468],[220,468],[220,322]];
function excludeCasing(b){
 let inside=false;
 for(let i=0,j=casing.length-1;i<casing.length;j=i++){
  const [x,y]=casing[i],[px,py]=casing[j];
  if((y>b.y)!==(py>b.y)&&b.x<(px-x)*(b.y-y)/(py-y)+x)inside=!inside;
 }
 if(!inside)return;
 let nearest=null;
 for(let i=0;i<casing.length;i++){
  const [ax,ay]=casing[i],[bx,by]=casing[(i+1)%casing.length],dx=bx-ax,dy=by-ay;
  const t=Math.max(0,Math.min(1,((b.x-ax)*dx+(b.y-ay)*dy)/(dx*dx+dy*dy)));
  const x=ax+t*dx,y=ay+t*dy,d=Math.hypot(b.x-x,b.y-y);
  if(!nearest||d<nearest.d)nearest={x,y,d,nx:dy/Math.hypot(dx,dy),ny:-dx/Math.hypot(dx,dy)};
 }
 b.x=nearest.x+nearest.nx*(R+.01);b.y=nearest.y+nearest.ny*(R+.01);
 bounce(b,nearest.nx,nearest.ny,.38);
}
const starters=[{x:175,y:552,width:14},{x:361,y:552,width:14}];
const chamber={left:226,right:310,center:268,hole:16,vY:452,vWidth:22};
function shelfY(x){return 391+11*Math.cos((x-268)*Math.PI/100);}
function shelfSlope(x){return -11*Math.PI/100*Math.sin((x-268)*Math.PI/100);}
function wing(side,open){const x=side<0?220:316,angle=-Math.PI/2+side*open*1.02;return[x,322,x+64*Math.cos(angle),322+64*Math.sin(angle)];}
function bounce(b,nx,ny,restitution){const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=(1+restitution)*v*nx;b.vy-=(1+restitution)*v*ny;return-v;}return 0;}
function segment(b,s){const [ax,ay,bx,by]=s,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((b.x-ax)*dx+(b.y-ay)*dy)/(dx*dx+dy*dy))),px=ax+t*dx,py=ay+t*dy,ex=b.x-px,ey=b.y-py,d=Math.hypot(ex,ey);
 if(d<R){const nx=d>1e-8?ex/d:0,ny=d>1e-8?ey/d:-1;b.x=px+nx*(R+.01);b.y=py+ny*(R+.01);return bounce(b,nx,ny,.38);}return 0;}
function crossing(x0,y0,b,y,cx,width){if(y0>=y||b.y<y||b.vy<=0)return false;const x=x0+(b.x-x0)*(y-y0)/(b.y-y0);return Math.abs(x-cx)<=width/2-R;}
class World{
 constructor({power=.36,random=Math.random}={}){Object.assign(this,{power,random,time:0,launchClock:0,sequence:0,shots:0,drained:0,starts:0,winCount:0,paid:0,captures:0,missedV:0,balls:[],mode:'normal',phase:'idle',phaseTime:0,pending:0,openClock:0,wingOpen:0,wingTarget:0,round:0,jackpotId:0,continued:false,releaseDone:false,gateOpen:1,flash:0,lastEvent:'READY'});}
 get vX(){return this.mode==='bonus'?268:268+25*Math.sin(this.time*1.23);}
 get held(){return this.balls.filter(b=>b.route==='held');}
 launch(){const p=Base.launchPower(this.power);this.balls.push({id:++this.sequence,x:rail[0][0],y:rail[0][1],vx:0,vy:0,age:0,route:'rail',distance:0,railSpeed:850+this.power*350,
 releaseVX:(150+450*p)*.68+(this.random()-.5)*10,releaseVY:-(150+450*p)*.733+(this.random()-.5)*10});this.shots++;}
 beginRound(events){this.phase='collect';this.phaseTime=0;this.continued=false;this.releaseDone=false;this.lastEvent='ROUND '+this.round;events.push({type:'round',round:this.round});}
 win(events){this.mode='bonus';this.round=1;this.jackpotId++;this.pending=0;this.openClock=0;this.winCount++;this.paid+=50;this.flash=1;events.push({type:'win'});this.beginRound(events);}
 finishBonus(events){this.mode='normal';this.phase='idle';this.phaseTime=0;this.round=0;this.pending=0;this.openClock=0;this.lastEvent='READY';events.push({type:'bonus-end'});}
 start(events){this.starts++;this.paid++;if(this.mode==='normal')this.pending=Math.min(4,this.pending+1);events.push({type:'start'});}
 capture(b,side,events){b.route='throat';b.t=0;b.fromX=b.x;b.fromY=b.y;b.side=side;b.game=this.jackpotId;b.round=this.mode==='bonus'?this.round:0;b.entryVX=side<0?92:-92;
 this.captures++;if(this.mode==='bonus')this.paid+=10;this.lastEvent='IN';events.push({type:'capture',x:b.x});}
 takeV(b,events){b.done=true;this.drained++;events.push({type:'v',x:b.x});
 if(this.mode==='normal'&&b.round===0&&b.game===this.jackpotId)this.win(events);
 else if(this.mode==='bonus'&&this.phase==='release'&&b.round===this.round&&b.game===this.jackpotId){this.continued=true;this.lastEvent='V · CONTINUE';this.flash=.7;}
 }
 advanceMechanism(dt,events){
  this.phaseTime+=dt;this.flash=Math.max(0,this.flash-dt);
  let target=0;
  if(this.mode==='normal'){
   this.openClock=Math.max(0,this.openClock-dt);
   if(this.openClock===0&&this.pending){this.pending--;this.openClock=2.05;}
   target=this.openClock>.35?1:0;
  }else if(this.phase==='collect'){
   target=this.phaseTime%1.7<1.4?1:0;
   if(this.phaseTime>=6.8||this.held.length>=5){this.phase='release';this.phaseTime=0;target=0;this.lastEvent='RELEASE';events.push({type:'release'});}
  }else if(this.phase==='release'){
   if(this.phaseTime>.45&&!this.releaseDone){this.releaseDone=true;for(const b of this.held){b.route='drop';b.vy=15;b.vx=0;b.y=410;}}
   const remaining=this.balls.some(b=>!b.done&&b.game===this.jackpotId&&b.round===this.round&&['throat','shelf','held','drop'].includes(b.route));
   if((this.phaseTime>2&&!remaining)||this.phaseTime>12){
    if(this.continued&&this.round<8){this.round++;this.beginRound(events);}else this.finishBonus(events);
   }
  }
  if(target!==this.wingTarget){this.wingTarget=target;events.push({type:'wing',open:target});}
  this.wingOpen+=Math.max(-dt*6,Math.min(dt*6,target-this.wingOpen));
  const gateTarget=this.mode==='bonus'&&this.phase==='collect'?0:1;this.gateOpen+=Math.max(-dt*3,Math.min(dt*3,gateTarget-this.gateOpen));
 }
 step(dt=STEP,firing=false){
  this.time+=dt;const events=[];this.advanceMechanism(dt,events);
  if(firing&&this.power>0){this.launchClock+=dt;while(this.launchClock>=.6-1e-9){this.launchClock-=.6;this.launch();events.push({type:'launch'});}}else this.launchClock=0;
  for(const b of this.balls){
   b.age+=dt;if(b.age>60){b.done=true;this.drained++;events.push({type:'timeout',id:b.id,x:b.x,y:b.y,route:b.route});continue;}
   if(b.route==='rail'){b.distance=Math.min(railLength,b.distance+b.railSpeed*dt);[b.x,b.y]=railPoint(b.distance);if(b.distance===railLength){b.route='free';b.vx=b.releaseVX;b.vy=b.releaseVY;}continue;}
   if(b.route==='throat'){b.t=Math.min(1,b.t+dt/.42);const u=1-b.t,endX=b.side<0?228:308;b.x=u*u*b.fromX+2*u*b.t*endX+b.t*b.t*endX;b.y=u*u*b.fromY+2*u*b.t*360+b.t*b.t*(shelfY(endX)-R);if(b.t===1){b.route='shelf';b.vx=b.entryVX;b.vy=0;}continue;}
   if(b.route==='held')continue;
   if(b.route==='shelf'){const slope=shelfSlope(b.x);b.vx+=(740*slope/(1+slope*slope)-1.1*b.vx)*dt;b.x+=b.vx*dt;b.y=shelfY(b.x)-R;continue;}
   const x0=b.x,y0=b.y;b.vy=Math.min(850,b.vy+740*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.route==='drop'){
    if(crossing(x0,y0,b,chamber.vY,this.vX,chamber.vWidth)){this.takeV(b,events);continue;}
    if(b.y>472){b.done=true;this.drained++;this.missedV++;events.push({type:'miss-v'});}continue;
   }
   let impact=0;for(const wall of walls)impact=Math.max(impact,segment(b,wall));
   for(const side of [-1,1])impact=Math.max(impact,segment(b,wing(side,this.wingOpen)));
   for(const pin of pins){const dx=b.x-pin.x,dy=b.y-pin.y,d=Math.hypot(dx,dy),r=R+pin.r;if(d<r){const nx=d>1e-8?dx/d:0,ny=d>1e-8?dy/d:-1;b.x=pin.x+nx*(r+.01);b.y=pin.y+ny*(r+.01);impact=Math.max(impact,bounce(b,nx,ny,.6));}}
   excludeCasing(b);
   if(impact>40)events.push({type:'bounce',strength:impact,x:b.x});
   if(this.wingOpen>.8&&(this.mode==='normal'||this.phase==='collect')){
    for(const side of [-1,1])if(crossing(x0,y0,b,321,side<0?207:329,40)){this.capture(b,side,events);break;}
    if(b.route==='throat')continue;
   }
   for(const p of starters)if(crossing(x0,y0,b,p.y,p.x,p.width)){b.done=true;this.drained++;this.start(events);break;}
   if(!b.done&&(b.y>625||b.x<-20||b.x>556)){b.done=true;this.drained++;events.push({type:'out'});}
  }
  // Free and internal balls occupy separate depths; each depth retains ball collisions.
  for(const route of ['free','drop']){const balls=this.balls.filter(b=>b.route===route&&!b.done);for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
   const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<2*R){const nx=d?dx/d:1,ny=d?dy/d:0,k=(2*R-d)/2+.001;a.x-=k*nx;a.y-=k*ny;b.x+=k*nx;b.y+=k*ny;const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(v<0){a.vx+=.8*v*nx;a.vy+=.8*v*ny;b.vx-=.8*v*nx;b.vy-=.8*v*ny;}}
  }}
  const shelf=this.balls.filter(b=>b.route==='shelf'&&!b.done).sort((a,b)=>a.x-b.x);
  for(let pass=0;pass<3;pass++)for(let i=0;i<shelf.length-1;i++){const a=shelf[i],b=shelf[i+1],d=b.x-a.x;if(d<2*R){const k=(2*R-d)/2+.001;a.x-=k;b.x+=k;const v=b.vx-a.vx;if(v<0){a.vx+=.78*v;b.vx-=.78*v;}}}
  for(const b of shelf){b.y=shelfY(b.x)-R;
   if(Math.abs(b.x-268)<chamber.hole/2-R&&Math.abs(b.vx)<65){
    if(this.mode==='bonus'&&this.phase==='collect'&&b.round===this.round&&b.game===this.jackpotId&&this.held.length<5){const slots=[0,-10,10,-20,20];b.x=268+slots[this.held.length];b.y=403;b.vx=b.vy=0;b.route='held';events.push({type:'hold'});}
    else{b.route='drop';b.vy=20;events.push({type:'drop'});}
   }else if(b.x<chamber.left-R||b.x>chamber.right+R){b.route='drop';b.vy=20;}
  }
  const guided=this.balls.filter(b=>b.route==='rail').sort((a,b)=>a.distance-b.distance);for(let i=guided.length-2;i>=0;i--){const a=guided[i],b=guided[i+1];if(b.distance-a.distance<2*R){a.distance=Math.max(0,b.distance-2*R);a.railSpeed=Math.min(a.railSpeed,b.railSpeed);[a.x,a.y]=railPoint(a.distance);}}
  this.balls=this.balls.filter(b=>!b.done);return events;
 }
}
const api={World,WIDTH,HEIGHT,STEP,RADIUS:R,rail,outerArc,pins,walls,bodyWalls,hood,counterHood,starters,chamber,shelfY,wing};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PachinkoMark25Physics=api;
})(typeof globalThis!=='undefined'?globalThis:this);
