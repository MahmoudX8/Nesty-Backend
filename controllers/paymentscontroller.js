const pool  = require("../config/dbconnect");
const axios = require('axios');
const nodeMailer = require('nodemailer');
const transporter = nodeMailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});
const createOrder = async(req,res)=>{
    try {
        const {cartproducts, cost} = req.body;
        const user_id = req.user.id;
        const [orders] = await pool.query(`INSERT INTO orders(member_id, total_cost) VALUES(?,?)`,[user_id,cost]);
        const orderId = orders.insertId;
        const values = cartproducts.map(prod => [orderId, user_id , prod.id, prod.quantity, prod.price]);
        const [payments] = await pool.query(`INSERT INTO payments(id,member_id,product_id,quantity,cost) VALUES ?`,[values]);
        const [admins] = await pool.query(`SELECT id,email FROM users WHERE member_role = ?`,["admin"]);
        if(admins.length == 0 || !admins) return res.json({success:false,message:`there is no admins`});
        const adminEmails = admins.map(admin => admin.email);
        await transporter.sendMail({
            from:{
                name:'Nesty Website',
                address: process.env.GMAIL_USER
            },
            to: adminEmails,
            subject:'New Order',
            html:`
            <h1>You Got New Order</h1>
            <h3>Order id: ${orderId}</h3>
            <h3>Total cost: ${cost}$</h3>
            <p><a href='https://nesty-nwzp.vercel.app/order/${orderId}'>click for more details</a></p>
            `
        });
//         await axios.post(
//     "https://api.brevo.com/v3/smtp/email",
//     {
//         sender: {
//             name: "Nesty Website",
//             email: process.env.GMAIL_USER,
//         },
//         to: adminEmails.map(email => ({ email })),
//         subject: "New Order",
//         htmlContent: `
//             <h1>You Got New Order</h1>
//             <h3>Order id: ${orderId}</h3>
//             <h3>Total cost: ${cost}$</h3>
//             <p><a href='https://nesty-nwzp.vercel.app/order/${orderId}'>click for more details</a></p>
//         `,
//     },
//     {
//         headers: {
//             "api-key": process.env.BREVO_API_KEY,
//             "Content-Type": "application/json",
//         },
//     }
// );
        res.json({success:true, message: `order has been sent successfully` , orderId: orderId});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "server error" });
    }
};
const sendAdminOrders = async(req,res)=>{
    try {
        const [pendingorders] = await pool.query(`SELECT orders.*,users.fname,users.lname, users.email FROM orders JOIN users ON orders.member_id = users.id WHERE orders.pending=true`);
        if(pendingorders.length == 0 || !pendingorders) return res.json({ok:false,msg:'There is no pending orders yet'});
        // const ordersIds = pendingorders.map(order=>[order.id]);
        res.json({ok:true,pendingorders,msg:'here are pending orders'});
    } catch (error) {
        console.log(error);
    }
};
const getEachDetailedOrder = async(req,res)=>{
    const orderId = req.params.id;
    try {
        const [detailedOrder] = await pool.query("SELECT payments.*, products.title AS product_title, products.price, products.description, products.image, users.fname, users.lname,users.email FROM payments JOIN products ON payments.product_id = products.id JOIN users ON payments.member_id = users.id where payments.id = ?",[orderId]);
        if(detailedOrder.length == 0) return res.json({ok:false,msg:`there is no orders with that id`});
        res.json({ok:true,msg:`here is order datails`,detailedOrder});
    } catch (error) {
     console.log(error);
    }
}
const confirmOrder = async(req,res)=>{
    const orderId = req.body.id;
    try {
        const [rows] = await pool.query(`UPDATE orders JOIN payments ON orders.id = payments.id JOIN products ON payments.product_id = products.id SET products.quantity = products.quantity - payments.quantity,orders.pending = false,payments.pending = false WHERE orders.id = ?`,[orderId]);
        if (rows.affectedRows == 0) {
            res.json({ok:false,msg:`products do not exist`});
        }
        res.json({ok:true, msg:`order has been confirmed successfully`});
    } catch (error) {
        console.log(error);
    }
}
module.exports = {
    createOrder,
    sendAdminOrders,
    getEachDetailedOrder,
    confirmOrder
}
