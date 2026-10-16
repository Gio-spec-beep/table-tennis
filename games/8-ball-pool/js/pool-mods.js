(() => {
  "use strict";
  const STORE = "poolAbilityLoadoutV2";
  const abilities = [
    {id:"hyper",name:"Hyper Break",icon:"⚡",cost:0,cooldown:18,duration:5,desc:"A pulsing power-up effect for your opening-shot setup.",color:"#fbbf24"},
    {id:"curve",name:"Curve Shot",icon:"🌀",cost:0,cooldown:14,duration:6,desc:"Bend the cue ball left or right with adjustable curve strength.",color:"#c084fc"},
    {id:"dead",name:"Dead Stop",icon:"🧊",cost:0,cooldown:16,duration:5,desc:"Marks a target zone for controlled, softer shots.",color:"#67e8f9"},
    {id:"bank",name:"Bank Master",icon:"💥",cost:3,cooldown:14,duration:7,desc:"Draws a suggested cushion-bounce route.",color:"#fb7185"},
    {id:"ghost",name:"Ghost Ball",icon:"🎯",cost:5,cooldown:12,duration:7,desc:"Shows a ghost-ball contact point for aiming.",color:"#86efac"},
    {id:"focus",name:"Precision Focus",icon:"🔮",cost:7,cooldown:20,duration:6,desc:"Adds a precision reticle around your pointer.",color:"#a78bfa"}
  ];
  const defaults = {points:0,unlocked:["hyper","curve","dead"],equipped:["hyper","curve","dead"],cooldowns:{},active:{}};
  let state;
  try { state=Object.assign({},defaults,JSON.parse(localStorage.getItem(STORE)||"{}")); } catch (_) { state=Object.assign({},defaults); }
  state.unlocked=Array.isArray(state.unlocked)?state.unlocked:defaults.unlocked.slice();
  defaults.unlocked.forEach(id=>{if(!state.unlocked.includes(id))state.unlocked.push(id);});
  state.equipped=Array.isArray(state.equipped)?state.equipped.filter((id,i,arr)=>abilities.some(a=>a.id===id)&&arr.indexOf(id)===i).slice(0,3):defaults.equipped.slice();
  state.cooldowns=state.cooldowns||{}; state.active=state.active||{};
  const $=id=>document.getElementById(id), panel=$("pool-mod-panel"),toggle=$("pool-mod-toggle"),canvas=$("pool-aim-overlay"),ctx=canvas.getContext("2d");
  let pointer={x:innerWidth/2,y:innerHeight/2,inside:false},noticeTimer=0,lastRender=0;
  let turnSeen=false,lastTurn=null,sawOpponentTurn=false,usedThisTurn=false,previousShotRunning=false,pendingAbility=null,gameSessionActive=false,gameStatus={inGame:false,myTurn:false,shotRunning:false};
  let curveBend=Number(localStorage.getItem("poolCurveBend")||0.55),curveSide=Number(localStorage.getItem("poolCurveSide")||1);
  function save(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch(_){}render();}
  function notify(message,color="#c4b5fd"){const el=$("pool-ability-notice");el.textContent=message;el.style.borderColor=color;el.classList.add("show");clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove("show"),2100);}
  function remaining(id){return Math.max(0,(state.cooldowns[id]||0)-Date.now());}
  function readGameStatus(){
    // Require a live billiards table, not merely a menu/loading scene with a turn flag.
    try {
      const g=window.game||(window.Phaser&&window.Phaser.GAMES&&window.Phaser.GAMES[0]);
      const scene=g&&g.state&&g.state.getCurrentState?g.state.getCurrentState():null;
      const balls=scene&&scene.ballArray;
      const cue=balls&&balls[0];
      const turn=scene&&scene.turn;
      const hasLiveTable=!!(
        scene &&
        Array.isArray(balls) && balls.length >= 2 &&
        cue && cue.body &&
        scene.gameRunning === true &&
        (turn === "p1" || turn === "p2")
      );
      if(!hasLiveTable){
        gameStatus={inGame:false,myTurn:false,shotRunning:false};
        gameSessionActive=false;
        previousShotRunning=false;
        pendingAbility=null;
        return gameStatus;
      }
      if(!gameSessionActive){
        gameSessionActive=true;
        turnSeen=true;
        lastTurn=turn;
        sawOpponentTurn=false;
        usedThisTurn=false;
        previousShotRunning=!!scene.shotRunning;
      } else if(!turnSeen){
        turnSeen=true;
        lastTurn=turn;
        usedThisTurn=false;
      } else if(turn!==lastTurn){
        if(turn!=="p1")sawOpponentTurn=true;
        if(turn==="p1"&&sawOpponentTurn){usedThisTurn=false;sawOpponentTurn=false;}
        lastTurn=turn;
      }
      const shooting=!!scene.shotRunning;
      if(shooting&&!previousShotRunning&&pendingAbility){
        const id=pendingAbility, a=abilities.find(x=>x.id===id), now=Date.now();
        if(a){
          state.active[id]=now+a.duration*1000;
          state.cooldowns[id]=now+a.cooldown*1000;
          try{localStorage.setItem(STORE,JSON.stringify(state));}catch(_){}
        }
        pendingAbility=null;
      }
      previousShotRunning=shooting;
      gameStatus={inGame:true,myTurn:turn==="p1"&&!shooting&&!(scene.foulWindow&&scene.foulWindow.visible),shotRunning:shooting};
      return gameStatus;
    } catch(_){
      gameStatus={inGame:false,myTurn:false,shotRunning:false};
      gameSessionActive=false;
      previousShotRunning=false;
      pendingAbility=null;
      return gameStatus;
    }
  }
  function render(){
    const gs=readGameStatus();
    $("pm-status").textContent=(gs.inGame?(gs.myTurn?(usedThisTurn?"✦ Ability used this turn":"✦ YOUR TURN · ABILITY READY"):"⏳ WAITING FOR YOUR TURN"):"🔒 Start a game to use abilities")+" · "+state.points+" points · "+state.unlocked.length+"/"+abilities.length+" unlocked";
    $("pm-abilities").innerHTML=abilities.map(a=>{
      const unlocked=state.unlocked.includes(a.id),equipped=state.equipped.includes(a.id);
      return '<article class="pm-card '+(equipped?'selected ':'')+(!unlocked?'locked':'')+'"><div class="pm-card-title"><span class="pm-icon" style="color:'+a.color+'">'+a.icon+'</span><b>'+a.name+'</b></div><small>'+a.desc+'</small><div class="pm-card-foot"><span>'+(a.cooldown)+'s cooldown</span><button type="button" data-ability="'+a.id+'" '+(!unlocked&&state.points<a.cost?'disabled':'')+'>'+(equipped?'UNEQUIP':unlocked?'EQUIP':'UNLOCK · '+a.cost+' PTS')+'</button></div></article>';
    }).join("");
    $("pm-slots").innerHTML=[0,1,2].map(i=>{
      const a=abilities.find(x=>x.id===state.equipped[i]);
      if(!a)return '<div class="pm-slot empty"><span>'+(i+1)+'</span><b>EMPTY SLOT</b><small>Equip in menu</small></div>';
      const cd=remaining(a.id),active=(state.active[a.id]||0)>Date.now(),gs=readGameStatus(),blocked=!gs.inGame||!gs.myTurn||usedThisTurn;
      return '<button type="button" class="pm-slot '+(active?'active ':'')+(blocked?'blocked':'')+'" data-cast="'+a.id+'" '+(blocked?'aria-disabled="true"':'')+' style="--ability-color:'+a.color+'" title="'+a.name+' — press '+(i+1)+'"><span class="pm-slot-key">'+(i+1)+'</span><span class="pm-slot-icon">'+a.icon+'</span><b>'+a.name+'</b><small>'+(!gs.inGame?'NOT IN GAME':!gs.myTurn?'NOT YOUR TURN':usedThisTurn?'TURN USED':active?'ACTIVE':cd>0?'COOLDOWN '+Math.ceil(cd/1000)+'s':'READY')+'</small><i style="width:'+Math.max(0,Math.min(100,cd/a.cooldown/1000*100))+'%"></i></button>';
    }).join("");
    toggle.style.borderColor=(abilities.find(a=>state.equipped.includes(a.id))||abilities[0]).color;
    renderCurveControls();
  }
  function equip(id){
    const a=abilities.find(x=>x.id===id);if(!a)return;
    if(state.equipped.includes(id)){state.equipped=state.equipped.filter(x=>x!==id);save();notify(a.name+" unequipped",a.color);return;}
    if(state.equipped.length>=3){notify("All 3 slots are full — unequip one first");return;}
    if(!state.unlocked.includes(id)){
      if(state.points<a.cost){notify("Need "+a.cost+" points to unlock "+a.name,a.color);return;}
      state.points-=a.cost;state.unlocked.push(id);
    }
    state.equipped.push(id);save();notify(a.name+" equipped",a.color);
  }
  function cast(id){
    const a=abilities.find(x=>x.id===id);if(!a||!state.equipped.includes(id))return;
    const gs=readGameStatus();
    if(!gs.inGame){notify("Start a pool game before using abilities","#fca5a5");return;}
    if(!gs.myTurn){notify("Abilities are only available on your turn","#fca5a5");return;}
    if(usedThisTurn){notify("One ability per turn — wait for your next turn","#fca5a5");return;}
    const cd=remaining(id);if(cd>0){notify(a.name+" ready in "+Math.ceil(cd/1000)+"s",a.color);return;}
    usedThisTurn=true;
    pendingAbility=id;
    state.active[id]=0;
    save();notify(a.icon+" "+a.name+" armed — cooldown starts when you strike the cue ball",a.color);
  }
  $("pm-abilities").addEventListener("click",e=>{const b=e.target.closest("[data-ability]");if(b)equip(b.dataset.ability);});
  const curveControls=document.createElement("div");
  curveControls.id="pm-curve-controls";
  curveControls.innerHTML='<div class="pm-label">CURVE SHOT CONTROL</div><label class="pm-control-label">Bend strength <strong id="pm-bend-value"></strong><input id="pm-bend" type="range" min="10" max="100" value="'+Math.round(curveBend*100)+'"></label><div class="pm-curve-sides"><button type="button" data-side="-1">↶ CURVE LEFT</button><button type="button" data-side="1">CURVE RIGHT ↷</button></div><div class="pm-note">Arm Curve Shot with key 2 or its slot, adjust these controls, aim, then strike the cue ball. The dashed line previews your bend. Once the cue ball is struck, Curve Shot adds a small sideways velocity to bend its path.</div>';
  $("pm-abilities").parentNode.insertBefore(curveControls,$("pm-abilities").nextSibling);
  const curveStyle=document.createElement("style");
  curveStyle.textContent='#pm-curve-controls{display:none;border:1px solid #65458a;border-radius:9px;padding:10px;margin:0 0 14px;background:#211530}#pm-curve-controls.visible{display:block}.pm-control-label{display:block;font-size:11px;color:#ddd1f3}.pm-control-label strong{float:right;color:#fff}#pm-bend{width:100%;accent-color:#c084fc;margin:10px 0}.pm-curve-sides{display:flex;gap:7px}.pm-curve-sides button{flex:1;background:#39245a;color:#fff;border:1px solid #72539b;border-radius:6px;padding:7px;font-size:10px;font-weight:800;cursor:pointer}.pm-curve-sides button.selected{background:#7c3aed;border-color:#ddd1f3}';
  document.head.appendChild(curveStyle);
  const bendInput=$("pm-bend"), bendValue=$("pm-bend-value");
  function renderCurveControls(){
    curveControls.classList.toggle("visible",state.equipped.includes("curve")&&gameStatus.inGame&&gameStatus.myTurn);
    bendValue.textContent=Math.round(curveBend*100)+"%";
    curveControls.querySelectorAll("[data-side]").forEach(b=>b.classList.toggle("selected",Number(b.dataset.side)===curveSide));
  }
  bendInput.addEventListener("input",()=>{curveBend=Number(bendInput.value)/100;localStorage.setItem("poolCurveBend",String(curveBend));renderCurveControls();});
  curveControls.addEventListener("click",e=>{const b=e.target.closest("[data-side]");if(!b)return;curveSide=Number(b.dataset.side);localStorage.setItem("poolCurveSide",String(curveSide));renderCurveControls();});

  $("pm-slots").addEventListener("click",e=>{const b=e.target.closest("[data-cast]");if(b)cast(b.dataset.cast);});
  toggle.addEventListener("click",()=>{panel.classList.toggle("open");toggle.setAttribute("aria-expanded",panel.classList.contains("open")?"true":"false");});
  $("pool-mod-close").addEventListener("click",()=>{panel.classList.remove("open");toggle.setAttribute("aria-expanded","false");});
  $("pm-practice").addEventListener("click",()=>{state.points++;save();notify("+1 ability point earned!");});
  $("pm-reset").addEventListener("click",()=>{if(confirm("Reset ability unlocks, cooldowns, and equipped loadout?")){state=Object.assign({},defaults,{unlocked:defaults.unlocked.slice(),equipped:defaults.equipped.slice(),cooldowns:{},active:{}});pendingAbility=null;save();notify("Loadout reset");}});
  document.addEventListener("keydown",e=>{
    if(/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||""))return;
    if(e.key==="Escape"&&panel.classList.contains("open")){panel.classList.remove("open");toggle.setAttribute("aria-expanded","false");return;}
    if(["1","2","3"].includes(e.key)){const id=state.equipped[Number(e.key)-1];if(id)cast(id);}
    if(e.key.toLowerCase()==="l"){panel.classList.toggle("open");toggle.setAttribute("aria-expanded",panel.classList.contains("open")?"true":"false");}
  });
  document.addEventListener("pointermove",e=>{pointer={x:e.clientX,y:e.clientY,inside:true};});
  document.addEventListener("pointerleave",()=>{pointer.inside=false;});
  function resize(){canvas.width=Math.max(1,innerWidth*devicePixelRatio);canvas.height=Math.max(1,innerHeight*devicePixelRatio);ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);}
  addEventListener("resize",resize);resize();
  function applyCurveToCueBall(){
    if(!gameStatus.inGame||!gameStatus.shotRunning||(state.active.curve||0)<=Date.now())return;
    try{
      const g=window.game||(window.Phaser&&window.Phaser.GAMES&&window.Phaser.GAMES[0]),scene=g&&g.state&&g.state.getCurrentState();
      const cue=scene&&scene.ballArray&&scene.ballArray[0],v=cue&&cue.body&&cue.body.velocity;
      if(!v)return;
      const vx=Number(v[0]!==undefined?v[0]:v.x),vy=Number(v[1]!==undefined?v[1]:v.y),speed=Math.hypot(vx,vy);
      if(!Number.isFinite(speed)||speed<15)return;
      const turn=curveSide*curveBend*0.004;
      if(v[0]!==undefined){v[0]+=-vy*turn;v[1]+=vx*turn;}
      else if(typeof v.x==="number"&&typeof v.y==="number"){v.x+=-vy*turn;v.y+=vx*turn;}
    }catch(_){}
  }
  function draw(){
    const now=Date.now(),gs=readGameStatus();ctx.clearRect(0,0,innerWidth,innerHeight);
    applyCurveToCueBall();
    const active=state.equipped.map(id=>abilities.find(a=>a.id===id)).filter(a=>a&&gs.inGame&&(gs.myTurn||gs.shotRunning)&&(pendingAbility===a.id||(state.active[a.id]||0)>now));
    canvas.style.display=active.length?"block":"none";
    if(pointer.inside&&active.length){
      const a=active[active.length-1],color=a.color,x=pointer.x,y=pointer.y,len=Math.min(innerWidth,420);
      ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.lineWidth=2;
      if(a.id==="curve"){
        const bend=curveSide*curveBend*len*.42;
        ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+len*.35,y+bend,x+len*.78,y);ctx.setLineDash([7,6]);ctx.stroke();ctx.setLineDash([]);
        ctx.beginPath();ctx.arc(x+len*.35,y+bend*.5,4,0,Math.PI*2);ctx.fill();
      }
      else if(a.id==="bank"){const edge=Math.min(innerWidth-16,x+len*.55),top=18;ctx.setLineDash([9,6]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(edge,top);ctx.lineTo(Math.min(innerWidth-16,edge+len*.25),y+len*.25);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(edge,top,7,0,Math.PI*2);ctx.stroke();}
      else if(a.id==="ghost"){ctx.beginPath();ctx.arc(x+58,y-20,15,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+43,y-15);ctx.stroke();ctx.beginPath();ctx.arc(x+43,y-15,4,0,Math.PI*2);ctx.fill();}
      else if(a.id==="dead"){ctx.beginPath();ctx.arc(x+len*.45,y-15,24,0,Math.PI*2);ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(x+len*.45-32,y-15);ctx.lineTo(x+len*.45+32,y-15);ctx.moveTo(x+len*.45,y-47);ctx.lineTo(x+len*.45,y+17);ctx.stroke();}
      else if(a.id==="focus"){ctx.beginPath();ctx.arc(x,y,40,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x-54,y);ctx.lineTo(x-25,y);ctx.moveTo(x+25,y);ctx.lineTo(x+54,y);ctx.moveTo(x,y-54);ctx.lineTo(x,y-25);ctx.moveTo(x,y+25);ctx.lineTo(x,y+54);ctx.stroke();}
      else if(a.id==="hyper"){ctx.beginPath();ctx.arc(x,y,28+Math.sin(now/100)*5,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-45,y);ctx.lineTo(x-30,y);ctx.moveTo(x+30,y);ctx.lineTo(x+45,y);ctx.stroke();}
      ctx.restore();
    }
    if(now-lastRender>300){render();lastRender=now;}
    requestAnimationFrame(draw);
  }
  render();draw();
})();