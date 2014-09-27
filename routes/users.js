var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/faker', function(req, res) {
  res.sendfile("faker.html");
});

module.exports = router;
