const validate = (requestType) => {
  return (req, res, next) => {
    const { error, value } = requestType.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: "Loi validate",
        error: error.details,
      });
    }

    req.body = value;
    next();
  };
};

module.exports = validate;
