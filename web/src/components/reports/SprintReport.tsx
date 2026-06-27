import React, { useState, useEffect } from 'react';
import { formatTime } from '../../lib/utils';
import { getSprintReport } from '../../lib/api';
import { Sprint } from '../../types';

interface SprintReportProps {
  boardId: string;
  sprints: Sprint[];
}

interface SprintReportTask {
  taskId: string;
  content: string;
  estimatedMinutes: number | null;
  loggedMinutes: number;
  variance: number;
}

interface SprintReportData {
  sprintId: string;
  sprintName: string;
  startDate: string;
  endDate: string;
  totalEstimated: number;
  totalLogged: number;
  taskCount: number;
  tasks: SprintReportTask[];
}

const SprintReport: React.FC<SprintReportProps> = ({ boardId, sprints }) => {
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [report, setReport] = useState<SprintReportData | null>(null);

  useEffect(() => {
    if (sprints.length > 0 && !selectedSprintId) {
      setSelectedSprintId(sprints[0].id);
    }
  }, [sprints]);

  useEffect(() => {
    if (selectedSprintId) {
      loadReport();
    }
  }, [selectedSprintId]);

  const loadReport = async () => {
    try {
      const data = await getSprintReport(boardId, selectedSprintId);
      setReport(data);
    } catch (error) {
      console.error('Failed to load sprint report:', error);
    }
  };

  if (!report) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">Sprint Report</h2>
        <select
          value={selectedSprintId}
          onChange={(e) => setSelectedSprintId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200"
        >
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Total Estimated</p>
          <p className="text-xl font-bold text-slate-700 dark:text-slate-200">
            {formatTime(report.totalEstimated)}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Total Logged</p>
          <p className="text-xl font-bold text-slate-700 dark:text-slate-200">
            {formatTime(report.totalLogged)}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Variance</p>
          <p
            className={`text-xl font-bold ${
              report.totalLogged - report.totalEstimated < 0
                ? 'text-emerald-500'
                : 'text-red-500'
            }`}
          >
            {report.totalLogged - report.totalEstimated < 0 ? '' : '+'}
            {formatTime(Math.abs(report.totalLogged - report.totalEstimated))}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10">
              <th className="text-left text-[10px] font-black uppercase text-slate-500 pb-2">
                Task
              </th>
              <th className="text-right text-[10px] font-black uppercase text-slate-500 pb-2">
                Estimated
              </th>
              <th className="text-right text-[10px] font-black uppercase text-slate-500 pb-2">
                Logged
              </th>
              <th className="text-right text-[10px] font-black uppercase text-slate-500 pb-2">
                Variance
              </th>
            </tr>
          </thead>
          <tbody>
            {report.tasks.map((task) => (
              <tr
                key={task.taskId}
                className="border-b border-slate-100 dark:border-white/5"
              >
                <td className="py-2 text-xs text-slate-700 dark:text-slate-200">
                  {task.content}
                </td>
                <td className="py-2 text-xs text-right text-slate-500">
                  {task.estimatedMinutes ? formatTime(task.estimatedMinutes) : '-'}
                </td>
                <td className="py-2 text-xs text-right text-slate-500">
                  {formatTime(task.loggedMinutes)}
                </td>
                <td
                  className={`py-2 text-xs text-right font-bold ${
                    task.variance < 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {task.variance < 0 ? '' : '+'}
                  {formatTime(Math.abs(task.variance))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SprintReport;