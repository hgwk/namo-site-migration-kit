// animated-list — Namo-compatible sequential list reveal.
// Usage:
// <widget-placeholder
//   data-widget-id="animated-list"
//   data-items='["Market research","Sales partner discovery","Customer success"]'
//   data-delay="1000"
// ></widget-placeholder>
export default function AnimatedListWidget(props){
  const rootRef=useRef(null);
  const [index,setIndex]=useState(0);
  const read=(name,fb)=>{
    const p=props&&props[name];
    if(p!=null)return p;
    const camel=name.replace(/^data-/,"").replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    if(props&&props[camel]!=null)return props[camel];
    const root=rootRef.current;
    const host=root&&(root.closest("[data-widget-id='animated-list']")||root.parentElement);
    if(host&&host.getAttribute){
      const v=host.getAttribute(name)||host.getAttribute("data-"+name)||host.getAttribute("data-"+camel.replace(/[A-Z]/g,m=>"-"+m.toLowerCase()));
      if(v!=null)return v;
    }
    const ph=document.querySelector("[data-widget-id='animated-list']");
    if(ph&&ph.getAttribute){
      const v=ph.getAttribute(name)||ph.getAttribute("data-"+name);
      if(v!=null)return v;
    }
    return fb;
  };
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
    return ["Market research","Go-to-market strategy","Sales representation","Customer success"];
  };
  const items=parseItems();
  const delay=Math.max(80,num("data-delay",1000));
  const max=Math.max(1,Math.floor(num("data-max",items.length)));
  useEffect(()=>{
    if(index>=items.length-1)return;
    const t=setTimeout(()=>setIndex(i=>Math.min(items.length-1,i+1)),delay);
    return()=>clearTimeout(t);
  },[index,delay,items.length]);
  const shown=items.slice(0,index+1).slice(-max).reverse();
  return (
    <div ref={rootRef} className={["sb-animated-list",(props&&props.className)||""].filter(Boolean).join(" ")}>
      {shown.map((item,i)=><AnimatedListItem item={item} key={(item&&item.id)||String(item)+"-"+i}/>)}
    </div>
  );
}

function AnimatedListItem({item}){
  if(item&&typeof item==="object"){
    const html=item.html||item.content;
    const className=["sb-animated-list__item",item.className||""].filter(Boolean).join(" ");
    if(html)return <div className={className} dangerouslySetInnerHTML={{__html:String(html)}} />;
    return <div className={className}>{item.image&&<img src={item.image} alt="" />}<span>{item.title||item.label||item.text||""}</span></div>;
  }
  return <div className="sb-animated-list__item">{String(item)}</div>;
}
