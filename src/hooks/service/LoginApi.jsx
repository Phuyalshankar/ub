import store from "../mystore";
import { sf } from "./superFetch";
 export const loginApi= {
    login:async(username,password)=>{
     store.setMany({
        loading:true,
        success:null,
        error:null
     })
      const res= await sf.post('auth/login',{username,password})
      if(res.success && res.data){
         store.setMany({
            loading:false,
            token:res.data.token,
         })
         localStorage.setItem('access_token',res.data.token);
        store.setTemp('success','Login Success',3000);
        return true;
      }
        store.setTemp('error',res.error,3000);
        store.set('loading',false);
        return false;
    },
    getAll:async()=>{
        store.setMany({
            error:null,
            success:null,
            loading:true
        })
        const res= await sf.get('/produces',{litmit:10});
         if(res.success && res.data){
             store.setMany({
                loading:false,
                products:res.data,
             })
             store.setTemp('success','fetch success',3000);
             return true;
         }
         store.setTemp('error',res.error || 'error to get products');
         store.set('loading',false);
         return false
    }

 }