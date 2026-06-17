// ripple — decorative concentric ripple overlay.
export default function RippleWidget(props){
  const rootRef=useRef(null);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='ripple']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  const num=(name,fb)=>{const v=Number(read(name,fb));return Number.isFinite(v)?v:fb;};
  const main=num("data-size",210), opacity=num("data-opacity",0.24), count=Math.max(1,Math.floor(num("data-count",8)));
  return <div ref={rootRef} className={["sb-ripple",(props&&props.className)||""].filter(Boolean).join(" ")} aria-hidden="true">{Array.from({length:count}).map((_,i)=><span key={i} style={{width:main+i*70+"px",height:main+i*70+"px",opacity:Math.max(0,opacity-i*.03),animationDelay:i*.06+"s"}} />)}</div>;
}
