import {sf,useSF} from '../service/superFetch'
const api= (baseURl)=>({
 // get all products
 getAll:async(url)=>(await sf.get(`${baseURl}/${url}`)),
})
export default api