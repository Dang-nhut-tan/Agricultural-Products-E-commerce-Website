const router = require("express").Router();
const controller = require("../controllers/authController");
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const signedIn = (req, res, next) => req.session.userId ? next() : res.status(401).json({ message: "Bạn chưa đăng nhập." });
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Đăng ký tài khoản
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - passwordConfirmation
 *               - phone
 *               - address
 *               - province
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyenvana@gmail.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "123456"
 *               passwordConfirmation:
 *                 type: string
 *                 example: "123456"
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *               address:
 *                 type: string
 *                 example: 123 Nguyễn Trãi
 *               ward:
 *                 type: string
 *                 example: Phường Bến Thành
 *               district:
 *                 type: string
 *                 example: Quận 1
 *               province:
 *                 type: string
 *                 example: TP. Hồ Chí Minh
 *     responses:
 *       "201":
 *         description: Đăng ký thành công
 *       "400":
 *         description: Dữ liệu đăng ký không hợp lệ
 *       "409":
 *         description: Email đã được sử dụng
 *       "500":
 *         description: Lỗi máy chủ
 */
router.post("/register", asyncRoute(controller.register));
router.post("/login", asyncRoute(controller.login));
router.post("/logout", controller.logout);
router.get("/me", asyncRoute(controller.me));
router.put("/profile", signedIn, asyncRoute(controller.profile));
router.get("/addresses", signedIn, asyncRoute(controller.addresses));
router.post("/addresses", signedIn, asyncRoute(controller.addAddress));
router.delete("/addresses/:id", signedIn, asyncRoute(controller.deleteAddress));
module.exports = router;
