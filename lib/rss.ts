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
