"use client";

import { useState, useEffect } from "react";
import { Save, X } from "lucide-react";

interface ClientSummaryPreference {
  clientId: string;
  summaryEnabled: boolean;
  weeklyEnabled: boolean;
  monthlyEnabled: boolean;
  emailRecipients: string[];
  includeResolvedIssues: boolean;
  includeOpenIssues: boolean;
  includeSLAMetrics: boolean;
  includeCategoryBreakdown: boolean;
}

interface ClientSummarySettingsProps {
  clientId: string;
  initialPrefs?: ClientSummaryPreference;
  onSave?: (prefs: Partial<ClientSummaryPreference>) => Promise<void>;
  loading?: boolean;
}

export function ClientSummarySettings({
  clientId,
  initialPrefs,
  onSave,
  loading = false,
}: ClientSummarySettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    summaryEnabled: initialPrefs?.summaryEnabled ?? true,
    weeklyEnabled: initialPrefs?.weeklyEnabled ?? true,
    monthlyEnabled: initialPrefs?.monthlyEnabled ?? true,
    emailRecipients: initialPrefs?.emailRecipients?.join(", ") ?? "",
    includeResolvedIssues: initialPrefs?.includeResolvedIssues ?? true,
    includeOpenIssues: initialPrefs?.includeOpenIssues ?? true,
    includeSLAMetrics: initialPrefs?.includeSLAMetrics ?? true,
    includeCategoryBreakdown: initialPrefs?.includeCategoryBreakdown ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChange = (
    key: string,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAddEmail = (email: string) => {
    const current = formData.emailRecipients
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (!current.includes(email) && email.includes("@")) {
      current.push(email);
      setFormData((prev) => ({
        ...prev,
        emailRecipients: current.join(", "),
      }));
    }
  };

  const handleRemoveEmail = (email: string) => {
    const current = formData.emailRecipients
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e !== email);
    setFormData((prev) => ({
      ...prev,
      emailRecipients: current.join(", "),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const prefs = {
        summaryEnabled: formData.summaryEnabled,
        weeklyEnabled: formData.weeklyEnabled,
        monthlyEnabled: formData.monthlyEnabled,
        emailRecipients: formData.emailRecipients
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
        includeResolvedIssues: formData.includeResolvedIssues,
        includeOpenIssues: formData.includeOpenIssues,
        includeSLAMetrics: formData.includeSLAMetrics,
        includeCategoryBreakdown: formData.includeCategoryBreakdown,
      };

      if (onSave) {
        await onSave(prefs);
      }

      setMessage({ type: "success", text: "Preferences saved successfully" });
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to save preferences. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Summary Preferences
          </h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm text-[#0052CC] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
          >
            Edit
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">
              Summaries Enabled
            </span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {initialPrefs?.summaryEnabled ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">
              Weekly Summaries
            </span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {initialPrefs?.weeklyEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">
              Monthly Summaries
            </span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {initialPrefs?.monthlyEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-600 dark:text-slate-400">
              Email Recipients
            </span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {initialPrefs?.emailRecipients?.length || 0} recipient(s)
            </span>
          </div>
        </div>
      </div>
    );
  }

  const emailList = formData.emailRecipients
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Edit Summary Preferences
        </h3>
        <button
          onClick={() => setIsEditing(false)}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
          Delivery Settings
        </h4>
        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.summaryEnabled}
            onChange={(e) => handleChange("summaryEnabled", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#0052CC] cursor-pointer"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Enable summaries to be delivered to my email
          </span>
        </label>

        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.weeklyEnabled}
            onChange={(e) => handleChange("weeklyEnabled", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#0052CC] cursor-pointer"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Send weekly summaries (every Monday)
          </span>
        </label>

        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.monthlyEnabled}
            onChange={(e) => handleChange("monthlyEnabled", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#0052CC] cursor-pointer"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Send monthly summaries (on the 1st)
          </span>
        </label>
      </div>

      {/* Email Recipients */}
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
          Email Recipients
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Summaries will be sent to these email addresses
        </p>

        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Enter email address"
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleAddEmail((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = "";
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
              handleAddEmail(input.value);
              input.value = "";
            }}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Add
          </button>
        </div>

        {emailList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {emailList.map((email) => (
              <div
                key={email}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
              >
                {email}
                <button
                  onClick={() => handleRemoveEmail(email)}
                  className="ml-1 hover:text-blue-900 dark:hover:text-blue-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content Options */}
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
          Content to Include
        </h4>

        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.includeResolvedIssues}
            onChange={(e) =>
              handleChange("includeResolvedIssues", e.target.checked)
            }
            className="w-4 h-4 rounded border-slate-300 text-[#0052CC] cursor-pointer"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Recently resolved issues
          </span>
        </label>

        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.includeOpenIssues}
            onChange={(e) => handleChange("includeOpenIssues", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#0052CC] cursor-pointer"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Currently open issues
          </span>
        </label>

        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.includeSLAMetrics}
            onChange={(e) =>
              handleChange("includeSLAMetrics", e.target.checked)
            }
            className="w-4 h-4 rounded border-slate-300 text-[#0052CC] cursor-pointer"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            SLA compliance metrics
          </span>
        </label>

        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.includeCategoryBreakdown}
            onChange={(e) =>
              handleChange("includeCategoryBreakdown", e.target.checked)
            }
            className="w-4 h-4 rounded border-slate-300 text-[#0052CC] cursor-pointer"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Issue category breakdown
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0052CC] text-white rounded-lg hover:bg-[#0747A6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Preferences"}
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
