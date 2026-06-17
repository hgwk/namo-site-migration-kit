// circular-progress — animated SVG percentage gauge.
export default function CircularProgressWidget(props){
  const rootRef=useRef(null);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='circular-progress']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  const num=(name,fb)=>{const v=Number(read(name,fb));return Number.isFinite(v)?v:fb;};
  const min=num("data-min",0), max=num("data-max",100), value=num("data-value",72);
  const pct=Math.max(0,Math.min(100,Math.round(((value-min)/(max-min||1))*100)));
  const c=2*Math.PI*45;
  const style={"--sb-progress-percent":pct,"--sb-progress-circ":c,"--sb-progress-primary":String(read("data-primary","#FF1E54")),"--sb-progress-secondary":String(read("data-secondary","rgba(255,255,255,.18)"))};
  return <div ref={rootRef} className={["sb-circular-progress",(props&&props.className)||""].filter(Boolean).join(" ")} style={style}><svg viewBox="0 0 100 100"><circle className="sb-circular-progress__secondary" cx="50" cy="50" r="45"/><circle className="sb-circular-progress__primary" cx="50" cy="50" r="45"/></svg><span>{pct}</span></div>;
}
