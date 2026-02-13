const create= (init)=>{
    const state= init;
    const getState= ()=> state;
    return {getState};
}

 const store= create({name:"shankar"});
  console.log(store.getState())
