import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { eq, like, ne, and } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import { VERSION } from '../version.js';

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'floq',
    version: VERSION,
  });

  // floq_add_task
  server.tool(
    'floq_add_task',
    'Add a new task to Floq. By default, tasks are added to the inbox.',
    {
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      status: z.enum(['inbox', 'next', 'waiting', 'someday']).optional().describe('Initial status (default: inbox)'),
      context: z.string().optional().describe('Task context (e.g., work, home)'),
    },
    async ({ title, description, status, context }) => {
      const db = getDb();
      const now = new Date();
      const id = uuidv4();

      await db.insert(schema.tasks).values({
        id,
        title,
        description: description ?? null,
        status: status ?? 'inbox',
        context: context?.toLowerCase().replace(/^@/, '') ?? null,
        createdAt: now,
        updatedAt: now,
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ id, title, status: status ?? 'inbox' }),
        }],
      };
    },
  );

  // floq_list_tasks
  server.tool(
    'floq_list_tasks',
    'List tasks from Floq. Use status filter to narrow results. "all" returns all non-done tasks.',
    {
      status: z.enum(['inbox', 'next', 'waiting', 'someday', 'done', 'all']).optional().describe('Filter by status (default: all, which excludes done)'),
    },
    async ({ status }) => {
      const db = getDb();
      const filter = status ?? 'all';

      let tasks;
      if (filter === 'all') {
        tasks = await db
          .select()
          .from(schema.tasks)
          .where(and(ne(schema.tasks.status, 'done'), eq(schema.tasks.isProject, false)));
      } else {
        tasks = await db
          .select()
          .from(schema.tasks)
          .where(and(eq(schema.tasks.status, filter), eq(schema.tasks.isProject, false)));
      }

      const result = tasks.map(task => ({
        id: task.id,
        shortId: task.id.slice(0, 8),
        title: task.title,
        description: task.description,
        status: task.status,
        context: task.context,
        waitingFor: task.waitingFor,
        dueDate: task.dueDate?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result),
        }],
      };
    },
  );

  // floq_complete_task
  server.tool(
    'floq_complete_task',
    'Mark a task as done. Accepts full ID or ID prefix (first 8 chars).',
    {
      taskId: z.string().describe('Task ID or ID prefix'),
    },
    async ({ taskId }) => {
      const db = getDb();

      const tasks = await db
        .select()
        .from(schema.tasks)
        .where(like(schema.tasks.id, `${taskId}%`));

      if (tasks.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: `No task found with ID prefix: ${taskId}` }),
          }],
          isError: true,
        };
      }

      if (tasks.length > 1) {
        const matches = tasks.map(t => ({ id: t.id.slice(0, 8), title: t.title }));
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: 'Multiple tasks match this prefix', matches }),
          }],
          isError: true,
        };
      }

      const task = tasks[0];

      if (task.status === 'done') {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ id: task.id, title: task.title, status: 'done', message: 'Task is already done' }),
          }],
        };
      }

      const previousStatus = task.status;
      await db.update(schema.tasks)
        .set({
          status: 'done',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.tasks.id, task.id));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ id: task.id, title: task.title, previousStatus, status: 'done' }),
        }],
      };
    },
  );

  // floq_move_task
  server.tool(
    'floq_move_task',
    'Move a task to a different status. Accepts full ID or ID prefix.',
    {
      taskId: z.string().describe('Task ID or ID prefix'),
      status: z.enum(['inbox', 'next', 'waiting', 'someday', 'done']).describe('Target status'),
      waitingFor: z.string().optional().describe('Who/what the task is waiting for (required when status is "waiting")'),
    },
    async ({ taskId, status, waitingFor }) => {
      const db = getDb();

      if (status === 'waiting' && !waitingFor) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: 'waitingFor is required when status is "waiting"' }),
          }],
          isError: true,
        };
      }

      const tasks = await db
        .select()
        .from(schema.tasks)
        .where(like(schema.tasks.id, `${taskId}%`));

      if (tasks.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: `No task found with ID prefix: ${taskId}` }),
          }],
          isError: true,
        };
      }

      if (tasks.length > 1) {
        const matches = tasks.map(t => ({ id: t.id.slice(0, 8), title: t.title }));
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: 'Multiple tasks match this prefix', matches }),
          }],
          isError: true,
        };
      }

      const task = tasks[0];
      const previousStatus = task.status;

      await db.update(schema.tasks)
        .set({
          status,
          waitingFor: status === 'waiting' ? (waitingFor ?? null) : null,
          completedAt: status === 'done' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.tasks.id, task.id));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ id: task.id, title: task.title, previousStatus, status }),
        }],
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
