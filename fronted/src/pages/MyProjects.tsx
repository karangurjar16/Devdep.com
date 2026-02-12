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
    Star,
    GitFork,
    ArrowLeft,
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

    if (loading) return <div className="min-h-screen bg-gradient-subtle flex items-center justify-center"><p className="text-muted-foreground">Loading repositories...</p></div>;
    if (error) return <div className="min-h-screen bg-gradient-subtle flex items-center justify-center"><p className="text-destructive">{error}</p></div>;

    return (
        <div className="min-h-screen bg-gradient-subtle">
            {/* Header */}
            <div className="glass-strong border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Import Project</h1>
                            <p className="text-sm text-muted-foreground mt-1">Select a repository from your GitHub account</p>
                        </div>
                        <Button
                            onClick={() => navigate("/dashboard")}
                            variant="outline"
                            className="glass border-white/20 hover:bg-white/10"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {repos.map((repo) => (
                        <Card key={repo.id} className="glass hover-lift border-white/10 flex flex-col">
                            <CardHeader className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base truncate flex items-center gap-2">
                                        {repo.name}
                                    </CardTitle>
                                    {repo.private ? (
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Unlock className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </div>

                                <div className="flex gap-2 flex-wrap">
                                    {repo.language && (
                                        <Badge variant="secondary" className="font-medium">
                                            <Code2 className="h-3 w-3 mr-1" />
                                            {repo.language}
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="border-white/20">
                                        {repo.private ? "Private" : "Public"}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3 flex-1">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Star className="h-4 w-4" />
                                        <span>{repo.stargazers_count}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <GitFork className="h-4 w-4" />
                                        <span>{repo.forks_count}</span>
                                    </div>
                                </div>

                                <a
                                    href={repo.html_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline transition-colors"
                                >
                                    View on GitHub
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </CardContent>

                            {/* Import Button */}
                            <CardFooter>
                                <Button
                                    className="w-full btn-glossy"
                                    onClick={() =>
                                        navigate(`/new-project/import/${repo.owner.login}/${repo.name}`)
                                    }
                                >
                                    <Import className="h-4 w-4 mr-2" />
                                    Import Project
                                </Button>

                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
