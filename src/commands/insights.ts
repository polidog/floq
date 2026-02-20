import { eq, and, gte } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import { t, fmt } from '../i18n/index.js';
import type { Task } from '../db/schema.js';

interface WeekStats {
  weekStart: Date;
  weekLabel: string;
  tasks: Task[];
}

interface DistributionItem {
  label: string;
  count: number;
  percentage: number;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

function bar(count: number, max: number, width: number = 20): string {
  if (max === 0) return '';
  const filled = Math.round((count / max) * width);
  return '█'.repeat(filled);
}

function stringWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0) || 0;
    // CJK characters and fullwidth forms take 2 columns
    if (
      (code >= 0x1100 && code <= 0x115F) ||
      (code >= 0x2E80 && code <= 0x303E) ||
      (code >= 0x3040 && code <= 0x9FFF) ||
      (code >= 0xAC00 && code <= 0xD7AF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE30 && code <= 0xFE6F) ||
      (code >= 0xFF01 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6) ||
      (code >= 0x20000 && code <= 0x2FFFF)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

function padEnd(str: string, targetWidth: number): string {
  const currentWidth = stringWidth(str);
  const padding = Math.max(0, targetWidth - currentWidth);
  return str + ' '.repeat(padding);
}

function groupByWeek(tasks: Task[], weeks: number): WeekStats[] {
  const now = new Date();
  const result: WeekStats[] = [];

  for (let i = 0; i < weeks; i++) {
    const weekStart = getWeekStart(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekTasks = tasks.filter(task => {
      const completionDate = task.completedAt ?? task.updatedAt;
      return completionDate >= weekStart && completionDate < weekEnd;
    });

    result.push({
      weekStart,
      weekLabel: formatDate(weekStart),
      tasks: weekTasks,
    });
  }

  return result;
}

function groupByDayOfWeek(tasks: Task[]): Map<number, number> {
  const days = new Map<number, number>();
  for (let i = 0; i < 7; i++) days.set(i, 0);

  for (const task of tasks) {
    const day = (task.completedAt ?? task.updatedAt).getDay();
    days.set(day, (days.get(day) || 0) + 1);
  }

  return days;
}

function calculateDistribution(tasks: Task[], getter: (t: Task) => string | null, noValueLabel: string): DistributionItem[] {
  const map = new Map<string, number>();
  for (const task of tasks) {
    const key = getter(task) || noValueLabel;
    map.set(key, (map.get(key) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: Math.round((count / tasks.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

function calculateAverageCompletionDays(tasks: Task[]): number | null {
  if (tasks.length === 0) return null;

  let totalMs = 0;
  let validCount = 0;

  for (const task of tasks) {
    const created = task.createdAt.getTime();
    const completed = (task.completedAt ?? task.updatedAt).getTime();
    if (completed > created) {
      totalMs += completed - created;
      validCount++;
    }
  }

  if (validCount === 0) return null;
  return totalMs / validCount / (1000 * 60 * 60 * 24);
}

export async function showInsights(weeks: number): Promise<void> {
  const db = getDb();
  const i18n = t();
  const ins = i18n.commands.insights as Record<string, string> | undefined;
  const isJa = ins?.title === 'タスクインサイト';

  // Labels with fallbacks
  const l = {
    title: ins?.title || 'Task Insights',
    period: ins?.period || 'Period',
    weeklyCompletion: ins?.weeklyCompletion || 'Weekly Completion',
    weekLabel: ins?.weekLabel || 'Week of {date}',
    tasksCompleted: ins?.tasksCompleted || '{count} tasks completed',
    dailyBreakdown: ins?.dailyBreakdown || 'Daily Breakdown',
    currentStatus: ins?.currentStatus || 'Current Status',
    byContext: ins?.byContext || 'By Context',
    byEffort: ins?.byEffort || 'By Effort',
    noContext: ins?.noContext || 'No context',
    noEffort: ins?.noEffort || 'No effort set',
    projectProgress: ins?.projectProgress || 'Project Progress',
    activeProjects: ins?.activeProjects || 'Active Projects',
    tasksRemaining: ins?.tasksRemaining || '{count} tasks remaining',
    averageCompletion: ins?.averageCompletion || 'Average Completion Time',
    daysAverage: ins?.daysAverage || '{days} days',
    noData: ins?.noData || 'No completed tasks in this period',
    total: ins?.total || 'Total',
    andMore: ins?.andMore || '  ... and {count} more',
  };

  // Calculate date range
  const now = new Date();
  const startDate = getWeekStart(now);
  startDate.setDate(startDate.getDate() - (weeks - 1) * 7);
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  // Query completed tasks (use completedAt with updatedAt fallback)
  const completedTasks = (await db
    .select()
    .from(schema.tasks)
    .where(and(
      eq(schema.tasks.status, 'done'),
      eq(schema.tasks.isProject, false),
    ))).filter(task => {
      const completionDate = task.completedAt ?? task.updatedAt;
      return completionDate >= startDate;
    });

  // Header
  console.log();
  console.log(l.title);
  console.log('═'.repeat(40));
  console.log(`${l.period}: ${formatDate(startDate)} ~ ${formatDate(endDate)}`);

  if (completedTasks.length === 0) {
    console.log();
    console.log(`  ${l.noData}`);
    console.log();
    return;
  }

  // Weekly Completion
  console.log();
  console.log(l.weeklyCompletion);
  console.log('─'.repeat(40));

  const weeklyStats = groupByWeek(completedTasks, weeks);
  for (const week of weeklyStats) {
    const weekLabel = fmt(l.weekLabel, { date: week.weekLabel });
    const countLabel = fmt(l.tasksCompleted, { count: week.tasks.length });
    console.log(`${weekLabel}: ${countLabel}`);

    const maxShow = 10;
    for (let i = 0; i < Math.min(week.tasks.length, maxShow); i++) {
      const task = week.tasks[i];
      const shortId = task.id.slice(0, 8);
      console.log(`  [${shortId}] ${task.title}`);
    }
    if (week.tasks.length > maxShow) {
      console.log(fmt(l.andMore, { count: week.tasks.length - maxShow }));
    }
  }

  // Daily Breakdown
  console.log();
  console.log(l.dailyBreakdown);
  console.log('─'.repeat(40));

  const localeDayNames = isJa
    ? ['日', '月', '火', '水', '木', '金', '土']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dailyStats = groupByDayOfWeek(completedTasks);
  const maxDaily = Math.max(...dailyStats.values());

  for (let i = 0; i < 7; i++) {
    const count = dailyStats.get(i) || 0;
    const dayName = padEnd(localeDayNames[i], 4);
    const countStr = String(count).padStart(3);
    console.log(`  ${dayName}${countStr} ${bar(count, maxDaily)}`);
  }

  // Current Status Distribution
  console.log();
  console.log(l.currentStatus);
  console.log('─'.repeat(40));

  const allTasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.isProject, false));

  const statusCounts = new Map<string, number>();
  for (const task of allTasks) {
    statusCounts.set(task.status, (statusCounts.get(task.status) || 0) + 1);
  }

  const statusOrder = ['inbox', 'next', 'waiting', 'someday', 'done'] as const;
  const maxStatus = Math.max(...statusCounts.values());
  for (const status of statusOrder) {
    const count = statusCounts.get(status) || 0;
    const label = padEnd(i18n.status[status] || status, 16);
    const countStr = String(count).padStart(3);
    console.log(`  ${label}${countStr} ${bar(count, maxStatus)}`);
  }

  // Context Distribution
  console.log();
  console.log(l.byContext);
  console.log('─'.repeat(40));

  const contextDist = calculateDistribution(completedTasks, t => t.context, l.noContext);
  const maxContext = contextDist.length > 0 ? contextDist[0].count : 0;
  for (const item of contextDist) {
    const label = padEnd(item.label === l.noContext ? item.label : `@${item.label}`, 16);
    const countStr = String(item.count).padStart(3);
    console.log(`  ${label}${countStr} (${String(item.percentage).padStart(2)}%) ${bar(item.count, maxContext)}`);
  }

  // Effort Distribution
  console.log();
  console.log(l.byEffort);
  console.log('─'.repeat(40));

  const effortLabels: Record<string, string> = {
    small: i18n.tui.effort?.small || 'Small',
    medium: i18n.tui.effort?.medium || 'Medium',
    large: i18n.tui.effort?.large || 'Large',
  };
  const effortDist = calculateDistribution(
    completedTasks,
    t => t.effort ? (effortLabels[t.effort] || t.effort) : null,
    l.noEffort,
  );
  const maxEffort = effortDist.length > 0 ? effortDist[0].count : 0;
  for (const item of effortDist) {
    const label = padEnd(item.label, 16);
    const countStr = String(item.count).padStart(3);
    console.log(`  ${label}${countStr} (${String(item.percentage).padStart(2)}%) ${bar(item.count, maxEffort)}`);
  }

  // Project Progress
  console.log();
  console.log(l.projectProgress);
  console.log('─'.repeat(40));

  const activeProjects = await db
    .select()
    .from(schema.tasks)
    .where(and(
      eq(schema.tasks.isProject, true),
      eq(schema.tasks.status, 'next'),
    ));

  if (activeProjects.length === 0) {
    console.log(`  ${l.activeProjects}: 0`);
  } else {
    console.log(`  ${l.activeProjects}: ${activeProjects.length}`);
    for (const project of activeProjects) {
      const children = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.parentId, project.id));
      const total = children.length;
      const done = children.filter(c => c.status === 'done').length;
      const remaining = total - done;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const shortId = project.id.slice(0, 8);
      console.log(`  [${shortId}] ${project.title} (${done}/${total}, ${pct}%)`);
    }
  }

  // Average Completion Time
  console.log();
  console.log(l.averageCompletion);
  console.log('─'.repeat(40));

  const avgDays = calculateAverageCompletionDays(completedTasks);
  if (avgDays !== null) {
    if (avgDays < 1) {
      const hours = Math.round(avgDays * 24);
      const hoursLabel = isJa ? `${hours}時間` : `${hours}h`;
      console.log(`  ${hoursLabel}`);
    } else {
      console.log(`  ${fmt(l.daysAverage, { days: avgDays.toFixed(1) })}`);
    }
  }

  // Total
  console.log();
  console.log(`${l.total}: ${fmt(l.tasksCompleted, { count: completedTasks.length })}`);
  console.log();
}
