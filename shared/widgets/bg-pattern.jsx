// bg-pattern — MagicUI-derived background patterns for namo widgets.
// Variants: flicker, grid, interactive-grid, dots, noise, stripe, hexagon, animated-grid.
// Usage:
// <widget-placeholder data-widget-id="bg-pattern" data-variant="flicker" data-color="#F08300" data-opacity="0.18"></widget-placeholder>
export default function ZdwBgPattern(props){
  const rootRef=useRef(null);
  const uid=String((typeof React!=="undefined"&&React.useId)?React.useId():"bg"+Math.floor(Math.random()*1e9)).replace(/:/g,"");
  const [hover,setHover]=useState(null);
  const [box,setBox]=useState({w:0,h:0});
  const read=(name,fb)=>{
    const p=props&&props[name];
    if(p!=null)return p;
    const camel=name.replace(/^data-/,"").replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    if(props&&props[camel]!=null)return props[camel];
    const root=rootRef.current;
    const host=root&&(root.closest("[data-widget-id='bg-pattern']")||root.parentElement);
    if(host&&host.getAttribute){
      const v=host.getAttribute(name)||host.getAttribute("data-"+name)||host.getAttribute("data-"+camel.replace(/[A-Z]/g,m=>"-"+m.toLowerCase()));
      if(v!=null)return v;
    }
    const ph=document.querySelector("[data-widget-id='bg-pattern']");
    if(ph&&ph.getAttribute){
      const v=ph.getAttribute(name)||ph.getAttribute("data-"+name);
      if(v!=null)return v;
    }
    return fb;
  };
  const num=(name,fb)=>{const v=Number(read(name,fb));return Number.isFinite(v)?v:fb;};
  const bool=(name,fb)=>{const v=read(name,fb?"true":"false");return v===true||v==="true"||v==="1"||v==="yes";};
  const variant=String(read("data-variant","grid"));
  const color=String(read("data-color","#FFFFFF"));
  const opacity=num("data-opacity",0.1);
  const cell=num("data-cell",10);
  const gap=num("data-gap",6);
  const className=["bg-pattern","bg-pattern--"+variant,(props&&props.className)||""].filter(Boolean).join(" ");
  useEffect(()=>{
    const el=rootRef.current;if(!el)return;
    const update=()=>setBox({w:el.clientWidth||0,h:el.clientHeight||0});
    update();
    let ro=null;
    if(window.ResizeObserver){ro=new ResizeObserver(update);ro.observe(el);}
    else window.addEventListener("resize",update);
    return()=>{if(ro)ro.disconnect();else window.removeEventListener("resize",update);};
  },[]);
  const style={"--bg-pattern-color":color,"--bg-pattern-opacity":opacity};
  let child=null;
  if(variant==="flicker") child=<FlickerCanvas color={color} opacity={opacity} square={num("data-size",4)} gap={gap} chance={num("data-chance",0.28)} />;
  else if(variant==="interactive-grid") child=<InteractiveGrid id={uid} cell={cell} box={box} hover={hover} setHover={setHover} />;
  else if(variant==="dots") child=<Dots id={uid} cell={num("data-cell",22)} radius={num("data-radius",1.2)} box={box} glow={bool("data-glow",true)} />;
  else if(variant==="noise") child=<Noise id={uid} freq={num("data-frequency",0.55)} oct={num("data-octaves",5)} slope={num("data-slope",0.18)} />;
  else if(variant==="stripe"||variant==="striped") child=<Stripe id={uid} cell={num("data-cell",14)} direction={String(read("data-direction","left"))} />;
  else if(variant==="hexagon"||variant==="hex") child=<Hex id={uid} radius={num("data-radius",34)} />;
  else if(variant==="animated-grid") child=<AnimatedGrid id={uid} cell={cell} box={box} />;
  else child=<Grid id={uid} cell={cell} dashed={String(read("data-dash","0"))} />;
  return <div ref={rootRef} className={className} style={style} aria-hidden="true">{child}</div>;
}

function FlickerCanvas({color,opacity,square,gap,chance}){
  const wrapRef=useRef(null), canvasRef=useRef(null);
  useEffect(()=>{
    const wrap=wrapRef.current, canvas=canvasRef.current;
    if(!wrap||!canvas)return;
    const ctx=canvas.getContext("2d"); if(!ctx)return;
    let frame=0, params=null, visible=true, ro=null, io=null, disposed=false, last=0;
    const rgba=toRgbaPrefix(color);
    const setup=()=>{
      const w=wrap.clientWidth||1,h=wrap.clientHeight||1,dpr=window.devicePixelRatio||1;
      canvas.width=Math.max(1,Math.floor(w*dpr));canvas.height=Math.max(1,Math.floor(h*dpr));
      canvas.style.width=w+"px";canvas.style.height=h+"px";
      const cols=Math.ceil(w/(square+gap)), rows=Math.ceil(h/(square+gap));
      const values=new Float32Array(cols*rows);
      for(let i=0;i<values.length;i++)values[i]=Math.random()*opacity;
      params={w,h,dpr,cols,rows,values};
    };
    const draw=(t)=>{
      if(disposed)return;
      if(visible&&params){
        const dt=Math.min(0.05,((t||0)-last)/1000||0.016);last=t||0;
        const {dpr,cols,rows,values}=params;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        for(let i=0;i<values.length;i++){if(Math.random()<chance*dt)values[i]=Math.random()*opacity;}
        for(let x=0;x<cols;x++)for(let y=0;y<rows;y++){
          ctx.fillStyle=rgba+values[x*rows+y]+")";
          ctx.fillRect(x*(square+gap)*dpr,y*(square+gap)*dpr,square*dpr,square*dpr);
        }
      }
      frame=requestAnimationFrame(draw);
    };
    setup();
    if(window.ResizeObserver){ro=new ResizeObserver(setup);ro.observe(wrap);}
    if(window.IntersectionObserver){io=new IntersectionObserver(es=>{visible=!!(es[0]&&es[0].isIntersecting);});io.observe(wrap);}
    frame=requestAnimationFrame(draw);
    return()=>{disposed=true;cancelAnimationFrame(frame);if(ro)ro.disconnect();if(io)io.disconnect();};
  },[color,opacity,square,gap,chance]);
  return <div ref={wrapRef} className="bg-pattern__canvas"><canvas ref={canvasRef}/></div>;
}

