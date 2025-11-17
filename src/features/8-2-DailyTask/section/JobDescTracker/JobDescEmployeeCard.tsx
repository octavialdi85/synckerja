import { useMemo, useState } from "react";
import { differenceInCalendarDays, format, formatDistanceToNowStrict, startOfDay } from "date-fns";
import { id as indonesianLocale } from "date-fns/locale";
import { Badge } from "@/features/ui/badge";
import { Separator } from "@/features/ui/separator";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
import { cn } from "@/lib/utils";
import { JobDescAssignment, JobDescEmployeeSummary } from "./types";

interface JobDescEmployeeCardProps {
  summary: JobDescEmployeeSummary;
}

const assignmentTypeKey: Record<JobDescAssignment["type"], string> = {
  task: "dailyTask.jobDesc.assignment.type.task",
  step: "dailyTask.jobDesc.assignment.type.step",
  subStep: "dailyTask.jobDesc.assignment.type.subStep",
};

const formatDate = (value: string | null, fallback: string) => {
  if (!value) return fallback;
  try {
    return format(new Date(value), "dd MMM yyyy");
  } catch (_error) {
    return fallback;
  }
};

export const JobDescEmployeeCard = ({ summary }: JobDescEmployeeCardProps) => {
  const { t, language } = useAppTranslation();
  const locale = language === "id" ? indonesianLocale : undefined;
  const [showCompleted, setShowCompleted] = useState(false);

  const assignmentsToShow = summary.activeAssignments.length
    ? summary.activeAssignments
    : summary.assignments.slice(0, 3);

  const completedAssignments = useMemo(
    () => summary.assignments.filter(assignment => assignment.completedInRange),
    [summary.assignments],
  );

  const statusBadge = summary.idle
    ? {
        label: t("dailyTask.jobDesc.status.idle", "Idle"),
        className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      }
    : {
        label: t("dailyTask.jobDesc.status.busy", "Busy"),
        className: "bg-amber-100 text-amber-700 border border-amber-200",
      };

  const summaryStats = useMemo(
    () => [
      {
        label: t("dailyTask.jobDesc.metrics.tasks", "Tugas"),
        value: summary.totalTasks,
      },
      {
        label: t("dailyTask.jobDesc.metrics.steps", "Langkah"),
        value: summary.totalSteps,
      },
      {
        label: t("dailyTask.jobDesc.metrics.subSteps", "Sub-step"),
        value: summary.totalSubSteps,
      },
    ],
    [summary.totalSteps, summary.totalSubSteps, summary.totalTasks, t],
  );

  const dueStatusMeta = useMemo(
    () => ({
      overdue: {
        label: t("dailyTask.jobDesc.assignment.dueStatus.overdue", "Terlambat"),
        className: "bg-red-100 text-red-700 border-red-200",
      },
      dueSoon: {
        label: t("dailyTask.jobDesc.assignment.dueStatus.dueSoon", "Jelang jatuh tempo"),
        className: "bg-amber-100 text-amber-700 border-amber-200",
      },
      onTrack: {
        label: t("dailyTask.jobDesc.assignment.dueStatus.onTrack", "On track"),
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      },
      noDue: {
        label: t("dailyTask.jobDesc.assignment.dueStatus.noDue", "Tanpa due date"),
        className: "bg-gray-100 text-gray-600 border-gray-200",
      },
    }),
    [t],
  );

  return (
    <div className="border border-gray-100 rounded-lg p-3 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm text-gray-900">{summary.name}</p>
          {summary.jobTitle && (
            <p className="text-xs text-gray-500">{summary.jobTitle}</p>
          )}
          {summary.lastAssignedAt && (
            <p className="text-[11px] text-gray-400">
              {t("dailyTask.jobDesc.lastAssigned", "Terakhir assign {{date}}", {
                date: formatDate(summary.lastAssignedAt, "-"),
              })}
            </p>
          )}
        </div>
        <Badge className={cn("text-[11px] font-medium", statusBadge.className)}>
          {statusBadge.label}
        </Badge>
      </div>

      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {summaryStats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xs font-semibold text-gray-900">{stat.value}</p>
            <p className="text-[11px] text-gray-500">{stat.label}</p>
          </div>
        ))}
        <div>
          <p className="text-xs font-semibold text-gray-900">{completedAssignments.length}</p>
          <p className="text-[11px] text-gray-500">
            {t("dailyTask.jobDesc.metrics.completed", "Selesai")}
          </p>
        </div>
      </div>

      <Separator className="my-3" />

      {assignmentsToShow.length === 0 ? (
        <p className="text-xs text-gray-500">
          {t("dailyTask.jobDesc.emptyState", "Belum ada tugas aktif pada rentang waktu ini")}
        </p>
      ) : (
        <div className="space-y-2">
          {assignmentsToShow.map((assignment) => {
            const typeLabel = t(
              assignmentTypeKey[assignment.type],
              assignment.type,
            );
            const pendingLabel = assignment.assignedAt
              ? formatDistanceToNowStrict(new Date(assignment.assignedAt), {
                  locale,
                })
              : t("dailyTask.jobDesc.assignment.pendingUnknown", "Tidak diketahui");
            const taskTitle =
              assignment.type === "task" ? assignment.title : assignment.taskTitle;
            const extraLabel =
              assignment.type === "task"
                ? assignment.priority ?? ""
                : assignment.type === "step"
                  ? assignment.stepTitle
                  : assignment.subStepTitle;

            const statusLabel =
              assignment.type === "task"
                ? (assignment.status ?? "").toLowerCase()
                : assignment.type === "step"
                  ? assignment.isCompleted
                    ? "completed"
                    : "pending"
                  : assignment.isCompleted
                    ? "completed"
                    : "pending";

            const statusColor =
              statusLabel === "completed"
                ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                : "text-amber-600 bg-amber-50 border-amber-100";

            return (
              <div
                key={`${assignment.assignmentId}-${assignment.type}`}
                className="border border-gray-100 rounded-md p-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 line-clamp-1">
                      {taskTitle}
                    </p>
                    {extraLabel && (
                      <p className="text-[11px] text-gray-500 line-clamp-1">{extraLabel}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                      {assignment.dueDate && (
                        <span>
                          {t("dailyTask.jobDesc.assignment.due", "Due {{date}}", {
                            date: formatDate(assignment.dueDate, "-"),
                          })}
                        </span>
                      )}
                      <span>
                        {t("dailyTask.jobDesc.assignment.pendingFor", "Pending {{duration}}", {
                          duration: pendingLabel,
                        })}
                      </span>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px]", statusColor)}>
                    {statusLabel === "completed"
                      ? t("dailyTask.jobDesc.assignment.completed", "Selesai")
                      : t("dailyTask.jobDesc.assignment.pending", "Aktif")}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px]">
                    {typeLabel}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full border text-[10px]",
                      dueStatusMeta[assignment.dueStatus].className,
                    )}
                  >
                    {dueStatusMeta[assignment.dueStatus].label}
                  </span>
                  {assignment.dueStatus === "overdue" && assignment.dueDate && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-[10px] text-red-700">
                      {t("dailyTask.jobDesc.assignment.completedLateDetail", "Terlambat {{days}} hari", {
                        days: Math.max(
                          differenceInCalendarDays(
                            startOfDay(new Date()),
                            startOfDay(new Date(assignment.dueDate)),
                          ),
                          1,
                        ),
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {completedAssignments.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowCompleted((prev) => !prev)}
            className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
          >
            {showCompleted
              ? t("dailyTask.jobDesc.completed.hide", "Sembunyikan tugas selesai")
              : t("dailyTask.jobDesc.completed.showAll", "Lihat {{count}} tugas selesai", {
                  count: completedAssignments.length,
                })}
          </button>
          {showCompleted && (
            <div className="mt-2 space-y-2">
              {completedAssignments.map((assignment) => {
                const typeLabel = t(assignmentTypeKey[assignment.type], assignment.type);
                const completedTitle =
                  assignment.type === "task"
                    ? assignment.title
                    : assignment.type === "step"
                      ? assignment.stepTitle
                      : assignment.subStepTitle;
                const completedDate = assignment.completedAt
                  ? startOfDay(new Date(assignment.completedAt))
                  : null;
                const dueDateObj = assignment.dueDate
                  ? startOfDay(new Date(assignment.dueDate))
                  : null;
                const lateDays =
                  completedDate && dueDateObj
                    ? differenceInCalendarDays(completedDate, dueDateObj)
                    : 0;
                const isLateCompletion = Boolean(lateDays && lateDays > 0);
                return (
                  <div
                    key={`${assignment.assignmentId}-${assignment.type}-completed`}
                    className="border border-green-100 bg-green-50 rounded-md p-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 line-clamp-1">
                          {completedTitle || assignment.taskTitle}
                        </p>
                        {assignment.type === "subStep" && assignment.stepTitle && (
                          <p className="text-[11px] text-gray-500">
                            {t("dailyTask.jobDesc.assignment.parentStep", "Step: {{title}}", {
                              title: assignment.stepTitle,
                            })}
                          </p>
                        )}
                        {assignment.type !== "task" && assignment.taskTitle && (
                          <p className="text-[11px] text-gray-500">
                            {t("dailyTask.jobDesc.assignment.parentTask", "Task: {{title}}", {
                              title: assignment.taskTitle,
                            })}
                          </p>
                        )}
                        {assignment.dueDate && (
                          <p className="text-[11px] text-gray-500">
                            {t("dailyTask.jobDesc.assignment.due", "Due {{date}}", {
                              date: formatDate(assignment.dueDate, "-"),
                            })}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-500">
                          {assignment.completedAt
                            ? t("dailyTask.jobDesc.assignment.completedOn", "Selesai {{date}}", {
                                date: formatDate(assignment.completedAt, "-"),
                              })
                            : t("dailyTask.jobDesc.assignment.completed", "Selesai")}
                        </p>
                      </div>
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                        {t("dailyTask.jobDesc.assignment.completed", "Selesai")}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px]">
                        {typeLabel}
                      </span>
                      {isLateCompletion && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-[10px] text-red-700">
                          {t(
                            "dailyTask.jobDesc.assignment.completedLateDetail",
                            "Terlambat {{days}} hari",
                            { days: lateDays },
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


