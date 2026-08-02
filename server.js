require("dotenv").config({override:true});
const express = require('express');
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const corsoptions = require("./config/corsoptions");
const pool = require("./config/dbconnect");
const PORT = 8000 || process.env.PORT;
const path = require('path');
const jwt = require("jsonwebtoken");
const paymentscontroller = require('./controllers/paymentscontroller')
//app configurations cors - cookies - json
app.use(cors(corsoptions));
app.use(cookieParser());
app.use(express.json());

//Routes
const productcontroller = require('./controllers/productcontroller');
app.get('/' , productcontroller.topproducts);
app.use('/products', require('./routes/productroute'));
app.use('/auth', require('./routes/authroute'));
app.use('/profile' , require('./routes/profileroute'));
app.use('/payments' , require('./routes/paymentsroute'));
app.use('/uploads', express.static(path.join(__dirname , 'uploads')));
app.use((req,res)=>{
    app.get('/', (req, res)=>{
        if (req.accepts("html")) {
            res.sendFile(path.join(__dirname,"views","notfound.html"));
        }
        res.status(200).json(`Home Page`);
    });
    res.status(404).json("not found page");
});
paymentscontroller.sendAdminOrders();
//connect to DB & run server
pool.query('SELECT 1').then(()=>{
    console.log(`connected to db`);
    app.listen(PORT , ()=>{
        console.log(`server is running on port: ${PORT}`)
    })
}).catch(err=>console.log(err));