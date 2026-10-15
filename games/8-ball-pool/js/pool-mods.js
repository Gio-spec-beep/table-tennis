(function(){
 const key='poolModLabV1',cues=[
  {id:'classic',name:'Classic Maple',desc:'Default cue · free',cost:0,color:'#d9b783',glow:'#d9b783'},
  {id:'amethyst',name:'Amethyst',desc:'Purple glow finish',cost:3,color:'#b69aff',glow:'#a78bfa'},
  {id:'neon',name:'Neon Pulse',desc:'Electric violet finish',cost:7,color:'#ee8cff',glow:'#e879f9'},
  {id:'royal',name:'Royal Gold',desc:'Premium gold finish',cost:12,color:'#f6ce72',glow:'#f59e0b'},
  {id:'void',name:'Void Crystal',desc:'Rare dark-purple finish',cost:20,color:'#8c72ff',glow:'#7c3aed'}
 ],defaults={points:0,unlocked:['classic'],selected:'classic',aim:false,focus:false,power:false};
 let state;try{state={...defaults,...JSON.parse(localStorage.getItem(key)||'{}')};}catch(e){state={...defaults};}
 if(!Array.isArray(state.unlocked))state.unlocked=['classic'];if(!state.unlocked.includes('classic'))state.unlocked.unshift('classic');
 const panel=document.getElementById('pool-mod-panel'),toggle=document.getElementById('pool-mod-toggle');
 function render(){document.getElementById('pm-status').textContent='Practice points: '+state.points+' · Cues unlocked: '+state.unlocked.length+'/'+cues.length;
 document.getElementById('pm-cues').innerHTML=cues.map(c=>{const u=state.unlocked.includes(c.id),sel=state.selected===c.id;return '<article class="pm-card '+(sel?'selected ':'')+(!u?'locked':'')+'"><b><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+c.color+';box-shadow:0 0 10px '+c.glow+';margin-right:6px"></span>'+c.name+'</b><small>'+c.desc+'</small><button type="button" data-cue="'+c.id+'" '+(!u&&state.points<c.cost?'disabled':'')+'>'+(sel?'EQUIPPED':u?'EQUIP':'UNLOCK · '+c.cost+' PTS')+'</button></article>';}).join('');
 document.getElementById('pm-aim').checked=!!state.aim;document.getElementById('pm-focus').checked=!!state.focus;document.getElementById('pm-power').checked=!!state.power;toggle.style.borderColor=(cues.find(c=>c.id===state.selected)||cues[0]).color;}
 function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch(e){}render();}
 document.getElementById('pm-cues').addEventListener('click',e=>{const b=e.target.closest('[data-cue]');if(!b)return;const c=cues.find(x=>x.id===b.dataset.cue);if(!c)return;if(state.unlocked.includes(c.id))state.selected=c.id;else if(state.points>=c.cost){state.points-=c.cost;state.unlocked.push(c.id);state.selected=c.id;}save();});
 toggle.addEventListener('click',()=>{panel.classList.toggle('open');toggle.setAttribute('aria-expanded',panel.classList.contains('open')?'true':'false');});
 document.getElementById('pool-mod-close').addEventListener('click',()=>{panel.classList.remove('open');toggle.setAttribute('aria-expanded','false');});
 document.getElementById('pm-aim').addEventListener('change',e=>{state.aim=e.target.checked;save();});
 document.getElementById('pm-focus').addEventListener('change',e=>{state.focus=e.target.checked;save();});
 document.getElementById('pm-power').addEventListener('change',e=>{state.power=e.target.checked;save();});
 document.getElementById('pm-practice').addEventListener('click',()=>{state.points++;save();});
 document.getElementById('pm-reset').addEventListener('click',()=>{if(confirm('Reset cue unlocks and ability settings?')){state={...defaults,unlocked:['classic']};save();}});
 const canvas=document.getElementById('pool-aim-overlay'),ctx=canvas.getContext('2d');function resize(){canvas.width=Math.max(1,innerWidth*devicePixelRatio);canvas.height=Math.max(1,innerHeight*devicePixelRatio);ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);}resize();addEventListener('resize',resize);
 let pointer={x:innerWidth/2,y:innerHeight/2,inside:false};document.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY,inside:true};});document.addEventListener('pointerleave',()=>{pointer.inside=false;});
 function draw(){ctx.clearRect(0,0,innerWidth,innerHeight);canvas.style.display=(state.aim||state.focus)?'block':'none';if(pointer.inside&&(state.aim||state.focus)){const cue=cues.find(c=>c.id===state.selected)||cues[0];ctx.save();ctx.strokeStyle=cue.glow;ctx.fillStyle=cue.glow;ctx.shadowColor=cue.glow;ctx.shadowBlur=state.focus?16:5;ctx.lineWidth=state.focus?2:1.3;if(state.aim){ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(pointer.x,pointer.y);ctx.lineTo(pointer.x+Math.cos(-.55)*Math.min(innerWidth,380),pointer.y+Math.sin(-.55)*Math.min(innerWidth,380));ctx.stroke();ctx.setLineDash([]);}if(state.focus){ctx.beginPath();ctx.arc(pointer.x,pointer.y,34,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(pointer.x,pointer.y,4,0,Math.PI*2);ctx.fill();}ctx.restore();}requestAnimationFrame(draw);}draw();render();
 if(state.power){const tip=document.createElement('div');tip.style.cssText='position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:999998;padding:8px 12px;border:1px solid #c4b5fd;border-radius:9px;background:#1b1230;color:#f5efff;font:800 11px system-ui;pointer-events:none';tip.textContent='POWER BREAK ARMED · Use your strongest opening shot';document.body.appendChild(tip);}
})();
