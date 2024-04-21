"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const he_1 = __importDefault(require("he"));
async function fetchPageContent(articleName) {
    try {
        const response = await axios_1.default.get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodeURIComponent(articleName)}`);
        const page = response.data.query.pages;
        const pageId = Object.keys(page)[0];
        const content = page[pageId].extract;
        // Remove HTML tags and decode HTML entities from the content
        const summary = he_1.default.decode(content.replace(/<[^>]+>/g, '')).trim();
        // Truncate the summary at 1000 characters
        const truncatedSummary = summary.substring(0, 1000);
        return truncatedSummary;
    }
    catch (error) {
        throw new Error('Failed to fetch page content from Wikipedia');
    }
}
exports.default = fetchPageContent;
