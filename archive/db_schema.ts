import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const repositories = sqliteTable('repositories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  owner: text('owner').notNull(),
  gitlabUrl: text('gitlab_url').notNull(),
  projectId: text('project_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export const analyses = sqliteTable('analyses', {
  id: text('id').primaryKey(),
  repoId: text('repo_id')
    .notNull()
    .references(() => repositories.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  issueStats: text('issue_stats').notNull(), // Serialized JSON of IssueStats
  mrStats: text('mr_stats').notNull(),       // Serialized JSON of MRStats
  pipelineStats: text('pipeline_stats').notNull(), // Serialized JSON of PipelineStats
  commitStats: text('commit_stats').notNull(),     // Serialized JSON of CommitStats
  summary: text('summary').notNull(),
  score: integer('score').notNull(),
});

export const recommendations = sqliteTable('recommendations', {
  id: text('id').primaryKey(),
  repoId: text('repo_id')
    .notNull()
    .references(() => repositories.id, { onDelete: 'cascade' }),
  analysisId: text('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'pipeline', 'issues', 'mr', 'commits'
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull(), // 'high', 'medium', 'low'
  status: text('status').notNull(),     // 'pending', 'resolved', 'dismissed'
  createdAt: text('created_at').notNull(),
});
