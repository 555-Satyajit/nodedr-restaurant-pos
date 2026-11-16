"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

interface Schedule {
  id: string;
  reportKey: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  format: string;
  recipients: string[];
  isActive: boolean;
  lastSentAt: string | null;
  lastError: string | null;
}

const WHEN = { DAILY: "every day · yesterday", WEEKLY: "Mondays · previous 7 days", MONTHLY: "1st of the month · previous month" };

export function SchedulesPanel({
  branchId,
  reportKey,
  titles,
}: {
  branchId: string | null;
  reportKey: string;
  titles: Record<string, string>;
}) {
  const qc = useQueryClient();
  const [frequency, setFrequency] = useState<Schedule["frequency"]>("WEEKLY");
  const [format, setFormat] = useState("xlsx");
  const [recipients, setRecipients] = useState("");
  const { data } = useQuery({
    queryKey: ["report-schedules", branchId],
    queryFn: () => api.get<{ emailConfigured: boolean; schedules: Schedule[] }>(`/report-schedules?branchId=${branchId}`),
    enabled: !!branchId,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["report-schedules"] });
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong");

  const create = useMutation({
    mutationFn: () =>
      api.post(`/report-schedules?branchId=${branchId}`, {
        reportKey,
        frequency,
        format,
        recipients: recipients.split(/[,\s;]+/).filter(Boolean),
      }),
    onSuccess: () => {
      setRecipients("");
      refresh();
      toast.success("Schedule created");
    },
    onError: (e) => toast.error(msg(e)),
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/report-schedules/${id}?branchId=${branchId}`, { isActive }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/report-schedules/${id}?branchId=${branchId}`),
    onSuccess: refresh,
  });
  const sendNow = useMutation({
    mutationFn: (id: string) => api.post(`/report-schedules/${id}/send?branchId=${branchId}`),
    onSuccess: () => {
      refresh();
      toast.success("Report emailed");
    },
    onError: (e) => toast.error(msg(e)),
  });
  const sel = "h-11 sm:h-9 rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2";

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl border border-border/80 shadow-2xs print:hidden">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">Email this report on a schedule</h3>
        <p className="text-xs text-muted-foreground">
          Automated export delivered via SMTP at 06:00 branch time.
          {data && !data.emailConfigured && " (Note: Email service not configured yet on this server)."}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <select aria-label="Frequency" className={sel} value={frequency} onChange={(e) => setFrequency(e.target.value as Schedule["frequency"])}>
            <option value="DAILY">Daily (Yesterday)</option>
            <option value="WEEKLY">Weekly (Mondays)</option>
            <option value="MONTHLY">Monthly (1st)</option>
          </select>
          <select aria-label="File format" className={sel} value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="pdf">PDF (.pdf)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </div>

        <Input
          aria-label="Recipients"
          className="h-11 sm:h-9 flex-1 text-xs sm:text-sm rounded-xl"
          placeholder="owner@cafe.com, accountant@firm.com"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
        />

        <Button
          disabled={!recipients.trim() || create.isPending}
          onClick={() => create.mutate()}
          className="h-11 sm:h-9 rounded-xl text-xs font-semibold px-4 active:scale-98"
        >
          {create.isPending ? "Scheduling…" : "Schedule"}
        </Button>
      </div>
      {data && data.schedules.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {data.schedules.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <p className="font-medium text-foreground">{titles[s.reportKey] ?? s.reportKey} <span className="font-normal text-muted-foreground">· {s.format.toUpperCase()} · {WHEN[s.frequency]}</span></p>
                <p className="text-xs text-muted-foreground">
                  To {s.recipients.join(", ")}
                  {s.lastSentAt ? ` · last sent ${s.lastSentAt.slice(0, 16).replace("T", " ")}` : ""}
                  {s.lastError ? ` · ${s.lastError}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={sendNow.isPending} onClick={() => sendNow.mutate(s.id)}>Send now</Button>
                <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: s.id, isActive: !s.isActive })}>{s.isActive ? "Pause" : "Resume"}</Button>
                <Button size="sm" variant="outline" onClick={() => remove.mutate(s.id)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
