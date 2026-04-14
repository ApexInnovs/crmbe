 const Admin = require("../model/admin.model");
  const Company = require("../model/Company.model");
const employeeModel = require("../model/employee.model");
  const { verifyToken } = require("../utils/token");

  // Middleware to validate permissions and entity type
  // Usage: permissionMiddleware(requiredPermission, allowedEntities)
  // allowedEntities: string or array of strings (e.g., 'admin', ['admin', 'employee'])
  module.exports = function (requiredPermission, allowedEntities) {
    return async function (req, res, next) {
      // Allow login routes to bypass permission and token checks
      const loginRoutes = [
        '/admin/login',
        '/company/login',
        '/employees/login',
      ];
      // Check for POST method and login route
      if (
        req.method === 'POST' &&
        loginRoutes.some((route) => req.path === route || req.originalUrl.endsWith(route))
      ) {
        return next();
      }
      try {
        // Get token from Authorization header
        const authHeader = req.headers["authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(440).json({ message: "logout", reason: "No token provided" });
        }
        const token = authHeader.split(" ")[1];
        // Decode and verify token
        let decoded;
        try {
          decoded = verifyToken(token);
        } catch (err) {
          return res.status(440).json({ message: "logout", reason: "Invalid or expired token" });
        }
        const userType = decoded.userType;
        if (!userType) {
          return res.status(440).json({ message: "logout", reason: "Invalid token: userType missing" });
        }
        // Entity check: if allowedEntities is set, only allow those userTypes
        if (allowedEntities) {
          const allowed = Array.isArray(allowedEntities) ? allowedEntities : [allowedEntities];
          if (!allowed.includes(userType)) {
            return res.status(403).json({ message: "Entity not allowed" });
          }
        }
        let user = null;
        if (userType === "company") {
          user = await Company.findById(decoded.id);
          if (!user || user.status !== 1) {
            return res.status(440).json({ message: "logout", reason: "Invalid or inactive company user" });
          }
          req.user = user;
          return next(); // No permission check for company
        } else if (userType === "admin") {
          user = await Admin.findById(decoded.id);
          if (!user || user.status !== 1) {
            return res.status(440).json({ message: "logout", reason: "Invalid or inactive admin user" });
          }
          // If permission required, check role and permissions
          if (requiredPermission) {
            // Assume admin has all permissions or implement your own logic here
            // If you want to check admin role/permissions, add logic here
          }
          req.user = user;
          return next();
        } else if (userType === "employee") {
          user = await employeeModel.findById(decoded.id).populate({
            path: "role",
            populate: { path: "permissions" },
          });
          if (!user || user.status !== 1) {
            return res.status(440).json({ message: "logout", reason: "Invalid or inactive employee user" });
          }
          // Check if the token matches the one stored in DB
          if (!user.jwtToken || user.jwtToken !== token) {
            return res.status(440).json({ message: "logout", reason: "Session expired or logged in elsewhere" });
          }
          if (requiredPermission) {
            // Check if role is active
            if (!user.role || user.role.status !== 1) {
              return res.status(403).json({ message: "Role is inactive" });
            }
            // Check if required permission exists in role
            const hasPermission = user.role.permissions.some(
              (perm) => perm.name === requiredPermission,
            );
            if (!hasPermission) {
              return res.status(403).json({ message: "Permission denied" });
            }
          }
          req.user = user;
          return next();
        } else {
          return res.status(440).json({ message: "logout", reason: "Unknown user type" });
        }
      } catch (err) {
        return res.status(440).json({ message: "logout", error: err.message });
      }
    };
  };
