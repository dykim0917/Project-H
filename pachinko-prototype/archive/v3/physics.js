/* Shared, deterministic 2D simulation: independent of rendering and jackpot draws. */
(function (root) {
  'use strict';
  const WIDTH = 536, HEIGHT = 706, STEP = 1 / 240, RADIUS = 4.2;
  const pins = [];
  // Fan-shaped groups and staggered roads inspired by the supplied board image.
  // These are original dimensions, not a measured reproduction of that machine.
  const groups = [
    [[58,188],[77,197],[96,206],[115,215]],
    [[44,226],[61,232],[80,239],[101,247],[121,252]],
    [[39,260],[54,273],[67,287],[80,301]],
    [[120,279],[107,293],[96,310],[87,327]],
    [[43,313],[52,332],[63,350],[77,365]],
    [[113,339],[108,358],[99,375],[86,392]],
    [[42,383],[54,400],[67,415],[82,428],[101,438]],
    [[134,463],[149,477],[165,491],[181,505],[198,519]],
    [[121,488],[138,502],[155,516],[173,531],[191,544]],
    [[216,536],[235,543],[254,550]],
    [[320,536],[301,543],[282,550]],
    [[361,526],[381,518],[400,507],[418,493],[433,477]],
    [[341,555],[361,548],[382,537],[402,526]],
    [[72,467],[88,478],[102,490]]
  ];
  groups.forEach((points,group)=>points.forEach(([x,y])=>pins.push({x,y,r:2.65,group})));
  const stage={left:176,right:391,center:268,hole:15,intake:{x:116,y:396,width:24}};
  const stageY=x=>488+12*Math.cos((x-stage.center)*Math.PI/220);
  const stageSlope=x=>-12*Math.PI/220*Math.sin((x-stage.center)*Math.PI/220);
  const walls = [
    [20, 180, 20, 617], [516, 120, 516, 617],
    [135, 201, 434, 201], [135, 201, 135, 431], [434, 201, 434, 431], [135, 431, 434, 431],
    [30, 442, 197, 535], [502, 440, 414, 535]
  ];
  // A sampled curved launch rail keeps the guided part continuous at every frame.
  const knots = [[477,650],[411,675],[77,675],[29,628],[29,211],[33,151],[52,122],[76,126],[98,163]];
  const rail = [], lengths = [0];
  for (let i = 0; i < knots.length - 1; i++) {
    const p0 = knots[Math.max(0,i-1)], p1=knots[i], p2=knots[i+1], p3=knots[Math.min(knots.length-1,i+2)];
    for (let j=0; j<30; j++) { const t=j/30, t2=t*t, t3=t2*t;
      const at = k => .5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);
      rail.push([at(0),at(1)]);
    }
  }
  rail.push(knots[knots.length-1]);
  for(let i=1;i<rail.length;i++) lengths[i]=lengths[i-1]+Math.hypot(rail[i][0]-rail[i-1][0],rail[i][1]-rail[i-1][1]);
  const railLength=lengths[lengths.length-1];
  function railPoint(distance) {
    let i=1;while(i<lengths.length-1&&lengths[i]<distance)i++;
    const f=Math.max(0,Math.min(1,(distance-lengths[i-1])/(lengths[i]-lengths[i-1])));
    return [rail[i-1][0]+(rail[i][0]-rail[i-1][0])*f,rail[i-1][1]+(rail[i][1]-rail[i-1][1])*f];
  }
  function reflect(b,nx,ny,restitution) {
    const vn=b.vx*nx+b.vy*ny;
    if(vn<0){b.vx-=(1+restitution)*vn*nx;b.vy-=(1+restitution)*vn*ny;return -vn;}
    return 0;
  }
  function segment(b,s) {
    const [ax,ay,bx,by]=s,dx=bx-ax,dy=by-ay;
    const t=Math.max(0,Math.min(1,((b.x-ax)*dx+(b.y-ay)*dy)/(dx*dx+dy*dy)));
    const px=ax+t*dx,py=ay+t*dy,ex=b.x-px,ey=b.y-py,d=Math.hypot(ex,ey);
    if(d<RADIUS){const nx=d>1e-8?ex/d:0,ny=d>1e-8?ey/d:-1;b.x=px+nx*(RADIUS+.01);b.y=py+ny*(RADIUS+.01);return reflect(b,nx,ny,.42);}
    return 0;
  }
  class World {
    constructor({wide=false,stageEnabled=true,random=Math.random}={}){this.wide=wide;this.stageEnabled=stageEnabled;this.random=random;this.balls=[];this.time=0;this.launchClock=0;this.shots=0;this.hits=0;this.misses=0;this.sequence=0;this.stageEntries=0;this.stageCenters=0;this.stageSides=0;}
    get pocket(){return {x:268,y:574,width:this.wide?72:28};}
    launch(){const [x,y]=rail[0];this.balls.push({id:++this.sequence,x,y,vx:0,vy:0,age:0,railDistance:0,released:false,releaseVX:62+this.random()*100,releaseVY:65+this.random()*45,trace:[]});this.shots++;}
    step(dt=STEP,firing=false){
      this.time+=dt;const events=[];
      if(firing){this.launchClock+=dt;while(this.launchClock>=.6-1e-9){this.launchClock-=.6;this.launch();events.push({type:'launch'});}}
      else this.launchClock=0;
      for(const b of this.balls){
        b.age+=dt;
        if(!b.released){b.railDistance=Math.min(railLength,b.railDistance+1150*dt);[b.x,b.y]=railPoint(b.railDistance);if(b.railDistance===railLength){b.released=true;b.vx=b.releaseVX;b.vy=b.releaseVY;}continue;}
        // The transparent channel is a constrained path into a shallow 2.5D shelf.
        // Its entrance is geometric, and stage exits never award a hit directly.
        if(b.route==='tube'){
          b.tubeTime+=dt;const t=Math.min(1,b.tubeTime/.48),u=1-t;
          b.x=u*u*u*b.tubeX+3*u*u*t*124+3*u*t*t*152+t*t*t*stage.left;
          b.y=u*u*u*stage.intake.y+3*u*u*t*435+3*u*t*t*456+t*t*t*(stageY(stage.left)-RADIUS);
          if(t===1){b.route='stage';b.vx=b.entrySpeed;b.vy=0;}
          continue;
        }
        if(b.route==='stage'){
          const slope=stageSlope(b.x);b.vx+=(740*slope/(1+slope*slope)-.6*b.vx)*dt;b.x+=b.vx*dt;b.y=stageY(b.x)-RADIUS;
          if(Math.abs(b.x-stage.center)<stage.hole/2-RADIUS&&Math.abs(b.vx)<58){b.route='free';b.fromStage=true;b.vy=28;this.stageCenters++;events.push({type:'stage-center'});}
          else if(b.x<stage.left-RADIUS||b.x>stage.right+RADIUS){b.route='free';b.fromStage=true;b.vy=25;this.stageSides++;events.push({type:'stage-side'});}
          continue;
        }
        const oldX=b.x,oldY=b.y;b.vy=Math.min(850,b.vy+740*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;
        let impact=0;
        for(const wall of walls)impact=Math.max(impact,segment(b,wall));
        for(const p of pins){const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),r=RADIUS+p.r;
          if(d<r){const nx=d>1e-8?dx/d:0,ny=d>1e-8?dy/d:-1;b.x=p.x+nx*(r+.02);b.y=p.y+ny*(r+.02);impact=Math.max(impact,reflect(b,nx,ny,.62));}
        }
        if(impact>45)events.push({type:'bounce',strength:impact,x:b.x});
        if(this.stageEnabled&&!b.fromStage&&oldY<stage.intake.y&&b.y>=stage.intake.y&&b.vy>0){
          const f=(stage.intake.y-oldY)/(b.y-oldY),x=oldX+(b.x-oldX)*f;
          if(Math.abs(x-stage.intake.x)<stage.intake.width/2-RADIUS){
            b.x=x;b.y=stage.intake.y;b.route='tube';b.tubeTime=0;b.tubeX=x;b.entrySpeed=105+Math.min(Math.abs(b.vx)*.7+Math.abs(b.vy)*.16,165);this.stageEntries++;events.push({type:'stage-enter'});continue;
          }
        }
        const p=this.pocket;
        if(oldY<p.y&&b.y>=p.y&&b.vy>0){const f=(p.y-oldY)/(b.y-oldY),x=oldX+(b.x-oldX)*f;
          if(Math.abs(x-p.x)<=p.width/2-RADIUS){b.done=true;this.hits++;events.push({type:'hit',id:b.id,x,y:p.y});}
        }
        if(!b.done&&(b.y>625||b.x<-20||b.x>556||b.age>18)){b.done=true;this.misses++;events.push({type:'out'});}
      }
      // Resolve ball contacts without introducing random forces or predetermined routes.
      const free=this.balls.filter(b=>b.released&&!b.done&&b.route!=='tube'&&b.route!=='stage');
      for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++){
        const a=free[i],b=free[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
        if(d>1e-8&&d<2*RADIUS){const nx=dx/d,ny=dy/d,overlap=(2*RADIUS-d)/2;a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
          const vn=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(vn<0){const impulse=-.8*vn;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;}
        }
      }
      this.balls=this.balls.filter(b=>!b.done);return events;
    }
  }
  const api={World,STEP,WIDTH,HEIGHT,RADIUS,pins,groups,walls,rail,railPoint,railLength,stage,stageY};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PachinkoPhysics=api;
})(typeof globalThis!=='undefined'?globalThis:this);
