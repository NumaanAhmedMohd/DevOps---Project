const express = require('express');
const router = express.Router();
const {
  getIssue, updateIssue, deleteIssue,
  getMyIssues, getReportedIssues, addComment, deleteComment
} = require('../controllers/issueController');
const { protect } = require('../middleware/auth');

router.use(protect);

// My issues (must be before /:id to avoid conflict)
router.get('/my', getMyIssues);
router.get('/reported', getReportedIssues);

// Single issue CRUD
router.route('/:id').get(getIssue).put(updateIssue).delete(deleteIssue);

// Comments
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', deleteComment);

module.exports = router;
