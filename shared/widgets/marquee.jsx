// marquee — reusable Namo-compatible marquee widget.
// Usage:
// <widget-placeholder
//   data-widget-id="marquee"
//   data-items='["Market Entry","Sales Representation","Marketing & PR"]'
//   data-repeat="4"
//   data-duration="40s"
//   data-gap="1rem"
//   data-pause-on-hover="true"
// ></widget-placeholder>
export default function MarqueeWidget(props){
  const rootRef=useRef(null);
  const read=(name,fb)=>{
    const p=props&&props[name];
    if(p!=null)return p;
    const camel=name.replace(/^data-/,"").replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    if(props&&props[camel]!=null)return props[camel];
    const root=rootRef.current;
    const host=root&&(root.closest("[data-widget-id='marquee']")||root.parentElement);
    if(host&&host.getAttribute){
      const v=host.getAttribute(name)||host.getAttribute("data-"+name)||host.getAttribute("data-"+camel.replace(/[A-Z]/g,m=>"-"+m.toLowerCase()));
      if(v!=null)return v;
    }
    const ph=document.querySelector("[data-widget-id='marquee']");
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
    return ["Market Entry","Sales Representation","Marketing & PR","Localization","Partnership","Customer Success"];
  };
  const vertical=bool("data-vertical",false);
  const reverse=bool("data-reverse",false);
  const pauseOnHover=bool("data-pause-on-hover",false);
  const repeat=Math.max(1,Math.floor(num("data-repeat",4)));
  const duration=String(read("data-duration","40s"));
  const gap=String(read("data-gap","1rem"));
  const items=parseItems();
  const className=[
    "sb-marquee",
    vertical?"sb-marquee--vertical":"sb-marquee--horizontal",
    reverse?"sb-marquee--reverse":"",
    pauseOnHover?"sb-marquee--pause":"",
    (props&&props.className)||""
  ].filter(Boolean).join(" ");
  const style={"--sb-marquee-duration":duration,"--sb-marquee-gap":gap};
  return (
    <div ref={rootRef} className={className} style={style}>
      {Array.from({length:repeat}).map((_,i)=>(
        <div className="sb-marquee__track" key={i} aria-hidden={i>0?"true":undefined}>
          {items.map((item,j)=><MarqueeItem item={item} key={j}/>)}
        </div>
      ))}
    </div>
  );
}

function MarqueeItem({item}){
  if(item&&typeof item==="object"){
    const html=item.html||item.content;
    const className=["sb-marquee__item",item.className||""].filter(Boolean).join(" ");
    if(html)return <div className={className} dangerouslySetInnerHTML={{__html:String(html)}} />;
    return <div className={className}>{item.image&&<img src={item.image} alt="" />}<span>{item.title||item.label||item.text||""}</span></div>;
  }
  return <div className="sb-marquee__item">{String(item)}</div>;
}
