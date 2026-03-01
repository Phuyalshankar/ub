import { api,createApiResource } from "./store";
import {superFetch } from "../hooks/service/map";
//start crud promise
  const crud={
     addData: (endpoint,formData)=>api.superFetch(`${api.get('baseUrl')}/${endpoint}`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(formData),

     }),
     updateData:(endpoint,updatData,id)=> api.superFetch(`${api.get('baseUrl')}/${endpoint}/${id}`,{
          method:'PUT',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(updatData)
     }),
     deleteData:(id,endpoint)=>api.superFetch(`${api.get('baseUrl')}/${endpoint}/${id}`,{
          method:'DELETE',
          headers:{
               'Content-Type':'application/json'
          }

     })
     

  }
 
 