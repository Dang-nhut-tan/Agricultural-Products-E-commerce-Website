const signedIn = (req, res, next) => req.session.userId
  ? next()
  : res.status(401).json({ message: "Bạn chưa đăng nhập." });

module.exports = signedIn;
