// interactive-hover-button — expanding dot hover CTA.
export default function InteractiveHoverButtonWidget(props){
  const rootRef=useRef(null);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='interactive-hover-button']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  const label=String(read("data-label","Learn more"));
  const href=String(read("data-href",""));
  const className=["sb-hover-button",(props&&props.className)||""].filter(Boolean).join(" ");
  const content=<><span className="sb-hover-button__base"><i/><span>{label}</span></span><span className="sb-hover-button__hover"><span>{label}</span><b>→</b></span></>;
  if(href)return <a ref={rootRef} className={className} href={href}>{content}</a>;
  return <button ref={rootRef} className={className} type="button">{content}</button>;
}
