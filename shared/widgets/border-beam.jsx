// border-beam — animated border highlight overlay.
// Place inside a relatively positioned card/container.
export default function BorderBeamWidget(props){
  const rootRef=useRef(null);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='border-beam']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  const num=(name,fb)=>{const v=Number(read(name,fb));return Number.isFinite(v)?v:fb;};
  const reverse=String(read("data-reverse","false"))==="true";
  const style={
    "--sb-border-beam-size":num("data-size",50)+"px",
    "--sb-border-beam-duration":num("data-duration",6)+"s",
    "--sb-border-beam-delay":(-num("data-delay",0))+"s",
    "--sb-border-beam-from":String(read("data-color-from","#ffaa40")),
    "--sb-border-beam-to":String(read("data-color-to","#9c40ff")),
    "--sb-border-beam-width":num("data-border-width",1)+"px",
    "--sb-border-beam-radius":num("data-radius",999)+"px",
    "--sb-border-beam-core":String(read("data-core","#fff")),
    "--sb-border-beam-ratio":num("data-ratio",0.18),
    "--sb-border-beam-blur":num("data-blur",2.5)+"px"
  };
  return <div ref={rootRef} className={["sb-border-beam",reverse?"sb-border-beam--reverse":"",(props&&props.className)||""].filter(Boolean).join(" ")} style={style} aria-hidden="true"><span /></div>;
}
