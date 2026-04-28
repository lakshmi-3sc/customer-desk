import { prisma } from "@/lib/prisma";
import { IssuePriority } from "@prisma/client";

const SLA_DEFAULTS: Record<IssuePriority, { responseTime: number; resolutionTime: number }> = {
  CRITICAL: { responseTime: 1, resolutionTime: 4 },
  HIGH: { responseTime: 4, resolutionTime: 24 },
  MEDIUM: { responseTime: 8, resolutionTime: 72 },
  LOW: { responseTime: 24, resolutionTime: 168 },
};

export async function calculateSLADeadline(ticketId: string) {
  try {
    const ticket = await prisma.issue.findUnique({
      where: { id: ticketId },
      select: { priority: true, createdAt: true },
    });

    if (!ticket) return;

    const slaConfig = SLA_DEFAULTS[ticket.priority as IssuePriority] || SLA_DEFAULTS.MEDIUM;
    const slaDueAt = new Date(ticket.createdAt.getTime() + slaConfig.resolutionTime * 60 * 60 * 1000);

    await prisma.issue.update({
      where: { id: ticketId },
      data: { slaDueAt },
    });

    console.log(`SLA set for ticket ${ticketId}: Due ${slaDueAt.toISOString()}`);
  } catch (error) {
    console.error("Error calculating SLA:", error);
  }
}

export async function updateSLAStatus() {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const openTickets = await prisma.issue.findMany({
      where: {
        status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] },
        slaDueAt: { not: null },
      },
      select: { id: true, slaDueAt: true, slaBreached: true, slaBreachRisk: true },
    });

    let breachedCount = 0;
    let atRiskCount = 0;

    for (const ticket of openTickets) {
      if (!ticket.slaDueAt) continue;
      const isBreached = ticket.slaDueAt < now;
      const isAtRisk = ticket.slaDueAt < twoHoursFromNow && ticket.slaDueAt >= now;

      if (isBreached !== ticket.slaBreached || isAtRisk !== ticket.slaBreachRisk) {
        await prisma.issue.update({
          where: { id: ticket.id },
          data: {
            slaBreached: isBreached,
            slaBreachRisk: isAtRisk && !isBreached,
          },
        });
        if (isBreached) breachedCount++;
        if (isAtRisk) atRiskCount++;
      }
    }

    console.log(`SLA Update: ${breachedCount} breached, ${atRiskCount} at risk`);
  } catch (error) {
    console.error("Error updating SLA status:", error);
  }
}

export function calculateTimeRemaining(slaDueAt: Date | null) {
  if (!slaDueAt) return { hours: 0, minutes: 0, status: "no-sla", displayText: "No SLA" };

  const now = new Date();
  const diffMs = slaDueAt.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffMs < 0) {
    return {
      hours: Math.abs(hours),
      minutes: Math.abs(minutes),
      status: "breached",
      displayText: `Breached by ${Math.abs(hours)}h ${Math.abs(minutes)}m`,
    };
  }

  if (diffMs < 2 * 60 * 60 * 1000) {
    return { hours, minutes, status: "at-risk", displayText: `${hours}h ${minutes}m left` };
  }

  return { hours, minutes, status: "healthy", displayText: `${hours}h ${minutes}m left` };
}
