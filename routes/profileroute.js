const express = require('express');
const verifyjwt = require('../middleware/verifyjwt');
const router = express.Router();
const profilecontroller = require('../controllers/profilecontroller');
router.use(verifyjwt);
router.get('/',profilecontroller.profilecontroller);
router.post('/',profilecontroller.updateProfile);
router.post('/verify-otp',profilecontroller.verifyOtpProfile);
// router.get('/',(req,res)=>{
//     res.json({success: true , message: `you have reached protected route (profile)`});
//     console.log('you have reached protected route (profile)');
// });
module.exports = router;