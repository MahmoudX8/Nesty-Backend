const allowedorigins = require("./allowedorigins");
const corsoptions = {
    origin:(origin,callback)=>{
        if(allowedorigins.indexOf(origin) !== -1 || !origin){
            callback(null,true);
        }else{
            callback(new Error({message: "Not Allowed BY CORS"}));
        }
    },
    credentials: true,
    optionSuccessStatus:200
}
module.exports = corsoptions;