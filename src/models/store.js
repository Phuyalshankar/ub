
import createFullStore,{createResource} from "../hooks/service/map";
const api= createFullStore({
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
const createApiResource=(endpoint,key)=>{
    return createResource(api,{
      key:key,
      fetcher:(res)=>api.superFetch(`${api.baseUrl}/${endpoint}`),
      map:(res)=> res
    })
}
export {api,createApiResource}