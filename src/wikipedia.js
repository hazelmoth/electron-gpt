"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSectionContent = exports.fetchPageContent = void 0;
const axios_1 = __importDefault(require("axios"));
const he_1 = __importDefault(require("he"));
const maxSummaryLength = 4096;
async function fetchPageContent(articleName) {
    try {
        const response = await axios_1.default.get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodeURIComponent(articleName)}`);
        const page = response.data.query.pages;
        const pageId = Object.keys(page)[0];
        const content = page[pageId].extract;
        // Remove HTML tags and decode HTML entities from the content
        const summary = he_1.default.decode(content.replace(/<[^>]+>/g, '')).trim();
        // Truncate the summary at 2000 characters
        const truncatedSummary = summary.substring(0, maxSummaryLength);
        return truncatedSummary;
    }
    catch (error) {
        throw new Error('Failed to fetch page content from Wikipedia');
    }
}
exports.fetchPageContent = fetchPageContent;
/**
 * Get a specific of a Wikipedia article.
 */
async function fetchSectionContent(articleName, sectionName) {
    try {
        const response = await axios_1.default.get(`https://en.wikipedia.org/w/api.php?action=parse&format=json&page=${encodeURIComponent(articleName)}&prop=sections`);
        const sections = response.data.parse.sections;
        const section = sections.find((section) => section.line === sectionName);
        if (!section) {
            throw new Error(`Section "${sectionName}" not found in article "${articleName}"`);
        }
        const sectionId = section.index;
        const sectionResponse = await axios_1.default.get(`https://en.wikipedia.org/w/api.php?action=parse&format=json&page=${encodeURIComponent(articleName)}&prop=wikitext&section=${sectionId}`);
        const sectionContent = sectionResponse.data.parse.wikitext['*'];
        const decodedContent = he_1.default.decode(sectionContent.replace(/<[^>]+>/g, '')).substring(0, maxSummaryLength);
        return decodedContent;
    }
    catch (error) {
        throw new Error('Failed to fetch section content from Wikipedia');
    }
}
exports.fetchSectionContent = fetchSectionContent;
function logResult(message) {
    console.log(`\n\nWIKIPEDIA RESULT\n${message}\n\n`);
}
