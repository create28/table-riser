import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Newspaper, Wrench } from "lucide-react";
import { ScoutReportItem } from "@/lib/rss";
import { Button } from "@/components/ui/button";

interface ScoutReportsProps {
    reports: ScoutReportItem[];
}

const TOOLS = [
    {
        name: "Fantasy Football Hub",
        url: "https://www.fantasyfootballhub.co.uk",
        description: "Player comparison, fixture analysis, AI suggestions, and expert articles.",
        type: "Analysis & Tools"
    },
    {
        name: "FPL Review",
        url: "https://fplreview.com",
        description: "Data-driven projections, massive data planner, and season-wide optimization.",
        type: "Projections & Data"
    },
    {
        name: "Fantasy Football Fix",
        url: "https://www.fantasyfootballfix.com",
        description: "Price change predictors, squad optimizers, and live rank updates.",
        type: "Tools & Price Changes"
    },
    {
        name: "FPL.page",
        url: "https://fpl.page",
        description: "Clean dashboard for live rank, mini-leagues, and ownership stats.",
        type: "Dashboard & Stats"
    }
];

export function ScoutReports({ reports }: ScoutReportsProps) {
    return (
        <div className="space-y-8">
            {/* Latest News Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <Newspaper className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold">Latest Scout Reports</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reports.map((report) => (
                        <Card key={report.guid} className="hover:bg-accent/5 transition-colors">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-2">
                                    <Badge variant="outline" className="mb-2">{report.source}</Badge>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(report.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <CardTitle className="text-base leading-tight">
                                    <a href={report.link} target="_blank" rel="noopener noreferrer" className="hover:underline decoration-primary underline-offset-4">
                                        {report.title}
                                    </a>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {report.summary}
                                </p>
                                <Button variant="link" className="px-0 h-auto mt-2 text-xs" asChild>
                                    <a href={report.link} target="_blank" rel="noopener noreferrer">
                                        Read full article <ExternalLink className="ml-1 h-3 w-3" />
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Tools & Resources Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold">Tools & Resources</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {TOOLS.map((tool) => (
                        <Card key={tool.name} className="flex flex-col">
                            <CardHeader className="pb-2">
                                <Badge variant="secondary" className="w-fit mb-2">{tool.type}</Badge>
                                <CardTitle className="text-base">{tool.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-between">
                                <CardDescription className="mb-4">
                                    {tool.description}
                                </CardDescription>
                                <Button variant="outline" size="sm" className="w-full" asChild>
                                    <a href={tool.url} target="_blank" rel="noopener noreferrer">
                                        Open Tool <ExternalLink className="ml-2 h-3 w-3" />
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
