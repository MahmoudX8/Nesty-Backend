const express = require('express');
const router = express.Router();
const authcontroller = require('../controllers/authcontroller');
const verifyjwt = require('../middleware/verifyjwt');


router.route('/signup').post(authcontroller.signup);
router.route('/login').post(authcontroller.login);
router.route('/logout').post(authcontroller.logout);
router.route('/refresh').post(authcontroller.refresh);
router.route('/me').post(authcontroller.me);
router.route('/verify-otp/signup').post(authcontroller.verifyOtpSignup);
router.route('/forgetpassword').post(authcontroller.forgetPass);
router.route('/verify-otp/forgetpassword').post(authcontroller.verifyOtpForget);
router.route('/changepassword').post(verifyjwt,authcontroller.changePass);

module.exports = router;