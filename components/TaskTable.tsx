import React from 'react';
import { ClickUpTask } from '../types';

interface TaskTableProps {
  tasks: ClickUpTask[];
}

export const TaskTable: React.FC<TaskTableProps> = ({ tasks }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-slate-400">
        <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-700">
          <tr>
            <th scope="col" className="px-6 py-3">Task Name</th>
            <th scope="col" className="px-6 py-3">Status</th>
            <th scope="col" className="px-6 py-3">Assignees</th>
            <th scope="col" className="px-6 py-3">Created</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="bg-transparent border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
              <td className="px-6 py-4 font-medium text-white">
                {task.name}
              </td>
              <td className="px-6 py-4">
                <span 
                  className="px-2 py-1 rounded-md text-xs font-medium text-white border border-white/10"
                  style={{ backgroundColor: task.status.color }}
                >
                  {task.status.status.toUpperCase()}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex -space-x-2 overflow-hidden">
                  {task.assignees.length > 0 ? (
                    task.assignees.map((user) => (
                      <div 
                        key={user.id} 
                        className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 bg-slate-600 flex items-center justify-center text-xs text-white font-bold"
                        title={user.username}
                      >
                         {user.profilePicture ? (
                           <img src={user.profilePicture} alt={user.username} className="h-full w-full rounded-full" />
                         ) : (
                           user.username.charAt(0).toUpperCase()
                         )}
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">Unassigned</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                {new Date(parseInt(task.date_created)).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                No tasks found in this list.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};