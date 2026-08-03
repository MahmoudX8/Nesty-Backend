const jwt = require("jsonwebtoken");
const pool  = require("../config/dbconnect");
const bcrypt  = require("bcrypt");
const axios = require("axios");

const pendingEmails = new Map();
const otp_ttl = 1000*60*2;
const createOtp = ()=>{
    return Math.floor(100000+Math.random()*900000);
}
const signup = async (req,res)=>{
    const { first_name , last_name , email , pass } = req.body;
    const ip = req.ip;
    if(!first_name || !last_name || !email || !pass) return res.status(401).json({message: `please fill all the spaces`});
    const cleanEmail = email.trim().toLowerCase();
    try {
        const [rows] = await pool.query(`SELECT * FROM users WHERE email = ?`,[cleanEmail]);
        if(rows && rows.length > 0) return res.status(400).json({message: `user already exist`});
        const hashedPass = await bcrypt.hash(pass , 10);
        const otp = createOtp();
        pendingEmails.set(cleanEmail,{fname: first_name, lname: last_name, email:cleanEmail, pass: hashedPass , ip:ip, otp:otp , expires_at: Date.now()+otp_ttl});

        await axios.post("https://api.brevo.com/v3/smtp/email",{
        sender: {
            name: "Nesty Website",
            email: process.env.GMAIL_USER,
        },
        to: [
            {
                email: cleanEmail,
            },
        ],
        subject: "OTP Verification",
        htmlContent: `
            <h2>OTP Verification</h2>
            <h1>${otp}</h1>
            <p>Valid for just 2 minutes</p>
        `,
    },{headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json",
        },}
);
        res.json({success: true, email: cleanEmail ,message:`waiting for otp code`});
    } catch (error) {
        console.log("signup error: ",error);
        res.status(500).json({
            success: false,
            message: "server error"
        })
    }
}
const verifyOtpSignup = async(req,res)=>{
    try {
        const {email, userotp} = req.body;
        if(!email || !userotp) return res.status(401).json({message: `please fill all the spaces`});
        const cleanEmail = email.trim().toLowerCase();
        const pending = pendingEmails.get(cleanEmail);
        if(!pending) return res.status(401).json({success: false ,message:`there is no stored emails`});
        if(Date.now() > pending.expires_at){
            return res.json({success:false, expired:true,message:`code is expired please sign up again`});
        }
        if(String(pending.otp) !== String(userotp)){
            return res.json({success:false, message:`invalid code. please try again`});
        }
        const first_name = pending.fname;
        const last_name = pending.lname;
        const hashedPass = pending.pass;
        const ip = pending.ip;
        const [result] = await pool.query(`INSERT INTO users(fname,lname,email,pass,ip_address) VALUES(?,?,?,?,?)`,[first_name,last_name,cleanEmail,hashedPass,ip]);
        const userId = result.insertId;
        const member_role = result.member_role;
        const accessToken = jwt.sign({
            userInfo: {id: userId , member_role: member_role}},
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn: "60m"}
        );
        const refreshToken = jwt.sign({
            userInfo: {id: userId , member_role: member_role}},
            process.env.REFRESH_TOKEN_SECRET,
            {expiresIn: "7d"}
        );
        res.cookie("jwt",refreshToken,{
            secure: true,
            httpOnly: true,
            sameSite: 'none',
            maxAge: 7*24*3600*1000
        });
        res.json({
            accessToken,
            success: true,
            message: `account has been created successfully`,
            id: userId,
            first_name: first_name,
            member_role: member_role
        });
    } catch (error) {
        console.log(error)
    }
}
const login = async (req,res)=>{
    const { email , pass } = req.body;
    const ip = req.ip;
    if(!email || !pass) return res.status(401).json({message: `please fill all the spaces`, success: false});
    const cleanEmail = email.trim().toLowerCase();
    try {
        const [rows] = await pool.query(`SELECT * FROM users WHERE email = ?`,[cleanEmail]);
        if(!rows || rows.length == 0) return res.status(400).json({message: `not found user`,success: false});
        const foundUser = rows[0];
        const comparedPass = await bcrypt.compare(pass,foundUser.pass);
        if(!comparedPass) return res.status(400).json({message:`Wrong Password`, success: false});
        const userId = foundUser.id;
        const first_name = foundUser.fname;
        const member_role = foundUser.member_role;
        const accessToken = jwt.sign({
            userInfo: {id: userId , member_role: member_role}},
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn: "15m"}
        );
        const refreshToken = jwt.sign({
            userInfo: {id: userId , member_role: member_role}},
            process.env.REFRESH_TOKEN_SECRET,
            {expiresIn: "7d"}
        );
        res.cookie("jwt",refreshToken,{
            secure: true,
            httpOnly: true,
            sameSite: 'none',
            maxAge: 7*24*3600*1000
        });
        res.json({
            accessToken,
            success: true,
            message: `logged in successfully`,
            id: userId,
            first_name: first_name,
            member_role: member_role
        });
    } catch (error) {
        console.log("login error: ",error);
        res.status(500).json({
            success: false,
            message: "server error"
        })
    }
}
const forgetPass = async(req,res)=>{
    try {
        const {email} = req.body;
        const cleanEmail = email.trim().toLowerCase();
        const [rows] = await pool.query(`SELECT id,email,member_role FROM users WHERE email=?`,[cleanEmail]);
        if(rows.length == 0 || !rows) return res.status(404).json({success:false,message:`Not found user`});
        const data = rows[0];
        const storedEmail = data.email;
        const otp = createOtp();
        pendingEmails.set(storedEmail,{id: data.id,email: storedEmail, member_role: data.member_role, otp: otp , expires_at:Date.now()+otp_ttl});
                await axios.post("https://api.brevo.com/v3/smtp/email",{
        sender: {
            name: "Nesty Website",
            email: process.env.GMAIL_USER,
        },
        to: [
            {
                email: storedEmail,
            },
        ],
        subject: "OTP Verification",
        htmlContent: `
            <h2>OTP Verification</h2>
            <h1>${otp}</h1>
            <p>Valid for just 2 minutes</p>
        `,
    },{headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json",
        },}
);
        res.json({success:true, email: cleanEmail ,message:`Waiting for verification code`});
    } catch (error) {
        console.log(error);
    }
}
const verifyOtpForget = async(req,res)=>{
    try {
        const {email ,userotp} =req.body;
        if(!email || !userotp) return res.status(401).json({message: `please fill all the spaces`});
        const cleanEmail = email.trim().toLowerCase();
        const pending = pendingEmails.get(cleanEmail);
        if(!pending) return res.status(401).json({success: false ,message:`there is no stored emails`});
        if(Date.now() > pending.expires_at){
            return res.json({success:false, expired:true, message:`code is expired please go to login and forget password again`});
        }
        if(String(pending.otp) !== String(userotp)){
            return res.json({success:false, message:`invalid code. please try again`});
        }
        const userId = pending.id;
        const member_role = pending.member_role;
        const accessToken = jwt.sign({
            userInfo: {id: userId , member_role: member_role}},
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn: "15m"}
        );
        const refreshToken = jwt.sign({
            userInfo: {id: userId , member_role: member_role}},
            process.env.REFRESH_TOKEN_SECRET,
            {expiresIn: "7d"}
        );
        res.cookie("jwt",refreshToken,{
            secure: process.env.NODE_ENV == "production",
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 7*24*3600*1000
        });
        res.json({
            accessToken,
            success: true,
            message: `You can change your password`,
            id: userId,
            member_role: member_role
        });
        pendingEmails.delete(cleanEmail);
    } catch (error) {
        console.log(error)
    }
}
const changePass = async(req,res)=>{
    try {
        const {email , pass} = req.body;
        if(!email || !pass) return res.json({message: `please fill all the spaces`});
        const cleanEmail = email.trim().toLowerCase();
        const [rows] = await pool.query('SELECT * FROM users WHERE email=?',[cleanEmail]);
        if(rows.length==0 || !rows) return res.status(404).json({success:false,message:'Not found user. please try again'});
        const foundUser = rows[0];
        const matchPass = await bcrypt.compare(pass,foundUser.pass);
        if(matchPass) return res.json({success:false,message:`this is old password`});
        const hashedPass = await bcrypt.hash(pass,10);
        const [updates] = await pool.query(`UPDATE users set pass=?,modified_at=NOW() WHERE email =?`,[hashedPass,cleanEmail]);
        if(updates.affectedRows == 0) return res.json({success: false, message:'There is not any user found'});
        res.json({success:true,message:`Password changed successfully`});
    } catch (error) {
        console.log(error);
    }
}
const logout = async (req,res)=>{
    const cookies = req.cookies;
    if(!cookies?.jwt) return res.status(401).json({message: `wrong cookie`,success: false});
    res.clearCookie("jwt",{
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        maxAge: 7*24*3600*1000
    });
    res.json({
        message: `cookie has been deleted successfully`,
        success: true
    })
}
// server.js - Refresh token endpoint
const refresh = async (req, res) => {
    // ✅ Get refresh token from httpOnly cookie
    const refreshToken = req.cookies.jwt;
    if (!refreshToken) {
        return res.status(401).json({ 
            success: false, 
            message: "No refresh token"
        });
    }
    try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        // Generate NEW access token
        const newAccessToken = jwt.sign(
            { userInfo: { id: decoded.userInfo.id } },
            // {userInfo: {id: userId}},
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );
        // Send new access token
        res.json({
            success: true,
            accessToken: newAccessToken
        });
    } catch (error) {
        res.status(403).json({ 
            success: false, 
            message: "Invalid refresh token" 
        });
    }
};
const me = async (req,res) =>{
    const refreshToken = req.cookies.jwt;
    if (!refreshToken) {
        return res.status(401).json({ 
            success: false, 
            message: "No refresh token"
        });
    }
    try {
        const decoded = jwt.decode(refreshToken);
        res.json({success: true , id: decoded.userInfo.id , member_role: decoded.userInfo.member_role});
    } catch (error) {
        console.log(error)
    }
};
module.exports = {
    signup,
    login,
    logout,
    refresh,
    me,
    verifyOtpSignup,
    forgetPass,
    verifyOtpForget,
    changePass
}
