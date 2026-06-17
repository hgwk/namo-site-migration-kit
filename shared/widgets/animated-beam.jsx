// animated-beam — Namo-compatible SVG beam connector.
// Usage:
// <widget-placeholder
//   data-widget-id="animated-beam"
//   data-container=".beam-stage"
//   data-beams='[{"from":"#card-a","to":"#card-b","curvature":80}]'
// ></widget-placeholder>
export default function AnimatedBeamWidget(props){
  const rootRef=useRef(null);
  const [box,setBox]=useState({w:0,h:0,paths:[]});
  const uid=String((typeof React!=="undefined"&&React.useId)?React.useId():"beam"+Math.floor(Math.random()*1e9)).replace(/:/g,"");
  const read=(name,fb)=>{
    const p=props&&props[name];
    if(p!=null)return p;
    const camel=name.replace(/^data-/,"").replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    if(props&&props[camel]!=null)return props[camel];
    const root=rootRef.current;
    const host=root&&(root.closest("[data-widget-id='animated-beam']")||root.parentElement);
    if(host&&host.getAttribute){
      const v=host.getAttribute(name)||host.getAttribute("data-"+name)||host.getAttribute("data-"+camel.replace(/[A-Z]/g,m=>"-"+m.toLowerCase()));
      if(v!=null)return v;
    }
    return fb;
  };
  const num=(name,fb)=>{const v=Number(read(name,fb));return Number.isFinite(v)?v:fb;};
  const bool=(name,fb)=>{const v=read(name,fb?"true":"false");return v===true||v==="true"||v==="1"||v==="yes";};
  const parseBeams=()=>{
    const raw=read("data-beams","");
    if(raw){
      try{const parsed=JSON.parse(raw);if(Array.isArray(parsed))return parsed;}catch(_e){}
    }
    return [{fromPoint:[0.18,0.5],toPoint:[0.82,0.5],curvature:num("data-curvature",0)}];
  };
  useEffect(()=>{
    const update=()=>{
      const root=rootRef.current;if(!root)return;
      const selector=read("data-container","");
      const container=selector?document.querySelector(selector):(root.parentElement||root);
      if(!container)return;
      const cr=container.getBoundingClientRect();
      const paths=parseBeams().map(beam=>{
        let sx,sy,ex,ey;
        if(beam.from&&beam.to){
          const a=container.querySelector(beam.from)||document.querySelector(beam.from);
          const b=container.querySelector(beam.to)||document.querySelector(beam.to);
          if(a&&b){
            const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
            sx=ar.left-cr.left+ar.width/2+(beam.startXOffset||0);
            sy=ar.top-cr.top+ar.height/2+(beam.startYOffset||0);
            ex=br.left-cr.left+br.width/2+(beam.endXOffset||0);
            ey=br.top-cr.top+br.height/2+(beam.endYOffset||0);
          }
        }
        if(sx==null){
          const fp=beam.fromPoint||[0.18,0.5], tp=beam.toPoint||[0.82,0.5];
          sx=fp[0]*cr.width;sy=fp[1]*cr.height;ex=tp[0]*cr.width;ey=tp[1]*cr.height;
        }
        const curvature=Number(beam.curvature!=null?beam.curvature:num("data-curvature",0));
        const cy=sy-curvature;
        return "M "+sx+","+sy+" Q "+((sx+ex)/2)+","+cy+" "+ex+","+ey;
      });
      setBox({w:cr.width,h:cr.height,paths});
    };
    update();
    let ro=null;
    if(window.ResizeObserver){ro=new ResizeObserver(update);ro.observe(rootRef.current?.parentElement||rootRef.current);}
    else window.addEventListener("resize",update);
    return()=>{if(ro)ro.disconnect();else window.removeEventListener("resize",update);};
  },[]);
  const reverse=bool("data-reverse",false);
  const style={
    "--sb-beam-duration":String(read("data-duration","5s")),
    "--sb-beam-delay":String(read("data-delay","0s")),
    "--sb-beam-path":String(read("data-path-color","gray")),
    "--sb-beam-start":String(read("data-gradient-start","#ffaa40")),
    "--sb-beam-stop":String(read("data-gradient-stop","#9c40ff")),
    "--sb-beam-opacity":num("data-path-opacity",0.2),
    "--sb-beam-width":num("data-path-width",2)
  };
  return (
    <svg ref={rootRef} className={["sb-animated-beam",reverse?"sb-animated-beam--reverse":"",(props&&props.className)||""].filter(Boolean).join(" ")} style={style} width={box.w} height={box.h} viewBox={"0 0 "+box.w+" "+box.h} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={"beam-"+uid} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="var(--sb-beam-start)" stopOpacity="0"/>
          <stop offset="25%" stopColor="var(--sb-beam-start)"/>
          <stop offset="55%" stopColor="var(--sb-beam-stop)"/>
          <stop offset="100%" stopColor="var(--sb-beam-stop)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {box.paths.map((d,i)=><g key={i}><path d={d} stroke="var(--sb-beam-path)" strokeWidth="var(--sb-beam-width)" strokeOpacity="var(--sb-beam-opacity)" strokeLinecap="round"/><path className="sb-animated-beam__glow" d={d} stroke={"url(#beam-"+uid+")"} strokeWidth="var(--sb-beam-width)" strokeLinecap="round"/></g>)}
    </svg>
  );
}
