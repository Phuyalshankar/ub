import { createAdvancedStore } from "../base/store";
const api= createAdvancedStore({
   products:[],
   error:null,
   loading:false
})
const getAll= async()=>{
  const products= await api.call("products",fetch('https://fakeapostore.com/products'));
  retun products;
}