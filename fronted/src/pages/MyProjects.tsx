import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserRepos } from "@/api/github";

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
    Lock,
    Unlock,
    Code2,
    ExternalLink,
    Import,
} from "lucide-react";

type Repo = {
    id: number;
    name: string;
    private: boolean;
    html_url: string;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    owner: {
        login: string;
    };
};



export default function MyProjects() {
    const navigate = useNavigate();
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        getUserRepos()
            .then(setRepos)
            .catch(() => setError("Unable to load repositories"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className="p-6">Loading projects...</p>;
    if (error) return <p className="p-6 text-red-500">{error}</p>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-semibold">My Projects</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {repos.map((repo) => (
                    <Card key={repo.id} className="flex flex-col">
                        <CardHeader className="space-y-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base truncate">
                                    {repo.name}
                                </CardTitle>
                                {repo.private ? (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Unlock className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                <Badge variant="secondary">
                                    {repo.language || "Unknown"}
                                </Badge>
                                <Badge variant="outline">
                                    {repo.private ? "Private" : "Public"}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-3 flex-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Code2 className="h-4 w-4" />
                                <span>{repo.stargazers_count} stars</span>
                                <span>•</span>
                                <span>{repo.forks_count} forks</span>
                            </div>

                            <a
                                href={repo.html_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                                View on GitHub
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </CardContent>

                        {/* Import Button */}
                        <CardFooter>
                            <Button
                                className="w-full flex items-center gap-2"
                                onClick={() =>
                                    navigate(`/new-project/import/${repo.owner.login}/${repo.name}`)
                                }
                            >
                                <Import className="h-4 w-4" />
                                Import
                            </Button>

                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
