// theme-toggler — dependency-free theme toggle. Use only on sites that support both themes.
export default function ThemeTogglerWidget(props){
  const rootRef=useRef(null);
  const [dark,setDark]=useState(false);
  const read=(name,fb)=>{
    const p=props&&props[name];if(p!=null)return p;
    const root=rootRef.current, host=root&&(root.closest("[data-widget-id='theme-toggler']")||root.parentElement);
    if(host&&host.getAttribute){const v=host.getAttribute(name)||host.getAttribute("data-"+name);if(v!=null)return v;}
    return fb;
  };
  useEffect(()=>{
    const stored=localStorage.getItem("theme");
    const isDark=stored?stored==="dark":document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark",isDark);
    setDark(isDark);
  },[]);
  const toggle=()=>{
    const next=!dark;
    const apply=()=>{document.documentElement.classList.toggle("dark",next);localStorage.setItem("theme",next?"dark":"light");setDark(next);};
    if(document.startViewTransition){
      const rect=rootRef.current?.getBoundingClientRect();
      const x=rect?rect.left+rect.width/2:innerWidth/2, y=rect?rect.top+rect.height/2:innerHeight/2;
      const r=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
      const vt=document.startViewTransition(apply);
      vt.ready.then(()=>document.documentElement.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${r}px at ${x}px ${y}px)`]},{duration:Number(read("data-duration",400)),easing:"ease-in-out",pseudoElement:"::view-transition-new(root)"}));
    }else apply();
  };
  return <button ref={rootRef} type="button" className={["sb-theme-toggle",(props&&props.className)||""].filter(Boolean).join(" ")} onClick={toggle} aria-label="Toggle theme">{dark?<span>☀</span>:<span>☾</span>}</button>;
}
