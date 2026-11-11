const express = require('express');
const router = express.Router();
const {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
} = require('../controllers/projectController');
const {
  getIssues,
  createIssue,
  getProjectStats,
} = require('../controllers/issueController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getProjects).post(createProject);
router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);
router.post('/:id/members', addMember);
router.route('/:projectId/issues').get(getIssues).post(createIssue);
router.get('/:projectId/stats', getProjectStats);

module.exports = router;
