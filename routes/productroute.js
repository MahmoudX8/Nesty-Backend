const express = require('express');
const verifyjwt = require('../middleware/verifyjwt');
const router = express.Router();
const productcontroller = require('../controllers/productcontroller');
const upload = require('../middleware/upload');



// router.use(verifyjwt);
router.route("/").get(productcontroller.expolreproducts);
router.route('/stats').get(productcontroller.productStatistics);
router.route("/:id").get(verifyjwt ,productcontroller.getproduct);
router.route("/check/:id").get(verifyjwt ,productcontroller.checkproductid);
router.route("/:id").delete(verifyjwt ,productcontroller.deleteproduct);
router.route("/:id").put(verifyjwt, productcontroller.editproduct);
router.route("/").post(upload.single('image'), verifyjwt,productcontroller.addproduct);
module.exports = router;