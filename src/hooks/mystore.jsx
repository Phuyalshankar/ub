import createStore from "./base/store";
const store= createStore({
    products:[],
    username:'',
    password:'',
    token:null,
    refreshToken:null,
    error:null,
    success:null,
    loading:false,
    user:[],
})
export default store;