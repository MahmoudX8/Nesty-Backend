const pool  = require("../config/dbconnect");

//    FOR USERS
//top 5 products
const topproducts = async (req,res)=>{
    try {
        const [rows] = await pool.query(`SELECT id , title , image , description , price , quantity , soldout , posted_at FROM products ORDER BY clicks DESC LIMIT 5`);
        if(rows.length == 0 || !rows) return res.status(404).json({success: false, message:'there is not any products found'});
        const result = rows;
        res.json({success: true, result , message: `Top 5 products`})
    } catch (error) {
        console.log(`top products error: `,error)
    }
}
//site statistics
const productStatistics = async(req,res)=>{
    try {
        const [rows] = await pool.query('SELECT (SELECT COUNT(*) FROM users) AS total_users,(SELECT COUNT(*) FROM products) AS total_products,(SELECT COUNT(*) FROM orders) AS total_purchases,(SELECT COUNT(*) FROM orders WHERE pending=true) AS total_pending_orders');
        if(rows.length == 0 || !rows) return res.status(404).json({success: false, message: 'there is not any products found'});
        const result = rows[0];
        console.log(result);
        res.json({success: true, result , message: 'statistics has been found successfully'});
    } catch (error) {
        console.log(error);
    }
}
//all products
const expolreproducts = async (req,res) =>{
    try {
        const [rows] = await pool.query('SELECT id , title , image , description , price , quantity , soldout , posted_at FROM products;');
        if(rows.length == 0 || !rows) return res.status(404).json({success: false, message: 'there is not any products found'});
        const result = rows;
        console.log(result);
        res.json({success: true, result , message: 'products has been found successfully'});
    } catch (error) {
        console.log(`explore error: `,error);
    }
}
//when click on specific product (update clicks && fetch data of that product)
const getproduct = async(req,res)=>{
    const {id} = req.params;
    // console.log("product_id: ", id);
    try {
        await pool.query("UPDATE products SET clicks = clicks + 1 WHERE id = ? ",[id]);
        const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [id]) ;
        if(!rows || rows.length == 0) return res.status(401).json({success: false, message: `not found product`});
        const result = rows[0];
        delete result.clicks;
        delete result.admin_id;
        delete result.posted_at;
        res.json({success: true , result , message:`product found`});
    } catch (error) {
        console.log(error)
    }
}
//------------------------------------------------------------------------------------------------
//    FOR ADMINS
//add new product (For admin)
const addproduct = async (req,res) =>{
    try {
        const {title , description , price , quantity} = req.body;
        const imageFile = req.file;
        // Check if image was uploaded
        if (!imageFile) {
            return res.status(400).json({ 
                success: false, 
                message: "Image is required" 
            });
        }
        if(!title || !description || !price || !quantity){
        return res.status(401).json({success: false, message:"please fill all the spaces"})
        }
        const adminId = req.user.id;
        console.log(adminId);
        const imagepath = imageFile.path;
        const [rows] = await pool.query('INSERT INTO products(admin_id , title, image, description , price , quantity) VALUES(?,?,?,?,?,?)', [adminId , title , imagepath , description , price , quantity]);
        if(rows.length == 0 || !rows) return res.status(404).json({success: false, message:'there is not any products found'});
        res.json({success: true , imagepath ,message: "product added successfully"})
    } catch (error) {
        console.log("server error: ",error)
    }
//     if(req.user.member_role == "admin"){
// }
//     else{
//         return res.json({message: "you are not admin"});
// }
}
const editproduct = async (req,res) =>{
    try {
        const {id} = req.params;
        const { title , description , price , quantity , soldout} = req.body;
        // const imageFile = req.file;
        if (!title && !description && !price && !quantity) {
            return res.status(404).json({success: false , message: `all fields can not be empty`});
        }
        // const adminId = req.user.id;
        // const imagepath = imageFile.path;
        const [rows] = await pool.query('UPDATE products SET title = ?, description = ?, price = ?, quantity = ? WHERE id = ?', [title , description , price , quantity , id]);
        if(rows.length == 0 || !rows) return res.status(404).json({success: false, message:'there is not any products found'});
        res.json({success: true ,message: "product updated successfully"})
    } catch (error) {
        console.log(error);
    }
}
const deleteproduct = async(req,res)=>{
    const {id} = req.params;
    try {
        const [rows] = await pool.query(`DELETE FROM products WHERE id = ?`,[id]);
        if(!rows || rows.length == 0) return res.status(401).json({success: false, message: `not found product`});
        res.json({success: true , message:`product deleted`});
    } catch (error) {
        console.log(error);
    }
}
const checkproductid = async(req,res)=>{
    const {id} = req.params;
    try {
        const [rows] = await pool.query(`SELECT id FROM products WHERE id=?`,[id]);
        if(!rows || rows.length == 0) return res.status(401).json({success: false, message: `not found product`});
        res.json({success:true , message: `product exist`});
    } catch (error) {
        console.log(error)
    }
}
const testadminid = async (req,res) =>{
    try{
        const id = req.user.id;
        console.log(id);
    }catch{
        console.log(error);
    }
}
module.exports ={
    topproducts,
    productStatistics,
    expolreproducts,
    getproduct,
    addproduct,
    editproduct,
    deleteproduct,
    checkproductid,
    testadminid
}
