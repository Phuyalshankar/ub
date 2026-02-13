// /src/lib/ub/hooks.js
// Universal Binary React Hooks v7.2
// Fully refactored, all exports, value mapping for UB

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import UniversalParser from "./parser";
import getStyleManager from "./manager";

/* ---------------- Helpers ---------------- */
const clamp = (v, min=0, max=255) => Math.max(min, Math.min(max, v));

const mapRange = (value, inMin, inMax, outMin=0, outMax=255) => {
  const clamped = Math.max(inMin, Math.min(inMax, value));
  return Math.round(((clamped - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin);
};

const parseProperties = (classes) =>
  classes.reduce((acc, cls) => {
    const p = UniversalParser.parse(cls);
    if (p) acc[p.property] = p.value;
    return acc;
  }, {});

/* ---------------- useUB ---------------- */
export const useUB = (initialClasses = [], options = {}) => {
  const {
    elementRef = null,
    autoInject = true,
    enableAnimations = true,
    animationDuration = 300,
    animationEasing = "cubic-bezier(0.4,0,0.2,1)",
    enableHover = false,
    enableFocus = false,
    enableActive = false,
    scrollEffect = null,
    preserveExisting = true,
  } = options;

  const [classes, setClasses] = useState(initialClasses);
  const [properties, setProperties] = useState(() => parseProperties(initialClasses));
  const [activeStates, setActiveStates] = useState({
    hover: false,
    focus: false,
    active: false,
    scroll: 0,
  });

  const manager = useMemo(() => getStyleManager(), []);
  const classesRef = useRef(classes);
  const animationRef = useRef(null);

  useEffect(() => { classesRef.current = classes; }, [classes]);

  const injectAll = useCallback(
    (cls) => {
      manager.inject(cls);
      if (enableHover) manager.injectWithState(cls, "hover", 30);
      if (enableFocus) manager.injectWithState(cls, "focus", 20);
      if (enableActive) manager.injectWithState(cls, "active", 40);
      if (scrollEffect) manager.injectWithScroll(cls, scrollEffect);
    },
    [manager, enableHover, enableFocus, enableActive, scrollEffect]
  );

  useEffect(() => { if(autoInject) initialClasses.forEach(injectAll); }, []);

  const toggleState = useCallback((state, enabled) => {
    setActiveStates(p => ({ ...p, [state]: enabled }));
    if(!elementRef?.current) return;
    classesRef.current.forEach(cls => {
      elementRef.current.classList[enabled?"add":"remove"](`${cls}:${state}`);
    });
  }, [elementRef]);

  useEffect(() => {
    if(!elementRef?.current) return;
    const el = elementRef.current;
    manager.apply(el, classes, { preserveExisting });
    const listeners = [];
    const add = (e, fn, opts) => { el.addEventListener(e, fn, opts); listeners.push({e,fn,opts}); };

    if(enableHover){ add("mouseenter",()=>toggleState("hover",true)); add("mouseleave",()=>toggleState("hover",false)); }
    if(enableFocus){ add("focus",()=>toggleState("focus",true), true); add("blur",()=>toggleState("focus",false), true); }
    if(enableActive){ 
      add("mousedown",()=>toggleState("active",true));
      add("mouseup",()=>toggleState("active",false));
      add("touchstart",()=>toggleState("active",true));
      add("touchend",()=>toggleState("active",false));
    }

    return ()=>listeners.forEach(({e,fn,opts})=>el.removeEventListener(e,fn,opts));
  }, [classes, elementRef, enableHover, enableFocus, enableActive, preserveExisting, toggleState, manager]);

  const add = useCallback((...newClasses)=>{
    setClasses(prev=>{
      const updated = [...prev];
      newClasses.forEach(c=>{
        if(!updated.includes(c)){
          if(autoInject) injectAll(c);
          updated.push(c);
        }
      });
      return updated;
    });
    setProperties(p=>({...p,...parseProperties(newClasses)}));
  }, [injectAll, autoInject]);

  const remove = useCallback(cls=>{
    setClasses(p=>p.filter(c=>c!==cls));
    const prop = UniversalParser.parse(cls);
    if(prop) setProperties(p=>{const copy={...p}; delete copy[prop.property]; return copy;});
  }, []);

  const set = useCallback(newClasses=>{
    if(autoInject) newClasses.forEach(injectAll);
    setClasses(newClasses);
    setProperties(parseProperties(newClasses));
  }, [injectAll, autoInject]);

  const clear = useCallback(()=>{ setClasses([]); setProperties({}); if(elementRef?.current) manager.clear(elementRef.current); }, [elementRef, manager]);

  const updateProperty = useCallback((property, value, maxValue=255)=>{
    const mapped = mapRange(value, 0, maxValue);
    add(`ub-${property}-${mapped}`);
  }, [add]);

  const morph = useCallback((targetClasses, opt={})=>{
    if(!enableAnimations || !elementRef?.current){ set(targetClasses); return; }
    manager.animate(elementRef.current, targetClasses, { duration: opt.duration||animationDuration, easing: opt.easing||animationEasing });
    set(targetClasses);
  }, [elementRef, enableAnimations, animationDuration, animationEasing, set, manager]);

  const css = useCallback(()=>UniversalParser.toCSSAll(classesRef.current), []);
  const style = useMemo(()=>UniversalParser.toReactStyle(classes), [classes]);
  const createAnimation = useCallback((name,keyframes)=>manager.createAnimation(name,keyframes),[manager]);
  const animate = useCallback((name,opt={})=>{
    if(!elementRef?.current) return;
    const {duration=1000, delay=0, iterations=1} = opt;
    elementRef.current.style.animation = `${name} ${duration}ms ${delay}ms ${iterations}`;
    const t=setTimeout(()=>{if(elementRef.current) elementRef.current.style.animation=""}, duration+delay);
    return ()=>clearTimeout(t);
  },[elementRef]);

  return { classes, properties, activeStates, add, remove, set, clear, updateProperty, morph, createAnimation, animate, css, style, isValid:UniversalParser.isValid, generate:UniversalParser.generate };
};

/* ---------------- useUBProperty ---------------- */
export const useUBProperty = (property, initialValue=128, options={})=>{
  const [value,setValue]=useState(initialValue);
  const manager=useMemo(()=>getStyleManager(),[]);
  useEffect(()=>{manager.inject(`ub-${property}-${clamp(initialValue)}`)},[]);
  const update=useCallback((v, maxValue=255)=>{ const mapped = mapRange(v,0,maxValue); setValue(mapped); manager.inject(`ub-${property}-${mapped}`)},[property,manager]);
  return { value, update, className:`ub-${property}-${value}` };
};

/* ---------------- useUBResponsive ---------------- */
export const useUBResponsive = (breakpoints)=>{
  const [bp,setBp]=useState(""); const [classes,setClasses]=useState([]);
  const manager=useMemo(()=>getStyleManager(),[]);
  const BP={sm:640, md:768, lg:1024, xl:1280};
  const handle=useCallback(()=>{
    const w=window.innerWidth;
    for(let k in BP){
      if(w<BP[k] && breakpoints[k]){
        setBp(k); setClasses(breakpoints[k]); breakpoints[k].forEach(c=>manager.inject(c)); break;
      }
    }
  },[breakpoints,manager]);
  useEffect(()=>{handle(); window.addEventListener("resize",handle); return()=>window.removeEventListener("resize",handle)},[handle]);
  return {classes, breakpoint:bp, isMobile:bp==="sm"||bp==="md", isTablet:bp==="lg", isDesktop:bp==="xl"};
};

/* ---------------- useUBScroll ---------------- */
export const useUBScroll=(thresholds=[0,0.25,0.5,0.75,1])=>{
  const [scrollProgress,setScrollProgress]=useState(0);
  const [thresholdIndex,setThresholdIndex]=useState(0);
  const elementRef=useRef(null);
  const rafRef=useRef(null);
  useEffect(()=>{
    const handle=()=>{
      if(rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current=requestAnimationFrame(()=>{
        if(!elementRef.current) return;
        const rect=elementRef.current.getBoundingClientRect();
        const vh=window.innerHeight;
        let progress = 0;
        if(rect.top<vh && rect.top+rect.height>0) progress=Math.min(1,Math.max(0,(vh-rect.top)/rect.height));
        else progress=rect.top+rect.height<=0?0:1;
        setScrollProgress(progress);
        const idx=thresholds.findIndex(t=>progress<=t);
        setThresholdIndex(idx>=0?idx:thresholds.length-1);
      });
    };
    window.addEventListener("scroll",handle,{passive:true}); handle();
    return ()=>{window.removeEventListener("scroll",handle); if(rafRef.current) cancelAnimationFrame(rafRef.current)};
  },[thresholds]);
  const scrollTo=useCallback((progress)=>{
    if(!elementRef.current) return;
    const rect=elementRef.current.getBoundingClientRect();
    const target=window.scrollY+rect.top-window.innerHeight*(1-progress);
    window.scrollTo({top:target, behavior:"smooth"});
  },[]);
  return {scrollProgress, thresholdIndex, elementRef, scrollTo, isInView:scrollProgress>0&&scrollProgress<1, isAboveView:scrollProgress===0, isBelowView:scrollProgress===1};
};

/* ---------------- useUBSequence ---------------- */
export const useUBSequence=(sequence,options={})=>{
  const {interval=1000, loop=true, autoplay=false, onStepChange=null, onComplete=null}=options;
  const [currentStep,setCurrentStep]=useState(0);
  const [isPlaying,setIsPlaying]=useState(false);
  const [isReversed,setIsReversed]=useState(false);
  const timerRef=useRef(null);
  const manager=useMemo(()=>getStyleManager(),[]);
  useEffect(()=>{sequence.flat().forEach(c=>manager.inject(c))},[]);
  const play=useCallback(()=>{
    if(isPlaying) return; setIsPlaying(true);
    timerRef.current=setInterval(()=>{setCurrentStep(prev=>{
      const next=isReversed?prev-1:prev+1;
      if((!isReversed&&next>=sequence.length)||(isReversed&&next<0)){
        if(loop){const reset=isReversed?sequence.length-1:0; onStepChange?.(reset); return reset;}
        else{clearInterval(timerRef.current); setIsPlaying(false); onComplete?.(); return isReversed?0:sequence.length-1;}
      }
      onStepChange?.(next); return next;
    })}, interval);
  },[sequence,interval,loop,isReversed,isPlaying,onStepChange,onComplete]);
  const pause=useCallback(()=>{setIsPlaying(false); if(timerRef.current){clearInterval(timerRef.current); timerRef.current=null;}},[]);
  const reset=useCallback(()=>{pause(); setCurrentStep(0); setIsReversed(false);},[pause]);
  const reverse=useCallback(()=>{setIsReversed(p=>!p)},[]);
  const next=useCallback(()=>{pause(); setCurrentStep(p=>Math.min(p+1,sequence.length-1))},[sequence,pause]);
  const prev=useCallback(()=>{pause(); setCurrentStep(p=>Math.max(p-1,0))},[sequence,pause]);
  const goTo=useCallback((step)=>{pause(); setCurrentStep(Math.max(0,Math.min(step,sequence.length-1)))},[sequence,pause]);
  useEffect(()=>{if(autoplay&&!isPlaying) play(); return ()=>{if(timerRef.current){clearInterval(timerRef.current); timerRef.current=null}}},[autoplay,play,isPlaying]);
  const currentClasses=useMemo(()=>sequence[currentStep]||[],[sequence,currentStep]);
  const progress=useMemo(()=>currentStep/(sequence.length-1)||0,[currentStep,sequence]);
  return {currentClasses,currentStep,isPlaying,isReversed,play,pause,reset,reverse,next,prev,goTo,progress};
};
