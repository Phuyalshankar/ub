// store.ts
import createFullStore from './service/map';

  export const store = createFullStore({
  baseUrl:'https://fakestoreapi.com',
  apiData: [],         // API बाट आउने सामानहरू
  apiLoading: false, // लोड भइरहेको छ कि छैन?
  apiError: null,    // केही इरर आएमा
  apiDataSerch: ''  ,
   apiDataRange:[0,1000000] ,
   apiSort:'asc',
   apiFilter:''     
});
// get all needed data from store
const {$async,superFetch,$data,set,baseUrl}= store;
// promist banaune 
const promise={
   getAll:async()=> superFetch(`${baseUrl}/products`),
   getby:async()
}
