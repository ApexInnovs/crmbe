// middleware/responseEnhancer.js

module.exports = (req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (req.user && req.user.constructor.modelName === "Company") {
      data.creditsLeft = req.user.creditsLeft;
    }
    return originalJson.call(this, data);
  };

  next();
};