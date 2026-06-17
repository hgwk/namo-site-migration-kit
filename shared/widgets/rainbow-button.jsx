// rainbow-button — dependency-free Namo-compatible animated button/link.
export default function RainbowButtonWidget(props){
  const rootRef=useRef(null);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='rainbow-button']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  const label=String(read("data-label","Get started"));
  const href=String(read("data-href",""));
  const variant=String(read("data-variant","default"));
  const size=String(read("data-size","default"));
  const style={
    "--sb-rainbow-1":String(read("data-color-1","#FF1E54")),
    "--sb-rainbow-2":String(read("data-color-2","#7C3AED")),
    "--sb-rainbow-3":String(read("data-color-3","#06B6D4")),
    "--sb-rainbow-4":String(read("data-color-4","#22C55E")),
    "--sb-rainbow-5":String(read("data-color-5","#F59E0B"))
  };
  const className=["sb-rainbow-button","sb-rainbow-button--"+variant,"sb-rainbow-button--"+size,(props&&props.className)||""].filter(Boolean).join(" ");
  const content=<span>{label}</span>;
  if(href)return <a ref={rootRef} className={className} style={style} href={href}>{content}</a>;
  return <button ref={rootRef} className={className} style={style} type="button">{content}</button>;
}
