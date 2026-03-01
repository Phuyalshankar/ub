
import createFullStore,{createResource} from "../hooks/service/map";
const store= createFullStore({
  baseUrl:'https://fakestoreapi.com',
  apiData:[],
  apiError:null,
  apiLoading:false,
  // sort filter
  sort:true,
  search:'',
  filter:'',
  range:[0,10000],

})
const apiResource=(endpoint,key)=>{
    return createResource(store,{
      key:key,
       fetcher:()=> store.api.get(`${store.baseUrl}/${endpoint}`),
      map:(res)=> res
    })
}
export {store,apiResource}