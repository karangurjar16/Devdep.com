import { useState, useEffect, useRef } from "react";
import { getDeploymentLogs } from "@/api/github";
import type { LogEntry, DeployStatus } from "@/api/github";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Terminal, CheckCircle2, Loader2, Clock } from "lucide-react";

interface DeploymentLogsProps {
    projectId: string;
    currentStatus?: DeployStatus | "Unknown";
}

const STAGES = ["Cloning", "Dependencies Download", "Building", "Deploying"];

export default function DeploymentLogs(props: DeploymentLogsProps) {
    const { projectId, currentStatus } = props;
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activeTab, setActiveTab] = useState<string>("Cloning");
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState<number>(Date.now());
    const userSelectedTabRef = useRef<boolean>(false);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch logs periodically while deployment is active
    useEffect(() => {
        if (!projectId) return;

        let isCancelled = false;
        let intervalId: number | undefined;

        const fetchLogs = async () => {
            try {
                const fetchedLogs = await getDeploymentLogs(projectId);
                if (!isCancelled) {
                    setLogs(fetchedLogs);

                    if (!userSelectedTabRef.current) {
                        const latestStage = [...STAGES].reverse().find(s => fetchedLogs.some(l => l.stage === s));
                        if (latestStage) {
                            setActiveTab(latestStage);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching deployment logs:", error);
            }
        };

        fetchLogs();

        // Only continuously poll if we are not in a final state
        const isFinalState = currentStatus === "Deployed" || currentStatus === "Failed";

        if (!isFinalState) {
            intervalId = window.setInterval(fetchLogs, 2000);
        }

        return () => {
            isCancelled = true;
            if (intervalId) {
                window.clearInterval(intervalId);
            }
        };
    }, [projectId, currentStatus]);

    const filteredLogs = logs.filter((log) => log.stage === activeTab);

    const getStageStatus = (stage: string) => {
        const hasLogsForStage = logs.some(l => l.stage === stage);
        const stageIndex = STAGES.indexOf(stage);

        if (currentStatus === "Failed") {
            const logStages = [...new Set(logs.map(l => l.stage))];
            const lastLogStage = logStages[logStages.length - 1];
            if (stage === lastLogStage) return "error";
            if (hasLogsForStage && STAGES.indexOf(lastLogStage) > stageIndex) return "completed";
            return "pending";
        }

        if (currentStatus === "Deployed") {
            return "completed";
        }

        const hasLaterLogs = STAGES.slice(stageIndex + 1).some(s => logs.some(l => l.stage === s));
        if (hasLaterLogs) return "completed";

        if (hasLogsForStage) {
            return "running";
        }

        // Map current overarching status (where missing ones imply waiting for logs)
        let statusIdx = STAGES.indexOf(currentStatus as string);
        if (currentStatus === "Deploying") statusIdx = 3;
        else if (currentStatus === "Building") statusIdx = 2;
        else if (currentStatus === "Dependencies Download") statusIdx = 1;
        else if (currentStatus === "Cloning") statusIdx = 0;

        if (statusIdx > stageIndex) return "completed";
        if (statusIdx === stageIndex) return "running";

        return "pending";
    };

    const getStageDuration = (stage: string) => {
        const stageLogs = logs.filter(l => l.stage === stage);
        if (stageLogs.length === 0) return null;

        const firstLogTime = new Date(stageLogs[0].timestamp).getTime();
        let durationSecs = 0;
        const status = getStageStatus(stage);

        if (status === "running") {
            durationSecs = Math.max(0, Math.floor((now - firstLogTime) / 1000));
        } else if (stageLogs.length >= 2) {
            const lastLogTime = new Date(stageLogs[stageLogs.length - 1].timestamp).getTime();
            durationSecs = Math.max(0, Math.floor((lastLogTime - firstLogTime) / 1000));
        } else if (status === "completed") {
            const nextStageIndex = STAGES.indexOf(stage) + 1;
            if (nextStageIndex < STAGES.length) {
                const nextStageLogs = logs.filter(l => l.stage === STAGES[nextStageIndex]);
                if (nextStageLogs.length > 0) {
                    const nextStageFirstLogTime = new Date(nextStageLogs[0].timestamp).getTime();
                    durationSecs = Math.max(0, Math.floor((nextStageFirstLogTime - firstLogTime) / 1000));
                }
            }
        }

        if (durationSecs === 0 && status === "completed" && stageLogs.length < 2) {
            return "< 1s";
        }

        if (durationSecs < 60) return `${durationSecs}s`;
        const mins = Math.floor(durationSecs / 60);
        const secs = durationSecs % 60;
        return `${mins}m ${secs}s`;
    };

    const cleanLog = (text: string) => {
        if (!text) return text;
        let cleaned = text.replace('[stderr]', '');
        // Replace full path up to and including the project ID followed by a slash or backslash
        const pathRegex = new RegExp(`.*?[/\\\\\\\\]${projectId}[/\\\\\\\\]`, 'gi');
        cleaned = cleaned.replace(pathRegex, '');
        // Remove ANSI codes
        cleaned = cleaned.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\[[0-9;]+m/g, '');
        return cleaned;
    };

    const tabsToRender = STAGES.filter(stage => {
        if (stage === "Building") return logs.some(l => l.stage === "Building") || activeTab === "Building" || currentStatus === "Building";
        return true;
    });

    return (
        <Card className="glass-strong border-white/10 overflow-hidden flex flex-col mt-6">
            <CardHeader className="bg-black/20 border-b border-white/5 py-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-primary" />
                        Deployment Logs
                    </CardTitle>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mt-4">
                    {tabsToRender.map((stage) => {
                        const status = getStageStatus(stage);
                        const duration = getStageDuration(stage);

                        return (
                            <button
                                key={stage}
                                onClick={() => {
                                    setActiveTab(stage);
                                    userSelectedTabRef.current = true;
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors border ${activeTab === stage
                                    ? "bg-primary/20 border-primary/50 text-white"
                                    : "bg-black/20 border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                {status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                {status === "completed" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                {status === "pending" && <div className="h-2 w-2 rounded-full bg-muted-foreground/50 mx-1" />}
                                {status === "error" && <div className="h-2 w-2 rounded-full bg-destructive mx-1" />}

                                <span className="font-medium">{stage}</span>

                                {duration && (
                                    <span className="text-xs opacity-70 ml-1 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {duration}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </CardHeader>
            <CardContent className="p-0 bg-black/60 relative flex-1 min-h-[400px] max-h-[600px] overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs sm:text-sm">
                    {filteredLogs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground italic opacity-50">
                            Waiting for logs...
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredLogs.map((log, i) => (
                                <div key={i} className="flex gap-4 hover:bg-white/5 px-2 py-0.5 rounded transition-colors break-words">
                                    <span className="text-muted-foreground/50 shrink-0 select-none">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                                    </span>
                                    <span className={`flex-1 whitespace-pre-wrap ${log.log.includes('[stderr]') || log.log.toLowerCase().includes('error') || log.log.toLowerCase().includes('failed') ? 'text-red-400' : 'text-gray-300'}`}>
                                        {cleanLog(log.log)}
                                    </span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
