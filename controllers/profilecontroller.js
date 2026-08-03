const pool  = require("../config/dbconnect");
const nodeMailer = require('nodemailer');
const bcrypt = require('bcrypt');
const {Resend} = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const profilecontroller = async(req,res)=>{
    try {
        if(!req.user || !req.user.id) return res.status(401).json({success: false , message: `user not authenticated`});
        const id = req.user.id;
        const [rows] = await pool.query('SELECT * FROM users where id=?',[id]);
        if(!rows || rows.length == 0) return res.status(402).json({success: false , message: `user not found in db`});
        const foundUser = rows[0];
        delete foundUser.pass;
        delete foundUser.ip_address;
        console.log(foundUser);
        res.json({
            success: true,
            message: `user has been found successfully`,
            foundUser
        })
    } catch (error) {
        console.log(`fetch profile error: ${error}`);
    }
}
const pendingData = new Map();
const ttl = 1000*60*2;
const createOtp = ()=>{
    return Math.floor(100000 + Math.random()*900000);
} 
const updateProfile = async(req,res)=>{
    const {first_name , last_name , email , password} = req.body;
    try {
        if(!first_name && !last_name  && !password){
            return res.json({success:false,message:'You should input at least one field'});
        }
        const [rows] = await pool.query('SELECT fname,lname,pass FROM users WHERE email=?',[email]);
        if(!rows || rows.length == 0 ) return res.json({success:false,message:'There is no data for that email'});
        const data = rows[0];
        let matchPass;
        if(password){
            matchPass = await bcrypt.compare(password, data.pass);
        }else{
            matchPass = true;
        }
        if(first_name == data.fname && last_name == data.lname && matchPass) return res.json({success: false,message: 'You do not change anything'});
        const finalPass = password ? await bcrypt.hash(password,10) : data.pass;
        if (first_name == data.fname && last_name == data.lname && matchPass){
            return res.json({success:false,message:'You did not change anything'});
        }
        const otp = createOtp();
        pendingData.set(email,{first_name,last_name,email,password: finalPass,otp:otp,expires_at:Date.now()+ttl});
        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: 'OTP Verification',
            html:`
            <h2>OTP Verification</h2>
            <h1>${otp}</h1>
            <p>Valid for just 2 minutes</p>
            `
        });
        res.json({success:true,email,message:'waiting for verification'});
    } catch (error) {
        console.log(error);
    }
}
const verifyOtpProfile = async(req,res)=>{
    const {email,userotp} = req.body;
    try {
        const pending = pendingData.get(email);
        if(!pending) return res.status(404).json({success: false ,message:`there is no stored emails`});
        if(Date.now() > pending.expires_at) return res.json({success:false, expired: true,message:`code is expired please sign up again`});
        if(String(pending.otp) !== String(userotp)) return res.json({success:false, message:`invalid code. please try again`});
        const [rows] = await pool.query('UPDATE users SET fname = ?, lname = ?, pass = ?, modified_at = NOW() WHERE email = ?', [pending.first_name , pending.last_name , pending.password, email]);
        if(rows.affectedRows == 0 || !rows) return res.status(400).json({success: false, message:'There is not any user found'});
        pendingData.delete(email);
        res.json({success:true, message:"Profile has been updated successfully"});
    } catch (error) {
        console.log(error);
    }
}
module.exports = {
    profilecontroller,
    updateProfile,
    verifyOtpProfile
};
