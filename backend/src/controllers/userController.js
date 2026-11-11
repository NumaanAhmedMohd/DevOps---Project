const User = require('../models/User');

// @desc    Get all users (for assignee selection)
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('name email role createdAt').sort({ name: 1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

// @desc    Update profile
// @route   PUT /api/users/me
// @access  Private
const updateMe = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, avatar },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUsers, getMe, updateMe };
