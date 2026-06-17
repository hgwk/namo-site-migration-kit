// orbiting-circles — Namo-compatible orbiting item widget.
// Usage:
// <widget-placeholder
//   data-widget-id="orbiting-circles"
//   data-items='["KR","US","JP","IL"]'
//   data-radius="160"
//   data-duration="20"
// ></widget-placeholder>
export default function OrbitingCirclesWidget(props){
  const rootRef=useRef(null);
  const read=(name,fb)=>{
    const p=props&&props[name];
    if(p!=null)return p;
    const camel=name.replace(/^data-/,"").replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    if(props&&props[camel]!=null)return props[camel];
    const root=rootRef.current;
    const host=root&&(root.closest("[data-widget-id='orbiting-circles']")||root.parentElement);
    if(host&&host.getAttribute){
      const v=host.getAttribute(name)||host.getAttribute("data-"+name)||host.getAttribute("data-"+camel.replace(/[A-Z]/g,m=>"-"+m.toLowerCase()));
      if(v!=null)return v;
    }
    const ph=document.querySelector("[data-widget-id='orbiting-circles']");
    if(ph&&ph.getAttribute){
      const v=ph.getAttribute(name)||ph.getAttribute("data-"+name);
      if(v!=null)return v;
    }
    return fb;
  };
  const bool=(name,fb)=>{const v=read(name,fb?"true":"false");return v===true||v==="true"||v==="1"||v==="yes";};
  const num=(name,fb)=>{const v=Number(read(name,fb));return Number.isFinite(v)?v:fb;};
  const parseItems=()=>{
    const raw=read("data-items","");
    if(raw){
      try{
        const parsed=JSON.parse(raw);
        if(Array.isArray(parsed))return parsed;
      }catch(_e){
        return String(raw).split("|").map(s=>s.trim()).filter(Boolean);
      }
    }
    return ["KR","US","JP","IL"];
  };
  const items=parseItems();
  const radius=num("data-radius",160);
  const duration=num("data-duration",20)/Math.max(.1,num("data-speed",1));
  const iconSize=num("data-icon-size",42);
  const reverse=bool("data-reverse",false);
  const path=bool("data-path",true);
  const size=radius*2+iconSize*2;
  const style={"--sb-orbit-radius":radius+"px","--sb-orbit-duration":duration+"s","--sb-orbit-size":iconSize+"px",width:size+"px",height:size+"px"};
  return (
    <div ref={rootRef} className={["sb-orbit",reverse?"sb-orbit--reverse":"",(props&&props.className)||""].filter(Boolean).join(" ")} style={style}>
      {path&&<div className="sb-orbit__path" />}
      {items.map((item,i)=>{
        const angle=(360/items.length)*i;
        return <OrbitItem item={item} angle={angle} key={(item&&item.id)||String(item)+"-"+i}/>;
      })}
    </div>
  );
}

function OrbitItem({item,angle}){
  const style={"--sb-orbit-angle":angle+"deg"};
  if(item&&typeof item==="object"){
    const html=item.html||item.content;
    const className=["sb-orbit__item",item.className||""].filter(Boolean).join(" ");
    if(html)return <div className={className} style={style} dangerouslySetInnerHTML={{__html:String(html)}} />;
    return <div className={className} style={style}>{item.image&&<img src={item.image} alt="" />}<span>{item.title||item.label||item.text||""}</span></div>;
  }
  return <div className="sb-orbit__item" style={style}>{String(item)}</div>;
}
