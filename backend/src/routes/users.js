const express = require('express');
const router = express.Router();
const { getUsers, getMe, updateMe } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getUsers);
router.route('/me').get(getMe).put(updateMe);

module.exports = router;
