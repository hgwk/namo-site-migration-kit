// meteors — decorative meteor streaks. Place inside a positioned container.
export default function MeteorsWidget(props){
  const rootRef=useRef(null);
  const [styles,setStyles]=useState([]);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='meteors']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  const num=(name,fb)=>{const v=Number(read(name,fb));return Number.isFinite(v)?v:fb;};
  useEffect(()=>{
    const number=Math.max(1,Math.floor(num("data-number",20)));
    const minDelay=num("data-min-delay",0.2), maxDelay=num("data-max-delay",1.2);
    const minDuration=num("data-min-duration",2), maxDuration=num("data-max-duration",10);
    const angle=-num("data-angle",215)+"deg";
    setStyles(Array.from({length:number}).map(()=>({
      "--sb-meteor-angle":angle,
      left:Math.floor(Math.random()*(window.innerWidth||1200))+"px",
      animationDelay:(Math.random()*(maxDelay-minDelay)+minDelay)+"s",
      animationDuration:(Math.random()*(maxDuration-minDuration)+minDuration)+"s"
    })));
  },[]);
  return <div ref={rootRef} className={["sb-meteors",(props&&props.className)||""].filter(Boolean).join(" ")} aria-hidden="true">{styles.map((style,i)=><span className="sb-meteor" style={style} key={i}><i /></span>)}</div>;
}