function toRgbaPrefix(color){
  try{
    const c=document.createElement("canvas");c.width=c.height=1;
    const x=c.getContext("2d");x.fillStyle=color;x.fillRect(0,0,1,1);
    const d=x.getImageData(0,0,1,1).data;return "rgba("+d[0]+","+d[1]+","+d[2]+",";
  }catch(e){return "rgba(240,131,0,";}
}

function Grid({id,cell,dashed}){
  return <svg className="bg-pattern__svg"><defs><pattern id={"grid-"+id} width={cell} height={cell} patternUnits="userSpaceOnUse"><path d={"M.5 "+cell+"V.5H"+cell} fill="none" stroke="currentColor" strokeDasharray={dashed}/></pattern></defs><rect width="100%" height="100%" fill={"url(#grid-"+id+")"}/></svg>;
}
function InteractiveGrid({cell,box,hover,setHover}){
  const cols=Math.max(1,Math.ceil((box.w||960)/cell)), rows=Math.max(1,Math.ceil((box.h||420)/cell));
  return <svg className="bg-pattern__svg" width={cols*cell} height={rows*cell}>{Array.from({length:cols*rows}).map((_,i)=>{const x=i%cols,y=Math.floor(i/cols);return <rect key={i} x={x*cell} y={y*cell} width={cell} height={cell} className={hover===i?"is-hot":""} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}/>;})}</svg>;
}
function Dots({id,cell,radius,box,glow}){
  const cols=Math.max(1,Math.ceil((box.w||960)/cell)), rows=Math.max(1,Math.ceil((box.h||420)/cell));
  return <svg className={"bg-pattern__svg "+(glow?"bg-pattern__dots--glow":"")} width={cols*cell} height={rows*cell}><defs><radialGradient id={"dot-"+id}><stop offset="0%" stopColor="currentColor" stopOpacity="1"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></radialGradient></defs>{Array.from({length:cols*rows}).map((_,i)=>{const x=i%cols,y=Math.floor(i/cols);return <circle key={i} cx={x*cell+cell/2} cy={y*cell+cell/2} r={radius} style={{animationDelay:((i%17)*.17)+"s",animationDuration:(2.4+(i%7)*.22)+"s"}} fill={glow?"url(#dot-"+id+")":"currentColor"}/>;})}</svg>;
}
function Noise({id,freq,oct,slope}){
  return <svg className="bg-pattern__svg" xmlns="http://www.w3.org/2000/svg"><filter id={"noise-"+id}><feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={oct} stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope={slope}/><feFuncG type="linear" slope={slope}/><feFuncB type="linear" slope={slope}/></feComponentTransfer></filter><rect width="100%" height="100%" filter={"url(#noise-"+id+")"}/></svg>;
}
function Stripe({id,cell,direction}){
  const right=direction==="right";
  return <svg className="bg-pattern__svg"><defs><pattern id={"stripe-"+id} width={cell} height={cell} patternUnits="userSpaceOnUse">{right?<><line x1="0" y1="0" x2={cell} y2={cell}/><line x1={-cell} y1="0" x2="0" y2={cell}/><line x1={cell} y1="0" x2={cell*2} y2={cell}/></>:<><line x1="0" y1={cell} x2={cell} y2="0"/><line x1={-cell} y1={cell} x2="0" y2="0"/><line x1={cell} y1={cell} x2={cell*2} y2="0"/></>}</pattern></defs><rect width="100%" height="100%" fill={"url(#stripe-"+id+")"}/></svg>;
}
function Hex({id,radius}){
  // 평평한 윗변(flat-top) 벌집. 타일 = 3r × √3r, 두 번째 컬럼은 세로 h/2 오프셋(상·하단으로 wrap)되어 끊김 없이 맞물림.
  const h=Math.sqrt(3)*radius, W=3*radius, H=h;
  const points=(cx,cy)=>Array.from({length:6}).map((_,i)=>{const a=Math.PI/3*i;return (cx+radius*Math.cos(a))+","+(cy+radius*Math.sin(a));}).join(" ");
  return <svg className="bg-pattern__svg"><defs><pattern id={"hex-"+id} width={W} height={H} patternUnits="userSpaceOnUse"><polygon points={points(radius,H/2)} fill="none"/><polygon points={points(2.5*radius,0)} fill="none"/><polygon points={points(2.5*radius,H)} fill="none"/></pattern></defs><rect width="100%" height="100%" fill={"url(#hex-"+id+")"}/></svg>;
}
function AnimatedGrid({cell,box}){
  const cols=Math.max(1,Math.ceil((box.w||960)/cell)), rows=Math.max(1,Math.ceil((box.h||420)/cell));
  return <svg className="bg-pattern__svg bg-pattern__animated" width={cols*cell} height={rows*cell}>{Array.from({length:cols*rows}).map((_,i)=>{const x=i%cols,y=Math.floor(i/cols);return <rect key={i} x={x*cell+1} y={y*cell+1} width={cell-2} height={cell-2} style={{animationDelay:((i%23)*.11)+"s",animationDuration:(3+(i%9)*.25)+"s"}}/>;})}</svg>;
}
