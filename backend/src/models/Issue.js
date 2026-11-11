const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 5000 },
  },
  { timestamps: true }
);

const IssueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },
    type: {
      type: String,
      enum: ['Bug', 'Task', 'Story', 'Epic'],
      default: 'Task',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'In Review', 'Done'],
      default: 'To Do',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    issueNumber: {
      type: Number,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    comments: [CommentSchema],
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Auto-increment issue number per project
IssueSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ project: this.project });
    this.issueNumber = count + 1;
  }
  next();
});

module.exports = mongoose.model('Issue', IssueSchema);
