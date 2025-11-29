import { XMLParser } from 'fast-xml-parser';

export interface ScoutReportItem {
    title: string;
    link: string;
    pubDate: string;
    source: string;
    summary?: string;
    guid?: string;
}

const FEEDS = [
    { name: 'Fantasy Football Scout', url: 'https://www.fantasyfootballscout.co.uk/feed' },
    { name: 'All About FPL', url: 'https://allaboutfpl.com/feed' },
    // Add others if found
];

export async function fetchScoutReports(): Promise<ScoutReportItem[]> {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });

    const allItems: ScoutReportItem[] = [];

    const fetchPromises = FEEDS.map(async (feed) => {
        try {
            const response = await fetch(feed.url, { next: { revalidate: 3600 } }); // Cache for 1 hour
            if (!response.ok) {
                console.error(`Failed to fetch feed ${feed.name}: ${response.statusText}`);
                return;
            }
            const xmlData = await response.text();
            const jsonObj = parser.parse(xmlData);

            const items = jsonObj.rss?.channel?.item || [];

            // Handle if items is a single object or array
            const itemsArray = Array.isArray(items) ? items : [items];

            itemsArray.slice(0, 5).forEach((item: any) => {
                allItems.push({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    source: feed.name,
                    summary: item.description?.replace(/<[^>]*>?/gm, '').slice(0, 150) + '...', // Strip HTML and truncate
                    guid: item.guid?.['#text'] || item.guid || item.link
                });
            });
        } catch (error) {
            console.error(`Error fetching feed ${feed.name}:`, error);
        }
    });

    await Promise.all(fetchPromises);

    // Sort by date descending
    return allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

export interface PlayerMention {
    playerId: number;
    name: string;
    count: number;
    context: string[];
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function analyzeScoutReports(reports: ScoutReportItem[], allPlayers: any[]): PlayerMention[] {
    const mentionsMap = new Map<number, PlayerMention>();

    // Combine all text from reports (title + summary)
    // Limit to recent reports (last 7 days) to keep it relevant to current GW
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const relevantReports = reports.filter(r => new Date(r.pubDate) > oneWeekAgo);

    relevantReports.forEach(report => {
        const text = `${report.title} ${report.summary || ''}`.toLowerCase();

        allPlayers.forEach(player => {
            // Use web_name (e.g. "Saka", "Haaland") for matching
            // Avoid very short names (<= 3 chars) unless they are unique/common like "Son"
            // But "Son" matches "Season", "Reason" etc. So need word boundaries.
            const name = player.web_name.toLowerCase();

            // Skip generic names that might be common words if short
            if (name.length < 4 && !['son', 'mee', 'ali'].includes(name)) return;
            // Skip "Best", "White", "Rice", "Young", "Long" if we want to be safe, but let's try regex word boundary

            const escapedName = escapeRegExp(name);
            const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
            const matches = text.match(regex);

            if (matches && matches.length > 0) {
                if (!mentionsMap.has(player.id)) {
                    mentionsMap.set(player.id, {
                        playerId: player.id,
                        name: player.web_name,
                        count: 0,
                        context: []
                    });
                }

                const mention = mentionsMap.get(player.id)!;
                mention.count += matches.length;

                // Extract context (sentence or surrounding words)
                // Simple approach: find index and take +/- 50 chars
                const idx = text.indexOf(name);
                if (idx !== -1 && mention.context.length < 3) {
                    const start = Math.max(0, idx - 40);
                    const end = Math.min(text.length, idx + name.length + 40);
                    let snippet = text.substring(start, end).trim();
                    if (start > 0) snippet = '...' + snippet;
                    if (end < text.length) snippet = snippet + '...';
                    mention.context.push(snippet);
                }
            }
        });
    });

    return Array.from(mentionsMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 mentions
}
