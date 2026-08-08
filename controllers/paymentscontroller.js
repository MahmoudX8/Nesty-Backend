const pool  = require("../config/dbconnect");
const axios = require('axios');

const sendAdminOrderEmail = async (toEmail, orderId, cost) => {
    return axios.post('https://api.emailjs.com/api/v1.0/email/send', {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
            to_email: toEmail,
            order_id: orderId,
            cost: cost,
            order_link: `https://nesty-store.vercel.app/order/${orderId}`,
        },
    });
};
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
        const results = await Promise.allSettled(
            adminEmails.map(email => sendAdminOrderEmail(email, orderId, cost))
        );
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                console.error(`Failed to notify ${adminEmails[i]}:`, r.reason?.response?.data || r.reason?.message);
            } else {
                console.log(`Sent to ${adminEmails[i]}`);
            }
        });
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
