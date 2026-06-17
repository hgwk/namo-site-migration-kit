// shine-border — soft animated gradient border overlay.
export default function ShineBorderWidget(props){
  const rootRef=useRef(null);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='shine-border']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  const num=(name,fb)=>{const v=Number(read(name,fb));return Number.isFinite(v)?v:fb;};
  const colors=String(read("data-colors",read("data-color","#FFFFFF"))).split("|").map(s=>s.trim()).filter(Boolean).join(",");
  const style={"--sb-shine-width":num("data-border-width",1)+"px","--sb-shine-duration":num("data-duration",14)+"s","--sb-shine-colors":colors};
  return <div ref={rootRef} className={["sb-shine-border",(props&&props.className)||""].filter(Boolean).join(" ")} style={style} aria-hidden="true" />;
}
