// nano-store.ts - SIMPLIFIED FIX
import { useSyncExternalStore, useCallback, useRef } from 'react'

type Listener = () => void
type Selector<T> = (state: T) => any

// 🚀 Simple Helper
const shallowEqual = (objA: any, objB: any): boolean => {
  if (Object.is(objA, objB)) return true
  if (typeof objA !== 'object' || objA === null || 
      typeof objB !== 'object' || objB === null) return false
  
  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)
  if (keysA.length !== keysB.length) return false
  
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key) || 
        !Object.is(objA[key], objB[key])) {
      return false
    }
  }
  return true
}

// 🚀 Main Store Function
export function createStore<T extends Record<string, any>>(initial: T) {
  let state = { ...initial }
  const listeners = new Set<Listener>()
  const activeTimeouts = new Map<keyof T, NodeJS.Timeout>()
  
  const notify = () => listeners.forEach(l => l())
  const subscribe = (listener: Listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }
  
  // 🔧 Core Methods
  const set = (key: keyof T, value: any) => {
    if (Object.is(state[key], value)) return
    state = { ...state, [key]: value }
    notify()
  }
  
  const setMany = (updates: Partial<T>) => {
    let hasChanged = false
    const newState = { ...state }
    
    for (const key in updates) {
      if (!Object.is(state[key], updates[key])) {
        newState[key] = updates[key] as any
        hasChanged = true
      }
    }
    
    if (hasChanged) {
      state = newState
      notify()
    }
  }
  
  const update = (fn: (s: T) => T) => {
    const newState = fn(state)
    if (!Object.is(state, newState)) {
      state = newState
      notify()
    }
  }
  
  const get = () => state
  const reset = () => {
    state = { ...initial }
    notify()
  }
  
  // 🆕 Temporary Setter
  const setTemp = (key: keyof T, value: any, duration = 2000) => {
    if (activeTimeouts.has(key)) {
      clearTimeout(activeTimeouts.get(key)!)
    }
    
    if (!Object.is(state[key], value)) {
      state = { ...state, [key]: value }
      notify()
    }
    
    const timeoutId = setTimeout(() => {
      if (!Object.is(state[key], initial[key])) {
        state = { ...state, [key]: initial[key] }
        notify()
      }
      activeTimeouts.delete(key)
    }, duration)
    
    activeTimeouts.set(key, timeoutId)
    return () => {
      clearTimeout(timeoutId)
      activeTimeouts.delete(key)
    }
  }
  
  // 🎯 FIXED React Hooks
  const use = <K extends keyof T>(key: K): T[K] => {
    const getSnapshot = useCallback(() => state[key], [key])
    const getServerSnapshot = useCallback(() => initial[key], [key])
    
    return useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot
    )
  }
  
  const useStore = <S>(selector?: Selector<T>): S => {
    const getSnapshot = useCallback(() => {
      return (selector || ((s: T) => s))(state) as S
    }, [selector])
    
    const getServerSnapshot = useCallback(() => {
      return (selector || ((s: T) => s))(initial) as S
    }, [selector])
    
    return useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot
    )
  }
  
  // 🆕 Dot Notation Support
  const usePath = (path: string) => {
    const lastValue = useRef<any>(null)
    
    const getSnapshot = useCallback(() => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], state)
      if (Object.is(lastValue.current, value)) return lastValue.current
      lastValue.current = value
      return value
    }, [path])
    
    const getServerSnapshot = useCallback(() => {
      return path.split('.').reduce((obj, key) => obj?.[key], initial)
    }, [path])
    
    return useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot
    )
  }
  
  // 🆕 Smart Pick
  const usePick = (...paths: string[]) => {
    const lastValues = useRef<any>(null)
    
    const getSnapshot = useCallback(() => {
      const currentValues: Record<string, any> = {}
      
      paths.forEach(path => {
        currentValues[path] = path.includes('.') 
          ? path.split('.').reduce((obj, key) => obj?.[key], state)
          : state[path]
      })
      
      if (shallowEqual(lastValues.current, currentValues)) {
        return lastValues.current
      }
      
      lastValues.current = currentValues
      return currentValues
    }, [paths.join(',')])
    
    const getServerSnapshot = useCallback(() => {
      const serverValues: Record<string, any> = {}
      
      paths.forEach(path => {
        serverValues[path] = path.includes('.') 
          ? path.split('.').reduce((obj, key) => obj?.[key], initial)
          : initial[path]
      })
      
      return serverValues
    }, [paths.join(',')])
    
    return useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot
    )
  }
  
  // 📝 Form Binding
  const bind = (key: keyof T) => ({
    value: state[key] ?? '',
    onChange: (e: any) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      set(key, value)
    }
  })
  
  const useBind = (key: keyof T) => {
    const value = use(key)
    const onChange = useCallback((e: any) => {
      const newValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      set(key, newValue)
    }, [key])
    
    return { value, onChange }
  }
  
  // 💾 Persistence
  const persist = (key: string) => {
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        setMany(parsed)
      }
      
      const unsubscribe = subscribe(() => {
        localStorage.setItem(key, JSON.stringify(state))
      })
      
      return unsubscribe
    } catch (e) {
      console.error('Persist error:', e)
    }
  }
  
  // Return API
  return {
    // Core
    get,
    set,
    setMany,
    update,
    reset,
    subscribe,
    
    // Temporary
    setTemp,
    
    // Hooks
    use,
    useStore,
    usePath,
    usePick,
    
    // Forms
    bind,
    useBind,
    
    // Features
    persist,
    
    // Shorthand
    $: use,
    $$: usePick,
    $path: usePath,
    $temp: setTemp
  }
}

// 🎯 SIMPLE Helper Functions
export function create<T extends Record<string, any>>(initial: T) {
  return createStore(initial)
}

export function atom<T>(initial: T) {
  const store = createStore({ value: initial })
  
  const useAtom = () => store.use('value')
  useAtom.set = (value: T) => store.set('value', value)
  useAtom.setTemp = (value: T, duration?: number) => 
    store.setTemp('value', value, duration)
  useAtom.get = () => store.get().value
  
  return useAtom
}

export default createStore