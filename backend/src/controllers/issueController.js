const Issue = require('../models/Issue');
const Project = require('../models/Project');

// Helper: check if user has project access and ensure membership
const hasProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const isMember = project.members.some((m) => m.toString() === userId.toString());
  const isOwner = project.owner.toString() === userId.toString();
  if (!isMember && !isOwner) {
    project.members.push(userId);
    await project.save();
  }
  return project;
};

// @desc    Get all issues for a project
// @route   GET /api/projects/:projectId/issues
// @access  Private
const getIssues = async (req, res) => {
  try {
    const project = await hasProjectAccess(req.params.projectId, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied or project not found' });

    const filter = { project: req.params.projectId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignee) filter.assignee = req.query.assignee;

    const issues = await Issue.find(filter)
      .populate('reporter', 'name email')
      .populate('assignee', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: issues.length, data: issues });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create an issue
// @route   POST /api/projects/:projectId/issues
// @access  Private
const createIssue = async (req, res) => {
  try {
    const project = await hasProjectAccess(req.params.projectId, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied or project not found' });

    const { title, description, type, priority, status, assignee, dueDate } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Issue title is required' });

    const issue = await Issue.create({
      title,
      description,
      type,
      priority,
      status,
      assignee: assignee || null,
      dueDate: dueDate || null,
      project: req.params.projectId,
      reporter: req.user._id,
    });

    if (assignee) {
      await Project.findByIdAndUpdate(req.params.projectId, {
        $addToSet: { members: assignee }
      });
    }

    await issue.populate('reporter', 'name email');
    await issue.populate('assignee', 'name email');

    res.status(201).json({ success: true, data: issue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single issue
// @route   GET /api/issues/:id
// @access  Private
const getIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reporter', 'name email')
      .populate('assignee', 'name email')
      .populate('project', 'name key')
      .populate('comments.author', 'name email');

    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const project = await hasProjectAccess(issue.project._id, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, data: issue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update an issue
// @route   PUT /api/issues/:id
// @access  Private
const updateIssue = async (req, res) => {
  try {
    let issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const project = await hasProjectAccess(issue.project, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    const { title, description, type, priority, status, assignee, dueDate } = req.body;

    issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { title, description, type, priority, status, assignee: assignee || null, dueDate: dueDate || null },
      { new: true, runValidators: true }
    )
      .populate('reporter', 'name email')
      .populate('assignee', 'name email')
      .populate('project', 'name key')
      .populate('comments.author', 'name email');

    if (assignee) {
      await Project.findByIdAndUpdate(issue.project?._id || issue.project, {
        $addToSet: { members: assignee }
      });
    }

    res.json({ success: true, data: issue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete an issue
// @route   DELETE /api/issues/:id
// @access  Private
const deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const project = await hasProjectAccess(issue.project, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    await issue.deleteOne();
    res.json({ success: true, message: 'Issue deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get issue stats for a project (dashboard)
// @route   GET /api/projects/:projectId/stats
// @access  Private
const getProjectStats = async (req, res) => {
  try {
    const project = await hasProjectAccess(req.params.projectId, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied or project not found' });

    const [total, byStatus, byPriority, byType] = await Promise.all([
      Issue.countDocuments({ project: req.params.projectId }),
      Issue.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Issue.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Issue.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({ success: true, data: { total, byStatus, byPriority, byType } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all issues assigned to logged-in user (across all projects)
// @route   GET /api/issues/my
// @access  Private
const getMyIssues = async (req, res) => {
  try {
    const issues = await Issue.find({ assignee: req.user._id })
      .populate('reporter', 'name email')
      .populate('assignee', 'name email')
      .populate('project', 'name key')
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: issues.length, data: issues });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all issues reported by logged-in user (across all projects)
// @route   GET /api/issues/reported
// @access  Private
const getReportedIssues = async (req, res) => {
  try {
    const issues = await Issue.find({ reporter: req.user._id })
      .populate('reporter', 'name email')
      .populate('assignee', 'name email')
      .populate('project', 'name key')
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: issues.length, data: issues });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a comment to an issue
// @route   POST /api/issues/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Comment text is required' });

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const project = await hasProjectAccess(issue.project, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    issue.comments.push({ author: req.user._id, text: text.trim() });
    await issue.save();

    await issue.populate('comments.author', 'name email');

    res.status(201).json({ success: true, data: issue.comments[issue.comments.length - 1] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/issues/:id/comments/:commentId
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const comment = issue.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    comment.deleteOne();
    await issue.save();

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getIssues, createIssue, getIssue, updateIssue, deleteIssue,
  getProjectStats, getMyIssues, getReportedIssues, addComment, deleteComment
};
