// ripple-button — click ripple button/link. href links render as anchors without click ripple.
export default function RippleButtonWidget(props){
  const rootRef=useRef(null);
  const [ripples,setRipples]=useState([]);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='ripple-button']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  const label=String(read("data-label","Click"));
  const href=String(read("data-href",""));
  const duration=String(read("data-duration","600ms"));
  const style={"--sb-ripple-color":String(read("data-ripple-color","#ffffff")),"--sb-ripple-duration":duration};
  useEffect(()=>{
    if(!ripples.length)return;
    const t=setTimeout(()=>setRipples(rs=>rs.slice(1)),parseInt(duration,10)||600);
    return()=>clearTimeout(t);
  },[ripples,duration]);
  const click=e=>{
    const btn=e.currentTarget, rect=btn.getBoundingClientRect(), size=Math.max(rect.width,rect.height);
    setRipples(rs=>[...rs,{x:e.clientX-rect.left-size/2,y:e.clientY-rect.top-size/2,size,key:Date.now()}]);
  };
  const className=["sb-ripple-button",(props&&props.className)||""].filter(Boolean).join(" ");
  const content=<><span className="sb-ripple-button__label">{label}</span><span className="sb-ripple-button__ripples">{ripples.map(r=><i key={r.key} style={{width:r.size+"px",height:r.size+"px",left:r.x+"px",top:r.y+"px"}} />)}</span></>;
  if(href)return <a ref={rootRef} className={className} style={style} href={href}>{content}</a>;
  return <button ref={rootRef} className={className} style={style} type="button" onClick={click}>{content}</button>;
}
