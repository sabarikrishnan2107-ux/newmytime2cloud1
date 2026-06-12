import React, { useEffect, useRef } from 'react';
import ChartComponent from './ChartComponent';

const Performance = () => {

    return (
       <div className="py-6 space-y-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3
                  className="text-lg font-semibold text-text-light dark:text-text-dark"
                >
                  Last 3 Months Attendance
                </h3>
                <div className="flex items-center space-x-2">
                  <select
                    className="w-full pl-3 pr-8 py-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark focus:ring-primary focus:border-primary text-sm"
                  >
                    <option>Last 3 Months</option>
                    <option>Last 6 Months</option>
                    <option>Last 12 Months</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div
                  className="p-4 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark"
                >
                  <p
                    className="text-sm text-subtext-light dark:text-subtext-dark"
                  >
                    Total Present
                  </p>
                  <p
                    className="text-2xl font-semibold text-green-600 dark:text-green-400"
                  >
                    85 Days
                  </p>
                </div>
                <div
                  className="p-4 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark"
                >
                  <p
                    className="text-sm text-subtext-light dark:text-subtext-dark"
                  >
                    Total Absent
                  </p>
                  <p
                    className="text-2xl font-semibold text-red-600 dark:text-red-400"
                  >
                    3 Days
                  </p>
                </div>
                <div
                  className="p-4 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark"
                >
                  <p
                    className="text-sm text-subtext-light dark:text-subtext-dark"
                  >
                    Total Late
                  </p>
                  <p
                    className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400"
                  >
                    2 Days
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-md font-semibold mb-4">
                  Attendance Breakdown
                </h4>
                <div className="h-64">
                  <ChartComponent />
                </div>
              </div>
            </div>
            <div
              className="border-t border-border-light dark:border-border-dark mt-8 pt-8"
            >
              <h3
                className="text-lg font-semibold text-text-light dark:text-text-dark mb-4"
              >
                Monthly Logs
              </h3>
              <div className="space-y-4">
                <div
                  className="border border-border-light dark:border-border-dark rounded-lg"
                >
                  <div
                    className="p-4 flex justify-between items-center cursor-pointer bg-background-light dark:bg-background-dark rounded-t-lg"
                  >
                    <p className="font-medium">March 2024</p>
                    <span
                      className="material-icons text-subtext-light dark:text-subtext-dark"
                    >expand_more</span
                    >
                  </div>
                  <div
                    className="border-t border-border-light dark:border-border-dark p-4"
                  >
                    <table
                      className="min-w-full divide-y divide-border-light dark:divide-border-dark"
                    >
                      <thead
                        className="bg-background-light dark:bg-background-dark"
                      >
                        <tr>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wider"
                            scope="col"
                          >
                            Date
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wider"
                            scope="col"
                          >
                            Status
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wider"
                            scope="col"
                          >
                            Check-in
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-subtext-light dark:text-subtext-dark uppercase tracking-wider"
                            scope="col"
                          >
                            Check-out
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className="bg-surface-light dark:bg-surface-dark divide-y divide-border-light dark:divide-border-dark"
                      >
                        <tr>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                          >
                            Mar 18, 2024
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            >Present</span
                            >
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm text-subtext-light dark:text-subtext-dark"
                          >
                            09:00 AM
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm text-subtext-light dark:text-subtext-dark"
                          >
                            06:00 PM
                          </td>
                        </tr>
                        <tr>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                          >
                            Mar 17, 2024
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            >Present</span
                            >
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm text-subtext-light dark:text-subtext-dark"
                          >
                            09:05 AM
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm text-subtext-light dark:text-subtext-dark"
                          >
                            06:03 PM
                          </td>
                        </tr>
                        <tr>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                          >
                            Mar 16, 2024
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            >Absent</span
                            >
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm text-subtext-light dark:text-subtext-dark"
                          >
                            -
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm text-subtext-light dark:text-subtext-dark"
                          >
                            -
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div
                  className="border border-border-light dark:border-border-dark rounded-lg"
                >
                  <div
                    className="p-4 flex justify-between items-center cursor-pointer"
                  >
                    <p className="font-medium">February 2024</p>
                    <span
                      className="material-icons text-subtext-light dark:text-subtext-dark"
                    >expand_more</span
                    >
                  </div>
                </div>
                <div
                  className="border border-border-light dark:border-border-dark rounded-lg"
                >
                  <div
                    className="p-4 flex justify-between items-center cursor-pointer"
                  >
                    <p className="font-medium">January 2024</p>
                    <span
                      className="material-icons text-subtext-light dark:text-subtext-dark"
                    >expand_more</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
    );
};

export default Performance;