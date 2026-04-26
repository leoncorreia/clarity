export function requireSessionToken(req, res, next) {
  const token = req.headers["x-session-token"];
  if (!token && req.path !== "/start") {
    return res.status(401).json({ error: "Missing session token" });
  }
  return next();
}
