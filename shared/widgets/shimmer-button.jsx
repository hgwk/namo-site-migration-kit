// shimmer-button — dependency-free Namo-compatible shimmer button/link.
export default function ShimmerButtonWidget(props){
  const rootRef=useRef(null);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='shimmer-button']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  const label=String(read("data-label","Contact us"));
  const href=String(read("data-href",""));
  const style={
    "--sb-shimmer-color":String(read("data-shimmer-color","#ffffff")),
    "--sb-shimmer-radius":String(read("data-radius","100px")),
    "--sb-shimmer-speed":String(read("data-duration","3s")),
    "--sb-shimmer-bg":String(read("data-background","rgba(0,0,0,1)")),
    "--sb-shimmer-cut":String(read("data-size","0.05em"))
  };
  const className=["sb-shimmer-button",(props&&props.className)||""].filter(Boolean).join(" ");
  const content=<><span className="sb-shimmer-button__spark"/><span className="sb-shimmer-button__label">{label}</span><span className="sb-shimmer-button__highlight"/><span className="sb-shimmer-button__backdrop"/></>;
  if(href)return <a ref={rootRef} className={className} style={style} href={href}>{content}</a>;
  return <button ref={rootRef} className={className} style={style} type="button">{content}</button>;
}
