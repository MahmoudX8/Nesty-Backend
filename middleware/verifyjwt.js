const jwt = require("jsonwebtoken");

const verifyjwt = (req,res,next)=>{
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if(!authHeader?.startsWith('Bearer ')) return res.status(401).json({success: false , message: `Unauthorized`});
    // console.log(`auth header: `,authHeader);
    const token = authHeader.split(" ")[1];
    // console.log(`token: `,token);
    jwt.verify(token , process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
        if(err){return res.status(403).json({success: false , message: `token is expired. Forbeddin`})};
        req.user = decoded.userInfo;
        next();
    })
};
module.exports = verifyjwt;