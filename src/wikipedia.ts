import axios from 'axios';
import he from 'he';

async function fetchPageContent(articleName: string): Promise<string> {
    try {
        const response = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodeURIComponent(articleName)}`);
        const page = response.data.query.pages;
        const pageId = Object.keys(page)[0];
        const content = page[pageId].extract;

        // Remove HTML tags and decode HTML entities from the content
        const summary = he.decode(content.replace(/<[^>]+>/g, '')).trim();

        // Truncate the summary at 2000 characters
        const truncatedSummary = summary.substring(0, 2000);

        return truncatedSummary;
    } catch (error) {
        throw new Error('Failed to fetch page content from Wikipedia');
    }
}

export default fetchPageContent;