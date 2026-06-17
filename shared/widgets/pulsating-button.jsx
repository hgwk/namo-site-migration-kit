// pulsating-button — pulse/ripple CTA button or link.
export default function PulsatingButtonWidget(props){
  const rootRef=useRef(null);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='pulsating-button']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  const label=String(read("data-label","Contact us"));
  const href=String(read("data-href",""));
  const variant=String(read("data-variant","pulse"));
  const style={"--sb-pulse-color":String(read("data-pulse-color","currentColor")),"--sb-pulse-duration":String(read("data-duration","1.5s")),"--sb-pulse-distance":String(read("data-distance","8px"))};
  const className=["sb-pulsating-button","sb-pulsating-button--"+variant,(props&&props.className)||""].filter(Boolean).join(" ");
  const content=<><span className="sb-pulsating-button__label">{label}</span><span className="sb-pulsating-button__pulse"/></>;
  if(href)return <a ref={rootRef} href={href} className={className} style={style}>{content}</a>;
  return <button ref={rootRef} type="button" className={className} style={style}>{content}</button>;
}
