import axios from 'axios';
import he from 'he';

const maxSummaryLength = 4096;

async function fetchPageContent(articleName: string): Promise<string> {
    try {
        const response = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodeURIComponent(articleName)}`);
        const page = response.data.query.pages;
        const pageId = Object.keys(page)[0];
        const content = page[pageId].extract;

        // Remove HTML tags and decode HTML entities from the content
        const summary = he.decode(content.replace(/<[^>]+>/g, '')).trim();

        // Truncate the summary at 2000 characters
        const truncatedSummary = summary.substring(0, maxSummaryLength);
        return truncatedSummary;
    } catch (error) {
        throw new Error('Failed to fetch page content from Wikipedia');
    }
}

/**
 * Get a specific of a Wikipedia article.
 */
async function fetchSectionContent(articleName: string, sectionName: string): Promise<string> {
    try {
        const response = await axios.get(`https://en.wikipedia.org/w/api.php?action=parse&format=json&page=${encodeURIComponent(articleName)}&prop=sections`);
        const sections = response.data.parse.sections;
        const section = sections.find((section) => section.line === sectionName);

        if (!section) {
            throw new Error(`Section "${sectionName}" not found in article "${articleName}"`);
        }

        const sectionId = section.index;
        const sectionResponse = await axios.get(`https://en.wikipedia.org/w/api.php?action=parse&format=json&page=${encodeURIComponent(articleName)}&prop=wikitext&section=${sectionId}`);
        const sectionContent = sectionResponse.data.parse.wikitext['*'];
        const decodedContent = he.decode(sectionContent.replace(/<[^>]+>/g, '')).substring(0, maxSummaryLength);
        return decodedContent;
    } catch (error) {
        throw new Error('Failed to fetch section content from Wikipedia');
    }
}

function logResult(message: string) {
    console.log(`\n\nWIKIPEDIA RESULT\n${message}\n\n`);
}

export { fetchPageContent, fetchSectionContent };