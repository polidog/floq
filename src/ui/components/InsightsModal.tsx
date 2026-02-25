import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { eq, and, gte } from 'drizzle-orm';
import { getDb, schema } from '../../db/index.js';
import { t, fmt } from '../../i18n/index.js';
import { getInsightsWeeks } from '../../config.js';
import { useTheme } from '../theme/index.js';
import type { BorderStyleType } from '../theme/types.js';
import type { Task } from '../../db/schema.js';

interface InsightsModalProps {
  onClose: () => void;
}

type ContentLine = {
  type: 'header' | 'text' | 'bar' | 'spacer';
  value: string;
  barValue?: number;
  barMax?: number;
};

const VISIBLE_LINES = 16;

function stringWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0) || 0;
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

function padEndCJK(str: string, targetWidth: number): string {
  const currentWidth = stringWidth(str);
  const padding = Math.max(0, targetWidth - currentWidth);
  return str + ' '.repeat(padding);
}

function bar(count: number, max: number, width: number = 15): string {
  if (max === 0) return '';
  const filled = Math.round((count / max) * width);
  return '█'.repeat(filled);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function InsightsModal({ onClose }: InsightsModalProps): React.ReactElement {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [content, setContent] = useState<ContentLine[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const i18n = t();
  const ins = i18n.commands.insights as Record<string, string> | undefined;
  const isJa = ins?.title === 'タスクインサイト';

  const l = useMemo(() => ({
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
    averageCompletion: ins?.averageCompletion || 'Average Completion Time',
    daysAverage: ins?.daysAverage || '{days} days',
    noData: ins?.noData || 'No completed tasks in this period',
    total: ins?.total || 'Total',
    andMore: ins?.andMore || '  ... and {count} more',
  }), [ins]);

  useEffect(() => {
    const loadInsights = async () => {
      const db = getDb();
      const weeks = getInsightsWeeks();
      const lines: ContentLine[] = [];

      const now = new Date();
      const startDate = getWeekStart(now);
      startDate.setDate(startDate.getDate() - (weeks - 1) * 7);

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

      // Period header
      lines.push({ type: 'text', value: `${l.period}: ${startDate.toLocaleDateString()} ~ ${now.toLocaleDateString()}` });
      lines.push({ type: 'spacer', value: '' });

      if (completedTasks.length === 0) {
        lines.push({ type: 'text', value: l.noData });
        setContent(lines);
        setLoading(false);
        return;
      }

      // Weekly completion
      lines.push({ type: 'header', value: l.weeklyCompletion });
      for (let i = 0; i < weeks; i++) {
        const ws = getWeekStart(now);
        ws.setDate(ws.getDate() - i * 7);
        const we = new Date(ws);
        we.setDate(we.getDate() + 7);
        const weekTasks = completedTasks.filter(t => {
          const d = t.completedAt ?? t.updatedAt;
          return d >= ws && d < we;
        });
        const weekLabel = fmt(l.weekLabel, { date: ws.toLocaleDateString() });
        const countLabel = fmt(l.tasksCompleted, { count: weekTasks.length });
        lines.push({ type: 'text', value: `${weekLabel}: ${countLabel}` });
        const maxShow = 5;
        for (let j = 0; j < Math.min(weekTasks.length, maxShow); j++) {
          const task = weekTasks[j];
          lines.push({ type: 'text', value: `  [${task.id.slice(0, 8)}] ${task.title}` });
        }
        if (weekTasks.length > maxShow) {
          lines.push({ type: 'text', value: fmt(l.andMore, { count: weekTasks.length - maxShow }) });
        }
      }
      lines.push({ type: 'spacer', value: '' });

      // Daily breakdown
      lines.push({ type: 'header', value: l.dailyBreakdown });
      const dayCounts = new Array(7).fill(0);
      for (const task of completedTasks) {
        dayCounts[(task.completedAt ?? task.updatedAt).getDay()]++;
      }
      const maxDaily = Math.max(...dayCounts);
      const dayNames = isJa
        ? ['日', '月', '火', '水', '木', '金', '土']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i < 7; i++) {
        const name = padEndCJK(dayNames[i], 4);
        const count = String(dayCounts[i]).padStart(3);
        lines.push({ type: 'bar', value: `  ${name}${count}`, barValue: dayCounts[i], barMax: maxDaily });
      }
      lines.push({ type: 'spacer', value: '' });

      // Current status distribution
      lines.push({ type: 'header', value: l.currentStatus });
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
        const label = padEndCJK(i18n.status[status] || status, 16);
        const countStr = String(count).padStart(3);
        lines.push({ type: 'bar', value: `  ${label}${countStr}`, barValue: count, barMax: maxStatus });
      }
      lines.push({ type: 'spacer', value: '' });

      // Context distribution
      lines.push({ type: 'header', value: l.byContext });
      const contextMap = new Map<string, number>();
      for (const task of completedTasks) {
        const key = task.context || l.noContext;
        contextMap.set(key, (contextMap.get(key) || 0) + 1);
      }
      const contextEntries = Array.from(contextMap.entries()).sort((a, b) => b[1] - a[1]);
      const maxContext = contextEntries.length > 0 ? contextEntries[0][1] : 0;
      for (const [ctx, count] of contextEntries) {
        const displayLabel = ctx === l.noContext ? ctx : `@${ctx}`;
        const label = padEndCJK(displayLabel, 16);
        const pct = Math.round((count / completedTasks.length) * 100);
        const countStr = String(count).padStart(3);
        lines.push({ type: 'bar', value: `  ${label}${countStr} (${String(pct).padStart(2)}%)`, barValue: count, barMax: maxContext });
      }
      lines.push({ type: 'spacer', value: '' });

      // Effort distribution
      lines.push({ type: 'header', value: l.byEffort });
      const effortLabels: Record<string, string> = {
        small: i18n.tui.effort?.small || 'Small',
        medium: i18n.tui.effort?.medium || 'Medium',
        large: i18n.tui.effort?.large || 'Large',
      };
      const effortMap = new Map<string, number>();
      for (const task of completedTasks) {
        const key = task.effort ? (effortLabels[task.effort] || task.effort) : l.noEffort;
        effortMap.set(key, (effortMap.get(key) || 0) + 1);
      }
      const effortEntries = Array.from(effortMap.entries()).sort((a, b) => b[1] - a[1]);
      const maxEffort = effortEntries.length > 0 ? effortEntries[0][1] : 0;
      for (const [eff, count] of effortEntries) {
        const label = padEndCJK(eff, 16);
        const pct = Math.round((count / completedTasks.length) * 100);
        const countStr = String(count).padStart(3);
        lines.push({ type: 'bar', value: `  ${label}${countStr} (${String(pct).padStart(2)}%)`, barValue: count, barMax: maxEffort });
      }
      lines.push({ type: 'spacer', value: '' });

      // Project progress
      lines.push({ type: 'header', value: l.projectProgress });
      const activeProjects = await db
        .select()
        .from(schema.tasks)
        .where(and(
          eq(schema.tasks.isProject, true),
          eq(schema.tasks.status, 'next'),
        ));
      lines.push({ type: 'text', value: `  ${l.activeProjects}: ${activeProjects.length}` });
      for (const project of activeProjects) {
        const children = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.parentId, project.id));
        const total = children.length;
        const done = children.filter(c => c.status === 'done').length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        lines.push({ type: 'text', value: `  [${project.id.slice(0, 8)}] ${project.title} (${done}/${total}, ${pct}%)` });
      }
      lines.push({ type: 'spacer', value: '' });

      // Average completion time
      lines.push({ type: 'header', value: l.averageCompletion });
      let totalMs = 0;
      let validCount = 0;
      for (const task of completedTasks) {
        const diff = (task.completedAt ?? task.updatedAt).getTime() - task.createdAt.getTime();
        if (diff > 0) { totalMs += diff; validCount++; }
      }
      if (validCount > 0) {
        const avgDays = totalMs / validCount / (1000 * 60 * 60 * 24);
        if (avgDays < 1) {
          const hours = Math.round(avgDays * 24);
          const hoursLabel = isJa ? `${hours}時間` : `${hours}h`;
          lines.push({ type: 'text', value: `  ${hoursLabel}` });
        } else {
          lines.push({ type: 'text', value: `  ${fmt(l.daysAverage, { days: avgDays.toFixed(1) })}` });
        }
      }
      lines.push({ type: 'spacer', value: '' });

      // Total
      lines.push({ type: 'text', value: `${l.total}: ${fmt(l.tasksCompleted, { count: completedTasks.length })}` });

      setContent(lines);
      setLoading(false);
    };

    loadInsights();
  }, [l, isJa, i18n]);

  const maxScroll = Math.max(0, content.length - VISIBLE_LINES);

  useInput((input, key) => {
    if (input === 'j' || key.downArrow) {
      setScrollOffset(prev => Math.min(prev + 1, maxScroll));
      return;
    }
    if (input === 'k' || key.upArrow) {
      setScrollOffset(prev => Math.max(prev - 1, 0));
      return;
    }
    if (key.escape || key.return || input === 'q' || input === ' ') {
      onClose();
      return;
    }
  });

  const visibleContent = content.slice(scrollOffset, scrollOffset + VISIBLE_LINES);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset < maxScroll;

  const formatTitle = (title: string) =>
    theme.style.headerUppercase ? title.toUpperCase() : title;

  const renderLine = (line: ContentLine, index: number) => {
    switch (line.type) {
      case 'header':
        return (
          <Text key={index} bold color={theme.colors.accent}>
            {formatTitle(line.value)}
          </Text>
        );
      case 'bar':
        return (
          <Text key={index} color={theme.colors.text}>
            {line.value} <Text color={theme.colors.secondary}>{bar(line.barValue || 0, line.barMax || 0)}</Text>
          </Text>
        );
      case 'spacer':
        return <Text key={index}> </Text>;
      default:
        return (
          <Text key={index} color={theme.colors.text}>
            {line.value}
          </Text>
        );
    }
  };

  const closeHint = isJa ? 'Esc/q: 閉じる' : 'Esc/q: close';

  return (
    <Box
      flexDirection="column"
      borderStyle={theme.borders.modal as BorderStyleType}
      borderColor={theme.colors.borderActive}
      paddingX={2}
      paddingY={1}
    >
      {/* Title */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={theme.colors.secondary}>
          {formatTitle(l.title)}
        </Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column" height={VISIBLE_LINES + 2}>
        {loading ? (
          <Text color={theme.colors.textMuted}>{isJa ? '読み込み中...' : 'Loading...'}</Text>
        ) : (
          <>
            {showScrollUp && (
              <Text color={theme.colors.textMuted}>  ▲ scroll up (k)</Text>
            )}
            {!showScrollUp && <Text> </Text>}

            {visibleContent.map((line, index) => renderLine(line, index))}

            {showScrollDown && (
              <Text color={theme.colors.textMuted}>  ▼ scroll down (j)</Text>
            )}
            {!showScrollDown && <Text> </Text>}
          </>
        )}
      </Box>

      {/* Footer */}
      <Box justifyContent="center" marginTop={1}>
        <Text color={theme.colors.textMuted}>
          {maxScroll > 0 ? 'j/k: scroll | ' : ''}{closeHint}
        </Text>
      </Box>
    </Box>
  );
}
