const Project = require('../models/Project');
const Issue = require('../models/Issue');

// @desc    Get all projects (workspace projects)
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ status: { $ne: 'archived' } })
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    const { name, key, description } = req.body;

    if (!name || !key) {
      return res.status(400).json({ success: false, message: 'Name and key are required' });
    }

    // Check key uniqueness
    const existing = await Project.findOne({ key: key.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Project key already in use' });
    }

    const project = await Project.create({
      name,
      key: key.toUpperCase(),
      description,
      owner: req.user._id,
      members: [req.user._id],
    });

    await project.populate('owner', 'name email');

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Auto-ensure user is in members
    const isMember = project.members.some((m) => (m._id ? m._id.toString() : m.toString()) === req.user._id.toString());
    const isOwner = (project.owner._id ? project.owner._id.toString() : project.owner.toString()) === req.user._id.toString();
    if (!isMember && !isOwner) {
      project.members.push(req.user._id);
      await project.save();
      await project.populate('members', 'name email');
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private (owner only)
const updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only owner can update project' });
    }

    const { name, description, status } = req.body;
    project = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, status },
      { new: true, runValidators: true }
    ).populate('owner', 'name email').populate('members', 'name email');

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private (owner only)
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only owner can delete project' });
    }

    // Delete related issues
    await Issue.deleteMany({ project: req.params.id });
    await project.deleteOne();

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private (owner only)
const addMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only owner can add members' });
    }

    const { userId } = req.body;
    if (project.members.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User is already a member' });
    }

    project.members.push(userId);
    await project.save();
    await project.populate('members', 'name email');

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject, addMember };
