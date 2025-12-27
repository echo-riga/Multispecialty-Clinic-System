function getClientUser(req) {
  const username = req.header('X-User');
  const role = req.header('X-Role');
  return { username, role };
}

module.exports = {
  getClientUser
};


