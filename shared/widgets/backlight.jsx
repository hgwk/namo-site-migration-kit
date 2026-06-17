// backlight — simple blurred saturated glow behind label/html content.
export default function BacklightWidget(props){
  const rootRef=useRef(null);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='backlight']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  const html=read("data-html","");
  const label=String(read("data-label","Backlight"));
  const blur=Number(read("data-blur",20));
  const color=String(read("data-color","currentColor"));
  const style={"--sb-backlight-blur":blur+"px","--sb-backlight-color":color};
  return <div ref={rootRef} className={["sb-backlight",(props&&props.className)||""].filter(Boolean).join(" ")} style={style}>{html?<span dangerouslySetInnerHTML={{__html:String(html)}}/>:<span>{label}</span>}</div>;
}
