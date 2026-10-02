/**
 * Date Utility — ALL business date logic lives here.
 *
 * CRITICAL RULE: The server always determines dates using Asia/Kolkata (IST).
 * Never trust client-provided dates for business decisions.
 * Never use new Date() directly for business date — always use these functions.
 */

import { toZonedTime, format } from 'date-fns-tz'
import { differenceInCalendarDays, parseISO, isValid } from 'date-fns'

const IST_TIMEZONE = 'Asia/Kolkata'

export interface EventConfigDates {
  startDate: string   // "YYYY-MM-DD"
  endDate: string     // "YYYY-MM-DD"
  timezone: string    // "Asia/Kolkata"
}

/**
 * Returns the current date in IST as a "YYYY-MM-DD" string.
 * This is the canonical business date — used for all claim operations.
 */
export function getCurrentIndiaDate(): string {
  const nowUTC = new Date()
  const nowIST = toZonedTime(nowUTC, IST_TIMEZONE)
  return format(nowIST, 'yyyy-MM-dd', { timeZone: IST_TIMEZONE })
}

export const getTodayIST = getCurrentIndiaDate

/**
 * Returns the current IST datetime as a formatted string for display.
 * e.g. "29 Sep 2026, 10:42 AM IST"
 */
export function getCurrentIndiaDateTime(): string {
  const nowUTC = new Date()
  const nowIST = toZonedTime(nowUTC, IST_TIMEZONE)
  return format(nowIST, 'dd MMM yyyy, hh:mm a', { timeZone: IST_TIMEZONE }) + ' IST'
}

/**
 * Converts a UTC Date to a human-readable IST string.
 * e.g. "01 Oct 2026, 10:42 AM IST"
 */
export function toISTString(date: Date): string {
  const ist = toZonedTime(date, IST_TIMEZONE)
  return format(ist, 'dd MMM yyyy, hh:mm a', { timeZone: IST_TIMEZONE }) + ' IST'
}

/**
 * Calculates which Navratri day a given IST date corresponds to.
 *
 * Returns null if:
 *  - The date is before the event start
 *  - The date is after the event end
 *  - The config is invalid
 *
 * Returns 1–9 if the date is within the distribution window.
 *
 * @param config  Event config with startDate, endDate
 * @param isoDate Optional "YYYY-MM-DD" date to check (defaults to current IST date)
 */
export function getNavratriDay(
  config: EventConfigDates,
  isoDate?: string
): number | null {
  const dateStr = isoDate ?? getCurrentIndiaDate()

  const start = parseISO(config.startDate)
  const end = parseISO(config.endDate)
  const target = parseISO(dateStr)

  if (!isValid(start) || !isValid(end) || !isValid(target)) return null

  const dayOffset = differenceInCalendarDays(target, start)

  if (dayOffset < 0) return null                              // Before event
  if (dayOffset > differenceInCalendarDays(end, start)) return null  // After event

  return dayOffset + 1  // Day 1 = startDate
}

export type DistributionStatus =
  | { active: true; day: number; todayDate: string }
  | { active: false; reason: 'NOT_STARTED' | 'ENDED' | 'NO_CONFIG'; todayDate: string }

/**
 * Checks whether distribution is currently active (based on IST date).
 * This is called by the backend on every scan — never trust the client.
 */
export function isDistributionActive(
  config: EventConfigDates | null
): DistributionStatus {
  const todayDate = getCurrentIndiaDate()

  if (!config) {
    return { active: false, reason: 'NO_CONFIG', todayDate }
  }

  const day = getNavratriDay(config, todayDate)

  if (day === null) {
    const start = parseISO(config.startDate)
    const today = parseISO(todayDate)
    const before = differenceInCalendarDays(today, start) < 0
    return {
      active: false,
      reason: before ? 'NOT_STARTED' : 'ENDED',
      todayDate,
    }
  }

  return { active: true, day, todayDate }
}

/**
 * Formats time difference into natural Hindi duration
 * e.g. "45 मिनट", "1 घंटा 15 मिनट", "2 घंटे 30 मिनट"
 */
export function formatDurationHindi(start: Date | string, end?: Date | string): string {
  try {
    const startTime = new Date(start).getTime()
    const endTime = end ? new Date(end).getTime() : Date.now()
    if (isNaN(startTime)) return ''
    const diffMinutes = Math.max(0, Math.floor((endTime - startTime) / (1000 * 60)))
    const hours = Math.floor(diffMinutes / 60)
    const mins = diffMinutes % 60

    if (hours === 0) {
      return `${mins} मिनट`
    } else if (mins === 0) {
      return `${hours} घंटे`
    } else {
      return `${hours} घंटे ${mins} मिनट`
    }
  } catch {
    return ''
  }
}
