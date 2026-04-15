'use client';

import { TrendingUp, AlertCircle, CheckCircle, Clock, BarChart3, Zap } from 'lucide-react';

// Mock API Response Structure
const mockDashboardData = {
  header: {
    greeting: 'Good morning, Ray Chen',
    lastUpdate: 'Last updated 5 mins ago',
    company: 'Acme Logistics',
    service: '3SC Connect'
  },
  metrics: [
    { label: 'Open issues', value: 7, color: 'text-red-600', bgColor: 'bg-red-50', icon: AlertCircle },
    { label: 'In progress', value: 5, subtext: 'avg 15 days', color: 'text-orange-600', bgColor: 'bg-orange-50', icon: Clock },
    { label: 'Resolved', value: 42, color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
    { label: 'CSAI score', value: 4.6, subtext: 'out of 5', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: BarChart3 }
  ],
  aiInsights: [
    {
      id: 1,
      title: 'Issue #ACM-08 (API timeout) matches pattern from Dec — recommended fix available in KB',
      type: 'suggestion',
      icon: Zap
    },
    {
      id: 2,
      title: '2 critical issues unacknowledged for >4 hrs. Auto-escalation triggered to Sarah M at 3SC',
      type: 'critical',
      icon: AlertCircle
    },
    {
      id: 3,
      title: 'Predicted resolution for #ACM-014.6 hrs based on similar past incidents',
      type: 'info',
      icon: TrendingUp
    }
  ],
  activeIssues: [
    { count: 12, label: 'All' },
    { count: 7, label: 'Open' },
    { count: 3, label: 'In progress' },
    { count: 3, label: 'Critical' }
  ],
  slaCompliance: {
    critical: { current: 3, total: 3, status: 'success' },
    high: { current: 5, total: 5, status: 'success' },
    medium: { current: 5, total: 5, status: 'success' }
  },
  resolutionTrend: [
    { month: 'Oct', value: 65 },
    { month: 'Nov', value: 72 },
    { month: 'Dec', value: 68 },
    { month: 'Jan', value: 75 },
    { month: 'Feb', value: 82 },
    { month: 'Mar', value: 78 }
  ]
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                3S
              </div>
              <h1 className="text-xl font-bold text-slate-900">3SC Connect</h1>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">AI assist on</span>
            </div>
            <p className="text-sm text-slate-600">{mockDashboardData.header.company}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-900 font-medium">{mockDashboardData.header.greeting}</p>
            <p className="text-xs text-slate-500">{mockDashboardData.header.lastUpdate}</p>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <nav className="flex gap-8">
          <button className="py-3 px-1 text-sm font-medium text-slate-900 border-b-2 border-blue-600">Dashboard</button>
          <button className="py-3 px-1 text-sm font-medium text-slate-500 hover:text-slate-700">Overview</button>
          <button className="py-3 px-1 text-sm font-medium text-slate-500 hover:text-slate-700">Communication</button>
        </nav>
      </div>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {mockDashboardData.metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <div key={idx} className={`${metric.bgColor} rounded-lg p-6`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">{metric.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className={`text-3xl font-bold ${metric.color}`}>{metric.value}</p>
                      {metric.subtext && <p className="text-xs text-slate-500">{metric.subtext}</p>}
                    </div>
                  </div>
                  <Icon className={`${metric.color} w-6 h-6 opacity-50`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Insights */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-slate-900">AI insights — today</h2>
            </div>
            <div className="space-y-3">
              {mockDashboardData.aiInsights.map((insight) => {
                const Icon = insight.icon;
                const bgColor = insight.type === 'critical' ? 'bg-red-50' : insight.type === 'suggestion' ? 'bg-yellow-50' : 'bg-blue-50';
                const borderColor = insight.type === 'critical' ? 'border-red-200' : insight.type === 'suggestion' ? 'border-yellow-200' : 'border-blue-200';
                
                return (
                  <div key={insight.id} className={`${bgColor} border ${borderColor} rounded p-3 text-sm`}>
                    <div className="flex gap-3">
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-600" />
                      <p className="text-slate-700">{insight.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Issues */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Active issues</h2>
            <div className="space-y-2">
              {mockDashboardData.activeIssues.map((issue, idx) => (
                <button
                  key={idx}
                  className={`w-full px-4 py-2 rounded text-sm font-medium transition ${
                    idx === 0
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {issue.label} ({issue.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SLA Compliance & Resolution Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* SLA Compliance */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">SLA compliance</h2>
              <button className="text-xs font-medium text-blue-600 hover:text-blue-700">All props →</button>
            </div>
            <div className="space-y-3">
              {Object.entries(mockDashboardData.slaCompliance).map(([level, data]) => (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm capitalize text-slate-600">{level === 'critical' ? 'Critical (4hr SLA)' : level === 'high' ? 'High (8hr SLA)' : 'Medium (24hr SLA)'}</p>
                    <p className="text-sm font-medium text-slate-900">{data.current} of {data.total}</p>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        data.status === 'success' ? 'bg-green-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${(data.current / data.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Trend */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Resolution trend</h2>
            <div className="flex items-end justify-around h-32 gap-2">
              {mockDashboardData.resolutionTrend.map((trend, idx) => {
                const maxValue = Math.max(...mockDashboardData.resolutionTrend.map(t => t.value));
                const height = (trend.value / maxValue) * 100;
                
                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="flex-col-reverse flex w-8">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 text-center">{trend.month}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
