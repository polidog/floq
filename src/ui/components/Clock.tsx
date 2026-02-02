import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';
import { t } from '../../i18n/index.js';
import { getDateFormat, getLocale, type DateFormat } from '../../config.js';

interface ClockProps {
  showSeconds?: boolean;
  showLabel?: boolean;
}

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function Clock({ showSeconds = false, showLabel = true }: ClockProps): React.ReactElement {
  const theme = useTheme();
  const i18n = t();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, showSeconds ? 1000 : 60000);

    return () => clearInterval(interval);
  }, [showSeconds]);

  const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    if (showSeconds) {
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: Date, format: DateFormat): string => {
    if (format === 'none') return '';

    const locale = getLocale();
    const weekdays = locale === 'ja' ? WEEKDAYS_JA : WEEKDAYS_EN;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayNum = date.getDate();
    const year = String(date.getFullYear());
    const weekday = weekdays[date.getDay()];
    const monthName = MONTHS_EN[date.getMonth()];

    // Handle 'auto' - use locale-appropriate default
    const effectiveFormat = format === 'auto'
      ? (locale === 'ja' ? 'MM/DD(ddd)' : 'ddd, MMM D')
      : format;

    switch (effectiveFormat) {
      case 'ddd, MMM D':
        return `${weekday}, ${monthName} ${dayNum}`;
      case 'MM/DD(ddd)':
        return `${month}/${day}(${weekday})`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM-DD':
        return `${month}-${day}`;
      case 'DD/MM':
        return `${day}/${month}`;
      default:
        return `${weekday}, ${monthName} ${dayNum}`;
    }
  };

  // Get label based on theme style and locale
  const getLabel = (): string => {
    if (!showLabel) return '';

    // Mario and DQ themes always use "TIME"
    if (theme.uiStyle === 'mario-block' || theme.uiStyle === 'titled-box') {
      return 'TIME ';
    }

    // Standard theme uses i18n
    return `${i18n.tui.clock} `;
  };

  const label = getLabel();
  const dateFormat = getDateFormat();
  const dateStr = formatDate(time, dateFormat);

  return (
    <Box>
      {label && (
        <Text color={theme.colors.secondary}>
          {label}
        </Text>
      )}
      {dateStr && (
        <Text color={theme.colors.textMuted}>
          {dateStr}{' '}
        </Text>
      )}
      <Text color={theme.colors.textMuted}>
        {formatTime(time)}
      </Text>
    </Box>
  );
}
